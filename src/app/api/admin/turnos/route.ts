import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — lista de turnos con filtros opcionales
// Query params: sucursal_id, estado (activo|cerrado), cajero_user_id, fecha, limit
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = req.nextUrl
  const sucursalId   = searchParams.get('sucursal_id')
  const estado       = searchParams.get('estado')
  const cajeroUserId = searchParams.get('cajero_user_id')
  const fecha        = searchParams.get('fecha')
  const limit        = parseInt(searchParams.get('limit') ?? '100')

  let query = svc()
    .from('turnos')
    .select(`
      *,
      sucursales(id, name, code),
      profiles!turnos_cajero_user_id_fkey(id, full_name, email)
    `)
    .order('inicio', { ascending: false })
    .limit(limit)

  if (sucursalId)   query = query.eq('sucursal_id',    sucursalId)   as any
  if (estado)       query = query.eq('estado',          estado)       as any
  if (cajeroUserId) query = query.eq('cajero_user_id',  cajeroUserId) as any
  if (fecha) {
    // Filtrar por fecha local (inicio del día en UTC-7)
    const dayStart = `${fecha}T07:00:00.000Z`
    const nextDay  = new Date(`${fecha}T07:00:00.000Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    query = query.gte('inicio', dayStart).lt('inicio', nextDay.toISOString()) as any
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ turnos: data ?? [] })
}
