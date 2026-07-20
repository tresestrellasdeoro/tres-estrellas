import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — list cierres with optional sucursal/date filters
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = req.nextUrl
  const sucursalId = searchParams.get('sucursal_id')
  const fecha      = searchParams.get('fecha')
  const limit      = parseInt(searchParams.get('limit') ?? '50')

  let query = service()
    .from('cierres_turno')
    .select(`
      *,
      sucursales(name, code),
      profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sucursalId) query = query.eq('sucursal_id', sucursalId) as any
  if (fecha)      query = query.eq('fecha', fecha) as any

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cierres: data })
}

const CierreSchema = z.object({
  sucursal_id:    z.string().uuid(),
  user_id:        z.string().uuid().optional(),
  fecha:          z.string().optional(),
  notas:          z.string().optional(),
})

// POST — create a new cierre de turno (auto-calculates totals from bookings)
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json()
  const parsed = CierreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { sucursal_id, user_id, notas } = parsed.data
  const fecha = parsed.data.fecha ?? new Date().toISOString().split('T')[0]

  const svc = service()

  // Get all bookings for this sucursal on this date
  const fechaStart = `${fecha}T00:00:00.000Z`
  const fechaEnd   = `${fecha}T23:59:59.999Z`

  let bookingQuery = svc
    .from('bookings')
    .select('id, total_amount, payment_method')
    .gte('created_at', fechaStart)
    .lte('created_at', fechaEnd)
    .eq('status', 'confirmed')

  if (sucursal_id) bookingQuery = bookingQuery.eq('sucursal_id', sucursal_id) as any
  if (user_id)     bookingQuery = bookingQuery.eq('customer_id', user_id) as any

  const { data: bookings } = await bookingQuery

  // Get packages for this sucursal/date
  const { data: packages } = await svc
    .from('packages')
    .select('price')
    .gte('created_at', fechaStart)
    .lte('created_at', fechaEnd)
    .eq('sucursal_id', sucursal_id)
    .then(r => r, () => ({ data: [] as any[] })) as any

  const total_boletos  = bookings?.length ?? 0
  const total_efectivo = bookings?.filter((b: any) => b.payment_method === 'cash').reduce((s: number, b: any) => s + (b.total_amount || 0), 0) ?? 0
  const total_tarjeta  = bookings?.filter((b: any) => b.payment_method === 'card').reduce((s: number, b: any) => s + (b.total_amount || 0), 0) ?? 0
  const total_paquetes = (packages ?? []).reduce((s: number, p: any) => s + (p.price || 0), 0)
  const total_general  = total_efectivo + total_tarjeta + total_paquetes

  const { data: cierre, error } = await svc
    .from('cierres_turno')
    .insert({
      sucursal_id,
      user_id:   user_id ?? null,
      fecha,
      total_boletos,
      total_efectivo,
      total_tarjeta,
      total_paquetes,
      total_general,
      notas: notas ?? null,
    })
    .select('*, sucursales(name, code)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The cierre is a local cash-reconciliation report only.
  // Each individual sale already creates a Sales Receipt in QuickBooks via /api/bookings.
  // Sending the daily total here would double-count every sale.

  return NextResponse.json({ cierre }, { status: 201 })
}
