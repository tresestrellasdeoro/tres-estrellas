import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { z } from 'zod'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/presupuestos?mes=YYYY-MM&sucursal_id=...
export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny
  const { searchParams } = req.nextUrl
  const mes         = searchParams.get('mes')
  const sucursalId  = searchParams.get('sucursal_id')

  let query = svc().from('presupuestos').select('*').order('category')
  if (mes)        query = query.eq('mes', mes) as any
  if (sucursalId) query = query.eq('sucursal_id', sucursalId) as any

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presupuestos: data ?? [] })
}

const SaveSchema = z.object({
  mes:         z.string().regex(/^\d{4}-\d{2}$/),
  sucursal_id: z.string().uuid().optional().nullable(),
  budgets:     z.array(z.object({
    category: z.string().min(1),
    monto:    z.number().min(0),
  })),
})

// POST /api/admin/presupuestos — upsert all budgets for a month
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny
  const body   = await req.json()
  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { mes, sucursal_id, budgets } = parsed.data
  const db = svc()

  // Upsert each category budget
  const rows = budgets.map(b => ({
    mes,
    sucursal_id: sucursal_id ?? null,
    category:    b.category,
    monto:       b.monto,
  }))

  const { error } = await db
    .from('presupuestos')
    .upsert(rows, { onConflict: 'sucursal_id,mes,category', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
