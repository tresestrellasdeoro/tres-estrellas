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
  name:         z.string().min(2),
  email:        z.string().email(),
  password:     z.string().min(8),
  role:         z.enum(['cajero', 'admin', 'super_admin', 'developer']).default('cajero'),
  sucursal_id:  z.string().uuid().optional().nullable(),
  departamento: z.enum(DEPARTAMENTOS).optional().nullable(),
  permisos:     z.array(z.enum(PERMISOS_VALIDOS)).default([]),
})

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { name, email, password, role, sucursal_id, departamento, permisos } = parsed.data

  if (role === 'cajero' && !sucursal_id) {
    return NextResponse.json({ error: 'Los cajeros deben tener una sucursal asignada.' }, { status: 422 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Error al crear usuario' }, { status: 500 })
  }

  const userId = authData.user.id

  const { error: profileError } = await service
    .from('profiles')
    .upsert({
      id:           userId,
      email,
      full_name:    name,
      role,
      sucursal_id:  sucursal_id  ?? null,
      departamento: departamento ?? null,
      permisos:     permisos,
    }, { onConflict: 'id' })

  if (profileError) {
    await service.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: `Error al crear perfil: ${profileError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id: userId }, { status: 201 })
}
