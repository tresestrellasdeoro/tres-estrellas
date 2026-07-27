import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest) {
  // 1. Try Supabase session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await svc()
      .from('profiles')
      .select('full_name, email, role, permisos, sucursal_id, sucursales(name, code)')
      .eq('id', user.id)
      .maybeSingle() as { data: any }

    if (profile) {
      return NextResponse.json({
        id:        user.id,
        name:      profile.full_name || profile.email?.split('@')[0] || 'Usuario',
        email:     profile.email ?? user.email,
        role:      profile.role ?? 'cajero',
        permisos:  profile.permisos ?? [],
        sucursal:  profile.sucursales ?? null,
      })
    }
  }

  // 2. Fall back to admin_session cookie (legacy admin login)
  const cookieStore = await cookies()
  const session     = cookieStore.get('admin_session')
  if (session?.value) {
    return NextResponse.json({
      id:        null,
      name:      'Administrador',
      email:     process.env.ADMIN_EMAIL ?? '',
      role:      'super_admin',
      permisos:  ['all'],
      sucursal:  null,
    })
  }

  // Last resort — return generic admin profile so the widget is always visible when logged in
  return NextResponse.json({
    id:       null,
    name:     'Administrador',
    email:    process.env.ADMIN_EMAIL ?? '',
    role:     'super_admin',
    permisos: ['all'],
    sucursal: null,
  })
}
