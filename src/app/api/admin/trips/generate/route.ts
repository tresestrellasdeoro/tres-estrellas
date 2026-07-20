import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + 'T12:00:00Z')
  const end = new Date(to   + 'T12:00:00Z')
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json().catch(() => ({}))
  const from  = body.from ?? new Date().toISOString().split('T')[0]
  const to    = body.to  ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const db = svc()

  // Load all active schedules with their route duration
  const { data: schedules, error: schErr } = await db
    .from('schedules')
    .select('id, departure_time, days_of_week, route:routes(id, duration_minutes)')
    .eq('is_active', true) as any

  if (schErr) return NextResponse.json({ error: schErr.message }, { status: 500 })

  const dates   = dateRange(from, to)
  const inserts: Record<string, unknown>[] = []

  for (const date of dates) {
    // JS getDay(): 0=Sun,1=Mon,...,6=Sat — matches Postgres convention in schema
    const dow = new Date(date + 'T12:00:00Z').getUTCDay()

    for (const sch of schedules ?? []) {
      const daysOfWeek: number[] = sch.days_of_week ?? [0,1,2,3,4,5,6]
      if (!daysOfWeek.includes(dow)) continue

      const durationMin: number = sch.route?.duration_minutes ?? 300
      const departure = sch.departure_time as string        // e.g. "08:00:00"
      const arrival   = addMinutesToTime(departure, durationMin)

      inserts.push({
        schedule_id:       sch.id,
        departure_date:    date,
        departure_time:    departure,
        estimated_arrival: arrival,
        status:            'scheduled',
        seats_total:       55,
        seats_available:   55,
        trip_number:       '',   // trigger will fill this
      })
    }
  }

  if (inserts.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, message: 'No hay horarios activos para ese rango' })
  }

  // Batch insert — ON CONFLICT DO NOTHING handles duplicates (UNIQUE schedule_id+departure_date)
  let inserted: any[] | null = null
  let insErr: any = null
  try {
    const result = await db.from('trips').insert(inserts).select('id')
    inserted = result.data
    insErr   = result.error
  } catch (e: any) {
    insErr = e
  }

  if (insErr) return NextResponse.json({ error: insErr.message ?? String(insErr) }, { status: 500 })

  const created = inserted?.length ?? 0
  const skipped = inserts.length - created

  return NextResponse.json({ created, skipped, total_attempted: inserts.length })
}
