import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['cajero', 'driver']),
})

export async function POST(req: NextRequest) {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminCookie = req.cookies.get('admin_session')
  if (!adminCookie?.value && !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (user) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const { name, email, password, role } = parsed.data

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Error al crear usuario' }, { status: 500 })
  }

  // Upsert profile
  const { error: profileError } = await service.from('profiles').upsert({
    id:         authData.user.id,
    email,
    full_name:  name,
    role,
    phone:      null,
    loyalty_tier:   'none',
    loyalty_points: 0,
    total_trips:    0,
  })

  if (profileError) {
    await service.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id: authData.user.id }, { status: 201 })
}
