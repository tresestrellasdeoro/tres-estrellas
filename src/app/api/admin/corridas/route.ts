import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = req.nextUrl
  const from   = searchParams.get('from')  ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to     = searchParams.get('to')    ?? new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0]
  const route  = searchParams.get('route') ?? undefined
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '200'), 1000)

  const db = svc()

  let query = db
    .from('trips')
    .select(`
      id, trip_number, departure_date, departure_time, estimated_arrival,
      status, seats_total, seats_available,
      bus:buses(id, plate, brand, model, capacity),
      driver:drivers(id, name, phone),
      schedule:schedules(
        route:routes(id, code, name,
          origin_stop:stops!origin_stop_id(code, name),
          destination_stop:stops!destination_stop_id(code, name)
        )
      )
    `)
    .gte('departure_date', from)
    .lte('departure_date', to)
    .order('departure_date', { ascending: false })
    .order('departure_time', { ascending: true })
    .limit(limit)

  if (route) query = query.eq('schedule.route.code', route) as any

  const { data: trips, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get passenger counts and revenue per trip
  const tripIds = (trips ?? []).map((t: any) => t.id)
  let passMap: Record<string, { count: number; revenue: number; promo: number }> = {}

  if (tripIds.length > 0) {
    const { data: bookings } = await db
      .from('bookings')
      .select('trip_id, total_amount, passengers:passengers(id, is_promo)')
      .in('trip_id', tripIds)
      .eq('status', 'confirmed') as any

    for (const b of bookings ?? []) {
      if (!passMap[b.trip_id]) passMap[b.trip_id] = { count: 0, revenue: 0, promo: 0 }
      const pm = passMap[b.trip_id]
      pm.revenue += Number(b.total_amount ?? 0)
      for (const p of b.passengers ?? []) {
        pm.count++
        if (p.is_promo) pm.promo++
      }
    }
  }

  const corridas = (trips ?? []).map((t: any) => {
    const pm = passMap[t.id] ?? { count: 0, revenue: 0, promo: 0 }
    const capacity = t.bus?.capacity ?? t.seats_total ?? 0
    return {
      id:              t.id,
      trip_number:     t.trip_number,
      departure_date:  t.departure_date,
      departure_time:  t.departure_time,
      estimated_arrival: t.estimated_arrival,
      status:          t.status,
      seats_total:     capacity,
      route:           t.schedule?.route ?? null,
      bus:             t.bus ?? null,
      driver:          t.driver ?? null,
      passengers:      pm.count,
      promo_count:     pm.promo,
      revenue:         pm.revenue,
      occupancy_pct:   capacity > 0 ? Math.round((pm.count / capacity) * 100) : 0,
    }
  })

  return NextResponse.json({ corridas })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { id, bus_id, driver_id, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const updates: Record<string, unknown> = {}
  if (bus_id    !== undefined) updates.bus_id    = bus_id    || null
  if (driver_id !== undefined) updates.driver_id = driver_id || null
  if (status    !== undefined) updates.status    = status

  const { data, error } = await svc().from('trips').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trip: data })
}
