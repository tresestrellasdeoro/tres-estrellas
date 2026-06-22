import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import QRCode from 'qrcode'
import { Resend } from 'resend'
import { ticketEmailHtml } from '@/lib/email/ticket-template'
import { SquareClient, SquareEnvironment } from 'square'

const resend = new Resend(process.env.RESEND_API_KEY)

const squareConfigured = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID)
const squareClient = squareConfigured
  ? new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN!,
      environment: SquareEnvironment.Production,
    })
  : null

const BookingSchema = z.object({
  ticket_type:        z.enum(['one_way', 'round_trip']),
  total_amount:       z.number().positive(),
  guest_email:        z.string().email().or(z.literal('')).optional(),
  payment_method:     z.enum(['card', 'cash']).default('card'),
  source_id:          z.string().optional(),
  origin_name:        z.string(),
  destination_name:   z.string(),
  boarding_stop_code: z.string().optional(),
  boarding_stop_name: z.string(),
  date:               z.string(),
  departure_time:     z.string(),
  return_date:        z.string().optional(),
  passengers: z.array(z.object({
    full_name:      z.string().min(2),
    passenger_type: z.enum(['adult', 'child', 'senior']),
    price:          z.number().positive(),
  })).min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = BookingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const {
    ticket_type, total_amount, guest_email, payment_method, source_id,
    origin_name, destination_name, boarding_stop_code, boarding_stop_name,
    date, departure_time, return_date, passengers,
  } = parsed.data

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
        amountMoney:    { amount: BigInt(Math.round(total_amount * 100)), currency: 'USD' },
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

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try to link to authenticated user (optional)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customerId: string | null = user?.id ?? null

  // Get any real trip to satisfy FK constraint (demo mode)
  const { data: tripData } = await service
    .from('trips')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!tripData?.id) {
    return NextResponse.json({ error: 'No hay viajes en el sistema. Ejecuta el seed SQL.' }, { status: 404 })
  }

  // Create booking (customer_id is optional for guest checkout)
  const bookingInsert: Record<string, unknown> = {
    trip_id:       tripData.id,
    ticket_type,
    status:        'confirmed',
    total_amount,
    payment_method,
    points_earned: Math.floor(total_amount),
    guest_email:   guest_email || null,
  }
  if (return_date) bookingInsert.return_date = return_date
  if (customerId) bookingInsert.customer_id = customerId

  const { data: booking, error: bookingError } = await service
    .from('bookings')
    .insert(bookingInsert)
    .select('id, booking_number')
    .single()

  if (bookingError || !booking) {
    console.error('Booking error:', bookingError)
    // Reembolsar el cobro de Square si el booking falló
    if (squarePaymentId && squareClient) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      squarePaymentId,
          amountMoney:    { amount: BigInt(Math.round(total_amount * 100)), currency: 'USD' },
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

  // Create passengers
  const { error: passError } = await service.from('passengers').insert(
    passengers.map(p => ({
      booking_id:     booking.id,
      full_name:      p.full_name,
      passenger_type: p.passenger_type,
      terminal_id:    terminalId,
      price:          p.price,
    }))
  )

  if (passError) {
    console.error('Passengers error:', passError)
    await service.from('bookings').delete().eq('id', booking.id)
    if (squarePaymentId && squareClient) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      squarePaymentId,
          amountMoney:    { amount: BigInt(Math.round(total_amount * 100)), currency: 'USD' },
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

  // Generate QR code
  const qrDataUrl = await QRCode.toDataURL(booking.booking_number, {
    width: 300,
    margin: 2,
    color: { dark: '#0a1e42', light: '#ffffff' },
  })

  // Send email (skip if no email provided — e.g. cash sales at counter)
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
        total:           total_amount,
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
