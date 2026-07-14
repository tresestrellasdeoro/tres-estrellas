import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
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
  role:         z.enum(['cajero', 'admin', 'super_admin']).default('cajero'),
  sucursal_id:  z.string().uuid().optional().nullable(),
  departamento: z.enum(DEPARTAMENTOS).optional().nullable(),
  permisos:     z.array(z.enum(PERMISOS_VALIDOS)).default([]),
})

async function verifyAdmin(req: NextRequest) {
  const adminCookie = req.cookies.get('admin_session')
  if (adminCookie?.value) return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  return profile?.role === 'admin' || profile?.role === 'super_admin'
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { name, email, password, role, sucursal_id, departamento, permisos } = parsed.data

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
