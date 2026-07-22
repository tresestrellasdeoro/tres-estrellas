import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const squareClient = process.env.SQUARE_ACCESS_TOKEN
  ? new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: SquareEnvironment.Production })
  : null

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'Falta booking_id' }, { status: 422 })

  const service = svc()

  // Fetch the booking — verify ownership
  const { data: booking, error: fetchErr } = await service
    .from('bookings')
    .select('id, booking_number, status, customer_id, total_amount, trip_id, trips(departure_date, departure_time)')
    .eq('id', booking_id)
    .maybeSingle() as any

  if (fetchErr || !booking) return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 })

  // Only the owner can cancel (admin bypasses via a different route)
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: `No se puede cancelar — estado actual: ${booking.status}` }, { status: 409 })
  }

  // Check trip hasn't departed yet
  const trip = booking.trips
  if (trip?.departure_date && trip?.departure_time) {
    const departureISO = `${trip.departure_date}T${trip.departure_time}`
    const departure    = new Date(departureISO)
    if (departure <= new Date()) {
      return NextResponse.json({ error: 'No se puede cancelar — el viaje ya salió o está saliendo' }, { status: 409 })
    }
  }

  // Attempt Square refund if there's a payment record
  let refundIssued = false
  if (squareClient) {
    const { data: payment } = await service
      .from('payments')
      .select('provider_payment_id, amount')
      .eq('booking_id', booking_id)
      .eq('provider', 'square')
      .eq('status', 'completed')
      .maybeSingle() as any

    if (payment?.provider_payment_id) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      payment.provider_payment_id,
          amountMoney:    { amount: BigInt(Math.round(Number(payment.amount) * 100)), currency: 'USD' },
          idempotencyKey: crypto.randomUUID(),
          reason:         `Cancelación boleto ${booking.booking_number}`,
        })
        refundIssued = true
      } catch (e: any) {
        console.error('Square refund error on cancel:', e?.errors?.[0]?.detail || e.message)
        // Continue with cancellation even if refund fails — log it
      }
    }
  }

  // Update booking status
  const newStatus = refundIssued ? 'refunded' : 'cancelled'
  const { error: updateErr } = await service
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', booking_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Restore seat availability
  if (booking.trip_id) {
    const { count: paxCount } = await service
      .from('passengers')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking_id)

    const seatCount = paxCount ?? 1
    try {
      await service.rpc('increment_seats_available', { trip_id: booking.trip_id, amount: seatCount })
    } catch { /* best-effort — ignore if RPC doesn't exist yet */ }
  }

  return NextResponse.json({ ok: true, status: newStatus, refund_issued: refundIssued })
}
