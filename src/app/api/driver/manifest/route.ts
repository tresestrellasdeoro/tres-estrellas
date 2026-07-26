import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireDriver() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await svc()
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle() as { data: { id: string; role: string; full_name: string } | null }
  const allowed = ['driver', 'cajero', 'admin', 'super_admin', 'developer']
  if (!profile || !allowed.includes(profile.role)) return null
  return { user, profile }
}

// GET /api/driver/manifest?date=YYYY-MM-DD           → lista de trips ese día
// GET /api/driver/manifest?date=YYYY-MM-DD&trip_id=X → pasajeros de ese trip
export async function GET(req: NextRequest) {
  const auth = await requireDriver()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date    = searchParams.get('date')
  const trip_id = searchParams.get('trip_id')

  if (!date) return NextResponse.json({ error: 'Falta date' }, { status: 422 })

  const service = svc()

  // ── Lista de trips ese día ───────────────────────────────────────────
  if (!trip_id) {
    const { data: trips, error } = await service
      .from('trips')
      .select(`
        id,
        departure_date,
        departure_time,
        status,
        seats_available,
        seats_total,
        schedules(routes(name, origin_stop:stops!routes_origin_stop_id_fkey(name), destination_stop:stops!routes_destination_stop_id_fkey(name)))
      `)
      .eq('departure_date', date)
      .eq('status', 'scheduled')
      .order('departure_time')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Count passengers per trip
    const tripIds = (trips ?? []).map(t => t.id)
    let paxByTrip: Record<string, number> = {}
    let boardedByTrip: Record<string, number> = {}

    if (tripIds.length > 0) {
      const { data: passengers } = await service
        .from('passengers')
        .select('id, checked_in, bookings!inner(trip_id, status)')
        .in('bookings.trip_id', tripIds)
        .not('bookings.status', 'in', '("cancelled","refunded")') as any

      for (const p of passengers ?? []) {
        const tid = (p.bookings as any)?.trip_id as string
        if (!tid) continue
        paxByTrip[tid]    = (paxByTrip[tid]    ?? 0) + 1
        if (p.checked_in) boardedByTrip[tid] = (boardedByTrip[tid] ?? 0) + 1
      }
    }

    const tripsWithCounts = (trips ?? []).map(t => ({
      ...t,
      pax_count:    paxByTrip[t.id]    ?? 0,
      boarded_count: boardedByTrip[t.id] ?? 0,
    }))

    return NextResponse.json({ trips: tripsWithCounts })
  }

  // ── Pasajeros de un trip específico ──────────────────────────────────
  const { data: trip, error: tripErr } = await service
    .from('trips')
    .select(`
      id, departure_date, departure_time, status, seats_available, seats_total,
      schedules(routes(name, origin_stop:stops!routes_origin_stop_id_fkey(name), destination_stop:stops!routes_destination_stop_id_fkey(name)))
    `)
    .eq('id', trip_id)
    .maybeSingle() as { data: any; error: any }

  if (tripErr || !trip) return NextResponse.json({ error: 'Trip no encontrado' }, { status: 404 })

  // Get all confirmed bookings for this trip with passengers
  const { data: bookings, error: bErr } = await service
    .from('bookings')
    .select(`
      id, booking_number, status, ticket_type, total_amount, luggage_price, luggage_label, payment_method,
      guest_email, origin_name, destination_name, return_date,
      passengers(id, full_name, passenger_type, price, seat_number, checked_in, checked_in_at, return_checked_in, return_checked_in_at)
    `)
    .eq('trip_id', trip_id)
    .not('status', 'in', '("cancelled","refunded")')
    .order('created_at') as { data: any[]; error: any }

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  const allPassengers = (bookings ?? []).flatMap((b: any) =>
    (b.passengers ?? []).map((p: any) => ({
      ...p,
      booking_number:   b.booking_number,
      booking_status:   b.status,
      ticket_type:      b.ticket_type,
      payment_method:   b.payment_method,
      guest_email:      b.guest_email,
      luggage_label:    b.luggage_label ?? null,
      luggage_price:    b.luggage_price ?? 0,
    }))
  )

  const total    = allPassengers.length
  const boarded  = allPassengers.filter(p => p.checked_in).length
  const pending  = total - boarded

  return NextResponse.json({
    trip,
    bookings:    bookings ?? [],
    passengers:  allPassengers,
    summary:     { total, boarded, pending },
  })
}
