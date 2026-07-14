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

const SucursalSchema = z.object({
  name:                z.string().min(2),
  code:                z.string().min(1).max(10).toUpperCase(),
  city:                z.string().optional(),
  address:             z.string().optional(),
  active:              z.boolean().default(true),
  qb_cash_account_id:  z.string().optional().nullable(),
  qb_item_id:          z.string().optional().nullable(),
})

// GET — list all sucursales
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { data, error } = await service()
    .from('sucursales')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sucursales: data })
}

// POST — create sucursal
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json()
  const parsed = SucursalSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await service()
    .from('sucursales')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sucursal: data }, { status: 201 })
}

// PATCH — update sucursal
export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const parsed = SucursalSchema.partial().safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await service()
    .from('sucursales')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sucursal: data })
}

// DELETE — delete sucursal
export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await service().from('sucursales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
