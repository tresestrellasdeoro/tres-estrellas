import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

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

  // Nullify FK references before deleting so cascades don't block
  await Promise.all([
    svc.from('bookings').update({ customer_id: null }).eq('customer_id', user_id),
    svc.from('gastos').update({ created_by: null }).eq('created_by', user_id),
    svc.from('support_tickets').update({ created_by: null }).eq('created_by', user_id),
    svc.from('support_tickets').update({ assigned_to: null }).eq('assigned_to', user_id),
    svc.from('support_messages').update({ sender_id: null }).eq('sender_id', user_id),
    svc.from('trips').update({ driver_id: null }).eq('driver_id', user_id),
  ])

  // Delete profile row first, then auth user
  await svc.from('profiles').delete().eq('id', user_id)

  const { error } = await svc.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
