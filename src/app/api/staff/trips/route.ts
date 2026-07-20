import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Returns today's scheduled trips with per-stop departure status
export async function GET(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny
  const db    = service()
  const today = new Date().toISOString().slice(0, 10)

  // day 0=Sun…6=Sat
  const dayIndex = new Date().getDay()

  // Fetch active schedules for today
  const { data: schedules, error: schError } = await db
    .from('schedules')
    .select(`
      id, departure_time, days_of_week, route_id,
      routes(
        id, name, code,
        origin_stop:stops!origin_stop_id(id, name, city),
        destination_stop:stops!destination_stop_id(id, name, city)
      )
    `)
    .eq('is_active', true)
    .contains('days_of_week', [dayIndex])
    .order('departure_time', { ascending: true })

  if (schError) return NextResponse.json({ error: schError.message }, { status: 500 })

  // Fetch route_stops for all routes (may not exist yet)
  const routeIds = [...new Set((schedules ?? []).map((s: any) => s.route_id).filter(Boolean))]
  const routeStopsMap = new Map<string, Array<{ stop_id: string; stop_order: number; stops: { id: string; name: string; city: string } | null }>>()

  if (routeIds.length > 0) {
    try {
      const { data: rsData } = await (db as any)
        .from('route_stops')
        .select('route_id, stop_id, stop_order, stops(id, name, city)')
        .in('route_id', routeIds)
        .order('stop_order', { ascending: true })

      if (Array.isArray(rsData)) {
        for (const rs of rsData) {
          if (!routeStopsMap.has(rs.route_id)) routeStopsMap.set(rs.route_id, [])
          routeStopsMap.get(rs.route_id)!.push(rs)
        }
      }
    } catch { /* route_stops not yet created — fallback to origin/destination */ }
  }

  // Fetch overall trip_logs for today
  let logs: Array<{ schedule_id: string; status: string; delay_minutes: number; notes: string | null }> = []
  try {
    const { data } = await (db as any)
      .from('trip_logs')
      .select('schedule_id, status, delay_minutes, notes')
      .eq('trip_date', today)
    if (Array.isArray(data)) logs = data
  } catch { /* trip_logs not yet created */ }

  // Fetch per-stop departure logs for today
  let stopLogs: Array<{ schedule_id: string; stop_id: string; stop_order: number; departed_at: string }> = []
  try {
    const { data } = await (db as any)
      .from('trip_stop_logs')
      .select('schedule_id, stop_id, stop_order, departed_at')
      .eq('trip_date', today)
    if (Array.isArray(data)) stopLogs = data
  } catch { /* trip_stop_logs not yet created */ }

  // Build lookup maps
  const logMap = new Map(logs.map(l => [l.schedule_id, l]))

  // schedule_id → Map<stop_id, departed_at>
  const stopLogMap = new Map<string, Map<string, string>>()
  for (const sl of stopLogs) {
    if (!stopLogMap.has(sl.schedule_id)) stopLogMap.set(sl.schedule_id, new Map())
    stopLogMap.get(sl.schedule_id)!.set(sl.stop_id, sl.departed_at)
  }

  const trips = (schedules ?? []).map((sch: any) => {
    const route          = sch.routes
    const routeStops     = routeStopsMap.get(sch.route_id) ?? []
    const stopDepartures = stopLogMap.get(sch.id) ?? new Map<string, string>()

    // Build stops array — use route_stops if configured, else fall back to origin + destination
    let stops: Array<{ stop_id: string; stop_order: number; name: string; city: string; departed: boolean; departed_at: string | null }>

    if (routeStops.length >= 2) {
      stops = routeStops.map(rs => ({
        stop_id:     rs.stop_id,
        stop_order:  rs.stop_order,
        name:        rs.stops?.name ?? '',
        city:        rs.stops?.city ?? '',
        departed:    stopDepartures.has(rs.stop_id),
        departed_at: stopDepartures.get(rs.stop_id) ?? null,
      }))
    } else if (route?.origin_stop && route?.destination_stop) {
      stops = [
        {
          stop_id:     route.origin_stop.id,
          stop_order:  0,
          name:        route.origin_stop.name,
          city:        route.origin_stop.city ?? '',
          departed:    stopDepartures.has(route.origin_stop.id),
          departed_at: stopDepartures.get(route.origin_stop.id) ?? null,
        },
        {
          stop_id:     route.destination_stop.id,
          stop_order:  1,
          name:        route.destination_stop.name,
          city:        route.destination_stop.city ?? '',
          departed:    stopDepartures.has(route.destination_stop.id),
          departed_at: stopDepartures.get(route.destination_stop.id) ?? null,
        },
      ]
    } else {
      stops = []
    }

    return {
      schedule_id:    sch.id,
      departure_time: sch.departure_time,
      route,
      stops,
      status:         logMap.get(sch.id)?.status        ?? 'scheduled',
      delay_minutes:  logMap.get(sch.id)?.delay_minutes ?? 0,
      notes:          logMap.get(sch.id)?.notes         ?? null,
    }
  })

  return NextResponse.json({ trips, date: today })
}

// Upsert overall trip status (cancelled / delayed / notes)
export async function POST(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny
  const body = await req.json()
  const { schedule_id, status, delay_minutes = 0, notes = null } = body

  if (!schedule_id || !status) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const db    = service()

  const { data, error } = await (db as any)
    .from('trip_logs')
    .upsert(
      { schedule_id, trip_date: today, status, delay_minutes, notes },
      { onConflict: 'schedule_id,trip_date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
