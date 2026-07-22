import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import QRCode from 'qrcode'
import { Resend } from 'resend'
import { ticketEmailHtml } from '@/lib/email/ticket-template'
import { SquareClient, SquareEnvironment } from 'square'
import { ROUTE_PRICES, LUGGAGE_OPTIONS } from '@/lib/data/bus-config'

const resend = new Resend(process.env.RESEND_API_KEY)

const squareConfigured = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID)
const squareClient = squareConfigured
  ? new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN!,
      environment: SquareEnvironment.Production,
    })
  : null

const BookingSchema = z.object({
  ticket_type:           z.enum(['one_way', 'round_trip']),
  total_amount:          z.number().positive(),
  guest_email:           z.string().email().or(z.literal('')).optional(),
  payment_method:        z.enum(['card', 'cash']).default('card'),
  source_id:             z.string().optional(),
  origin_name:           z.string(),
  destination_name:      z.string(),
  boarding_stop_code:    z.string().optional(),
  destination_stop_code: z.string().optional(),
  boarding_stop_name:    z.string(),
  sucursal_id:           z.string().uuid().optional(),
  date:                  z.string(),
  departure_time:        z.string(),
  return_date:           z.string().optional(),
  luggage_price:         z.number().min(0).default(0),
  passengers: z.array(z.object({
    full_name:      z.string().min(2),
    passenger_type: z.enum(['adult', 'child', 'senior']),
    price:          z.number().positive(),
    seat_number:    z.string().optional(),
    is_promo:       z.boolean().optional(),
    promo_label:    z.string().optional(),
  })).min(1),
})

