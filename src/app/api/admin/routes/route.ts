import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { data, error } = await service()
    .from('routes')
    .select(`
      *,
      origin_stop:stops!routes_origin_stop_id_fkey(id, code, name),
      destination_stop:stops!routes_destination_stop_id_fkey(id, code, name),
      schedules(id, departure_time, days_of_week, is_active)
    `)
    .order('code', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ routes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { code, name, origin_stop_id, destination_stop_id, duration_minutes } = body

  if (!code || !name || !origin_stop_id || !destination_stop_id || !duration_minutes) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const { data, error } = await service()
    .from('routes')
    .insert({ code: code.toUpperCase(), name, origin_stop_id, destination_stop_id, duration_minutes: Number(duration_minutes), is_active: true })
    .select(`
      *,
      origin_stop:stops!routes_origin_stop_id_fkey(id, code, name),
      destination_stop:stops!routes_destination_stop_id_fkey(id, code, name),
      schedules(id, departure_time, days_of_week, is_active)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ route: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { data, error } = await service()
    .from('routes')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      origin_stop:stops!routes_origin_stop_id_fkey(id, code, name),
      destination_stop:stops!routes_destination_stop_id_fkey(id, code, name),
      schedules(id, departure_time, days_of_week, is_active)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ route: data })
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { error } = await service().from('routes').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
