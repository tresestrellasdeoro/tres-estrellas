import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Returns today's scheduled trips (schedules running today) + their log status
export async function GET() {
  const db   = service()
  const today = new Date().toISOString().slice(0, 10)

  // day 0=Sun…6=Sat (JS standard)
  const dayIndex = new Date().getDay()

  // Fetch active schedules for today's day of week, joined with route info
  const { data: schedules, error: schError } = await db
    .from('schedules')
    .select('id, departure_time, days_of_week, route_id, routes(id, name, code, origin_stop:stops!routes_origin_stop_id_fkey(name), destination_stop:stops!routes_destination_stop_id_fkey(name))')
    .eq('is_active', true)
    .contains('days_of_week', [dayIndex])
    .order('departure_time', { ascending: true })

  if (schError) return NextResponse.json({ error: schError.message }, { status: 500 })

  // Fetch trip_logs for today (may fail if table doesn't exist yet)
  let logs: Array<{ schedule_id: string; status: string; delay_minutes: number; notes: string | null }> = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from('trip_logs')
      .select('schedule_id, status, delay_minutes, notes')
      .eq('trip_date', today)
    if (Array.isArray(data)) logs = data
  } catch {
    // trip_logs table not yet created — return schedules with default status
  }

  const logMap = new Map(logs.map(l => [l.schedule_id, l]))

  const trips = (schedules ?? []).map(sch => ({
    schedule_id:     sch.id,
    departure_time:  sch.departure_time,
    route:           sch.routes,
    status:          logMap.get(sch.id)?.status ?? 'scheduled',
    delay_minutes:   logMap.get(sch.id)?.delay_minutes ?? 0,
    notes:           logMap.get(sch.id)?.notes ?? null,
  }))

  return NextResponse.json({ trips, date: today })
}

// Upsert trip status
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { schedule_id, status, delay_minutes = 0, notes = null } = body

  if (!schedule_id || !status) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const db = service()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