function calcLoyaltyTier(points: number): 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (points >= 5000) return 'platinum'
  if (points >= 2000) return 'gold'
  if (points >= 500)  return 'silver'
  if (points >= 100)  return 'bronze'
  return 'none'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = BookingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const {
    ticket_type, total_amount, guest_email, payment_method, source_id,
    origin_name, destination_name, boarding_stop_code, destination_stop_code,
    boarding_stop_name, date, departure_time, return_date, passengers,
    sucursal_id, luggage_price,
  } = parsed.data

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Determine caller identity BEFORE charging ──────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let customerId: string | null = null
  let soldByUserId: string | null = null
  let isStaff = false
  if (user) {
    const { data: callerProfile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as { data: { role: string } | null }
    isStaff = ['cajero', 'admin', 'super_admin', 'developer'].includes(callerProfile?.role ?? '')
    if (!isStaff) customerId = user.id
    else soldByUserId = user.id
  }

  // ── Server-side price validation (non-staff only) ──────────────────────────
  if (!isStaff) {
    if (boarding_stop_code && destination_stop_code) {
      const priceKey     = `${boarding_stop_code}:${destination_stop_code}`
      const officialPrices = ROUTE_PRICES[priceKey]
      if (officialPrices) {
        const multiplier    = ticket_type === 'round_trip' ? 1.5 : 1
        const expectedAdult = Math.round(officialPrices.adult * multiplier)
        const expectedChild = Math.round(officialPrices.child * multiplier)
        for (const p of passengers) {
          if (p.is_promo) {
            return NextResponse.json({ error: 'Precios especiales solo para personal autorizado' }, { status: 403 })
          }
          const expectedPrice = p.passenger_type === 'adult' ? expectedAdult : expectedChild
          if (Math.abs(p.price - expectedPrice) > 0.01) {
            return NextResponse.json({ error: 'Precio de pasajero no válido' }, { status: 422 })
          }
        }
      }
    }

    // Validate luggage price is a known multiple
    if (luggage_price > 0) {
      const paxCount    = passengers.length
      const validTotals = LUGGAGE_OPTIONS.map(o => o.price * paxCount)
      if (!validTotals.includes(luggage_price)) {
        return NextResponse.json({ error: 'Precio de equipaje no válido' }, { status: 422 })
      }
    }
  }

  // Server-calculated total (overrides client value for payment and DB record)
  const serverTotal = passengers.reduce((sum, p) => sum + p.price, 0) + luggage_price

  // ── Square payment charge ──────────────────────────────────────────────────
  let squarePaymentId: string | undefined

  if (payment_method === 'card' && !squareConfigured) {
    return NextResponse.json({ error: 'Pagos con tarjeta no están configurados en el servidor' }, { status: 503 })
  }

  if (payment_method === 'card' && squareConfigured && squareClient) {
    if (!source_id) {
      return NextResponse.json({ error: 'Token de pago requerido' }, { status: 400 })
    }
    try {
      const paymentResponse = await squareClient.payments.create({
        sourceId:       source_id,
        amountMoney:    { amount: BigInt(Math.round(serverTotal * 100)), currency: 'USD' },
        locationId:     process.env.SQUARE_LOCATION_ID!,
        idempotencyKey: crypto.randomUUID(),
      })
      const payment = paymentResponse.payment
      if (!payment || payment.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Pago rechazado por el banco' }, { status: 402 })
      }
      squarePaymentId = payment.id
    } catch (e: any) {
      const detail = e?.errors?.[0]?.detail || e?.message || 'Pago rechazado'
      console.error('Square payment error:', detail)
      return NextResponse.json({ error: detail }, { status: 402 })
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Find a trip matching the booking date; return 404 if none scheduled
  const { data: tripData } = await service
    .from('trips')
    .select('id')
    .eq('departure_date', date)
    .eq('status', 'scheduled')
    .order('departure_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!tripData?.id) {
    if (squarePaymentId && squareClient) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      squarePaymentId,
          amountMoney:    { amount: BigInt(Math.round(serverTotal * 100)), currency: 'USD' },
          idempotencyKey: crypto.randomUUID(),
          reason:         'No trips available for requested date — automatic refund',
        })
      } catch (refundErr: any) {
        console.error('Refund failed for payment', squarePaymentId, refundErr)
      }
    }
    return NextResponse.json({ error: 'No hay viajes programados para la fecha seleccionada. Por favor elige otra fecha.' }, { status: 404 })
  }

  // Create booking
  const bookingInsert: Record<string, unknown> = {
    trip_id:          tripData.id,
    ticket_type,
    status:           'confirmed',
    total_amount:     serverTotal,
    payment_method,
    points_earned:    Math.floor(serverTotal),
    guest_email:      guest_email || null,
    origin_name,
    destination_name,
    departure_time,
  }
  if (return_date)    bookingInsert.return_date      = return_date
  if (customerId)     bookingInsert.customer_id      = customerId
  if (sucursal_id)    bookingInsert.sucursal_id      = sucursal_id
  if (soldByUserId)   bookingInsert.sold_by_user_id  = soldByUserId

  const { data: booking, error: bookingError } = await service
    .from('bookings')
    .insert(bookingInsert)
    .select('id, booking_number, points_earned')
    .single()

  if (bookingError || !booking) {
    console.error('Booking error:', bookingError)
    if (squarePaymentId && squareClient) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      squarePaymentId,
          amountMoney:    { amount: BigInt(Math.round(serverTotal * 100)), currency: 'USD' },
          idempotencyKey: crypto.randomUUID(),
          reason:         'Booking creation failed — automatic refund',
        })
        console.log('Square refund issued for payment:', squarePaymentId)
      } catch (refundErr: any) {
        console.error('Refund failed for payment', squarePaymentId, refundErr)
      }
    }
    return NextResponse.json({ error: 'Error al crear la reservación' }, { status: 500 })
  }

  // Save payment record for audit trail (always — card and cash)
  {
    const payRecord: Record<string, unknown> = {
      booking_id:     booking.id,
      amount:         serverTotal,
      provider:       squarePaymentId ? 'square' : 'cash',
      status:         'completed',
      payment_method: payment_method,
      metadata:       squarePaymentId ? { square_payment_id: squarePaymentId } : {},
    }
    if (squarePaymentId) payRecord.provider_payment_id = squarePaymentId
    const { error: payErr } = await service.from('payments').insert(payRecord)
    if (payErr) console.error('Failed to save payment record:', payErr.message)
  }

  // Get terminal_id for the boarding stop (fallback to first available stop)
  const stopCode = boarding_stop_code || 'LA'
  let { data: stopData } = await service
    .from('stops')
    .select('id')
    .eq('code', stopCode)
    .maybeSingle()

  if (!stopData) {
    const { data: anyStop } = await service.from('stops').select('id').limit(1).maybeSingle()
    stopData = anyStop
  }

  const terminalId = stopData?.id
  if (!terminalId) {
    return NextResponse.json({ error: 'No hay terminales configuradas en el sistema' }, { status: 500 })
  }

  // Check for seat conflicts — reject if any requested seat is already taken on this trip
  const seatsRequested = passengers.map(p => p.seat_number).filter(Boolean) as string[]
  if (seatsRequested.length > 0) {
    const { data: takenSeats } = await service
      .from('passengers')
      .select('seat_number, bookings!inner(trip_id, status)')
      .in('seat_number', seatsRequested)
      .not('bookings.status', 'in', '("cancelled","refunded")')
      .eq('bookings.trip_id', tripData.id) as any
    if (takenSeats && takenSeats.length > 0) {
      const taken = takenSeats.map((r: any) => r.seat_number).join(', ')
      if (squarePaymentId && squareClient) {
        try {
          await squareClient.refunds.refundPayment({
            paymentId:      squarePaymentId,
            amountMoney:    { amount: BigInt(Math.round(serverTotal * 100)), currency: 'USD' },
            idempotencyKey: crypto.randomUUID(),
            reason:         'Seat conflict — automatic refund',
          })
        } catch (e: any) { console.error('Refund failed:', e.message) }
      }
      return NextResponse.json({ error: `Asiento(s) ya ocupado(s): ${taken}` }, { status: 409 })
    }
  }

  // Create passengers
  const { error: passError } = await service.from('passengers').insert(
    passengers.map(p => ({
      booking_id:     booking.id,
      full_name:      p.full_name,
      passenger_type: p.passenger_type,
      terminal_id:    terminalId,
      price:          p.price,
      seat_number:    p.seat_number ?? null,
      is_promo:       p.is_promo    ?? false,
      promo_label:    p.promo_label ?? null,
    }))
  )

  if (passError) {
    console.error('Passengers error:', passError)
    await service.from('bookings').delete().eq('id', booking.id)
    if (squarePaymentId && squareClient) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      squarePaymentId,
          amountMoney:    { amount: BigInt(Math.round(serverTotal * 100)), currency: 'USD' },
          idempotencyKey: crypto.randomUUID(),
          reason:         'Passenger creation failed — automatic refund',
        })
        console.log('Square refund issued for payment:', squarePaymentId)
      } catch (refundErr: any) {
        console.error('Refund failed for payment', squarePaymentId, refundErr)
      }
    }
    return NextResponse.json({ error: 'Error al registrar los pasajeros' }, { status: 500 })
  }

  // Credit loyalty points to authenticated non-staff users
  const pointsEarned = (booking as any).points_earned ?? Math.floor(serverTotal)
  if (customerId && pointsEarned > 0) {
    const { data: profile } = await service
      .from('profiles')
      .select('loyalty_points')
      .eq('id', customerId)
      .maybeSingle()
    const currentPoints = (profile as any)?.loyalty_points ?? 0
    const newPoints     = currentPoints + pointsEarned
    const newTier       = calcLoyaltyTier(newPoints)
    await service
      .from('profiles')
      .update({ loyalty_points: newPoints, loyalty_tier: newTier })
      .eq('id', customerId)
    const { error: loyaltyErr } = await service.from('loyalty_transactions').insert({
      customer_id: customerId,
      booking_id:  booking.id,
      points:      pointsEarned,
      type:        'earned',
      description: `Boleto ${booking.booking_number} — ${origin_name} → ${destination_name}`,
    })
    if (loyaltyErr) console.error('Failed to insert loyalty transaction:', loyaltyErr.message)
  }

  // QB sync — online sales only (in-person synced at cierre de caja)
  if (!sucursal_id) {
    try {
      const { createSalesReceipt, logQBTransaction } = await import('@/lib/quickbooks/client')
      const qbResult = await createSalesReceipt({
        bookingNumber:   booking.booking_number,
        originName:      origin_name,
        destinationName: destination_name,
        totalAmount:     serverTotal,
        passengerNames:  passengers.map(p => p.full_name),
        date,
        paymentMethod:   payment_method,
        sucursalName:    'Online',
        sucursalCode:    'WEB',
        qbCashAccountId: null,
        qbItemId:        null,
      })
      await logQBTransaction({
        type:          'sales_receipt',
        docNumber:     booking.booking_number,
        qbId:          qbResult?.SalesReceipt?.Id ?? null,
        amount:        serverTotal,
        description:   `[WEB] ${origin_name} → ${destination_name} — ${date}`,
        referenceType: 'booking_online',
        referenceId:   booking.id,
        payload:       { bookingNumber: booking.booking_number, route: `${origin_name} → ${destination_name}`, paymentMethod: payment_method, amount: serverTotal },
      })
    } catch (qbErr: any) {
      console.error('QB online booking sync skipped:', qbErr.message)
    }
  }

  // Generate QR code
  const qrDataUrl = await QRCode.toDataURL(booking.booking_number, {
    width: 300,
    margin: 2,
    color: { dark: '#0a1e42', light: '#ffffff' },
  })

  // Send email (skip if no email provided)
  let emailStatus = guest_email ? 'sent' : 'skipped'
  let emailError  = ''
  if (guest_email) try {
    const emailResult = await resend.emails.send({
      from:    'Tres Estrellas de Oro <boletos@tresestrellasdeoroinc.com>',
      to:      guest_email,
      subject: `🎫 Tu boleto ${booking.booking_number} — ${origin_name} → ${destination_name}`,
      html:    ticketEmailHtml({
        bookingNumber:   booking.booking_number,
        passengerNames:  passengers.map(p => p.full_name),
        origin:          origin_name,
        destination:     destination_name,
        boardingStop:    boarding_stop_name,
        date,
        departureTime:   departure_time,
        total:           serverTotal,
        qrDataUrl,
        tripType:        ticket_type,
        paymentMethod:   payment_method,
        returnDate:      return_date,
      }),
    })
    if (emailResult.error) {
      emailStatus = 'failed'
      emailError  = JSON.stringify(emailResult.error)
      console.error('Resend error:', emailResult.error)
    }
  } catch (e: any) {
    emailStatus = 'failed'
    emailError  = e?.message || String(e)
    console.error('Email exception:', e)
  }

  return NextResponse.json({
    qr_data_url:    qrDataUrl,
    booking_id:     booking.id,
    booking_number: booking.booking_number,
    total_charged:  serverTotal,
    email_status:   emailStatus,
    email_error:    emailError || undefined,
  }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, passengers(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ bookings })
}
