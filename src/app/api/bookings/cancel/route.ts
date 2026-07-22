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
    .select('id, booking_number, status, customer_id, total_amount, points_earned, trip_id, trips(departure_date, departure_time)')
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

  // Reverse loyalty points if any were earned
  if (booking.customer_id && booking.points_earned && booking.points_earned > 0) {
    const { data: profile } = await service
      .from('profiles')
      .select('loyalty_points')
      .eq('id', booking.customer_id)
      .maybeSingle() as any
    const currentPoints = profile?.loyalty_points ?? 0
    const newPoints     = Math.max(0, currentPoints - booking.points_earned)
    const newTier       = newPoints >= 5000 ? 'platinum'
      : newPoints >= 2000 ? 'gold'
      : newPoints >= 500  ? 'silver'
      : newPoints >= 100  ? 'bronze'
      : 'none'
    await service.from('profiles')
      .update({ loyalty_points: newPoints, loyalty_tier: newTier })
      .eq('id', booking.customer_id)
    const loyaltyInsert = await service.from('loyalty_transactions').insert({
      customer_id: booking.customer_id,
      booking_id:  booking_id,
      points:      -booking.points_earned,
      type:        'earned',
      description: `Cancelación boleto ${booking.booking_number}`,
    })
    if (loyaltyInsert.error) console.error('loyalty_transactions reversal failed:', loyaltyInsert.error.message)
  }

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
