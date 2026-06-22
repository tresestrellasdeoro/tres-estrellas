import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/route-stops?route_id=...
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const route_id = req.nextUrl.searchParams.get('route_id')
  if (!route_id) return NextResponse.json({ error: 'Falta route_id' }, { status: 422 })

  const { data, error } = await service()
    .from('route_stops')
    .select('id, stop_id, stop_order, stops(id, code, name, city)')
    .eq('route_id', route_id)
    .order('stop_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ route_stops: data ?? [] })
}

// PUT /api/admin/route-stops
// Replaces all stops for a route with the provided ordered array
export async function PUT(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { route_id, stops } = await req.json()
  if (!route_id || !Array.isArray(stops)) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const db = service()

  // Delete existing stops for this route
  const { error: delError } = await db
    .from('route_stops')
    .delete()
    .eq('route_id', route_id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (stops.length === 0) return NextResponse.json({ route_stops: [] })

  // Insert new ordered stops
  const rows = stops.map((stop_id: string, idx: number) => ({
    route_id,
    stop_id,
    stop_order: idx,
  }))

  const { data, error } = await db
    .from('route_stops')
    .insert(rows)
    .select('id, stop_id, stop_order, stops(id, code, name, city)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ route_stops: data ?? [] })
}
