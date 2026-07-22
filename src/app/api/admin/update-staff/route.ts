import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const DEPARTAMENTOS = [
  'Contabilidad', 'Coordinación', 'Equipaje', 'Flota',
  'Gerencia', 'Sistemas', 'Ventas', 'Webmaster',
] as const

const PERMISOS_VALIDOS = [
  'ventas', 'checkin', 'reportes', 'paquetes', 'clientes', 'personal', 'all',
] as const

const Schema = z.object({
  user_id:      z.string().uuid(),
  role:         z.enum(['cajero', 'admin', 'super_admin', 'developer']).optional(),
  sucursal_id:  z.string().uuid().nullable().optional(),
  departamento: z.enum(DEPARTAMENTOS).nullable().optional(),
  permisos:     z.array(z.enum(PERMISOS_VALIDOS)).optional(),
})

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { user_id, ...updates } = parsed.data

  if (updates.role === 'cajero' && updates.sucursal_id === null) {
    return NextResponse.json({ error: 'Los cajeros deben tener una sucursal asignada.' }, { status: 422 })
  }

  const patch: Record<string, unknown> = {}
  if (updates.role         !== undefined) patch.role         = updates.role
  if (updates.sucursal_id  !== undefined) patch.sucursal_id  = updates.sucursal_id
  if (updates.departamento !== undefined) patch.departamento = updates.departamento
  if (updates.permisos     !== undefined) patch.permisos     = updates.permisos

  const { error } = await svc()
    .from('profiles')
    .update(patch)
    .eq('id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
