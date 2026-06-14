import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminCookie = req.cookies.get('admin_session')

  if (!adminCookie?.value && !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!adminCookie?.value && user) {
    const svc = service()
    const { data: profile } = await svc
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as { data: { role: string } | null }
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 422 })

  const svc = service()

  // Prevent deleting admin/super_admin accounts
  const { data: target } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user_id)
    .maybeSingle() as { data: { role: string } | null }

  if (target?.role === 'admin' || target?.role === 'super_admin') {
    return NextResponse.json({ error: 'No se puede eliminar una cuenta de administrador' }, { status: 403 })
  }

  // Delete auth user (cascades to profile via FK ON DELETE CASCADE)
  const { error } = await svc.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
