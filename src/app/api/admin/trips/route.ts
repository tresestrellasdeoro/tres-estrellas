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
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Falta date' }, { status: 422 })

  const { data, error } = await svc()
    .from('trips')
    .select(`
      id, trip_number, departure_date, departure_time, estimated_arrival,
      status, seats_total, seats_available,
      bus:buses(id, plate_number, unit_number),
      schedule:schedules(
        id, departure_time, days_of_week,
        route:routes(
          id, code, name, duration_minutes,
          origin_stop:stops!origin_stop_id(id, name, code),
          destination_stop:stops!destination_stop_id(id, name, code)
        )
      )
    `)
    .eq('departure_date', date)
    .order('departure_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trips: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { data, error } = await svc()
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select('id, status, seats_available, bus_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trip: data })
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { error } = await svc().from('trips').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
