import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { StaffLayoutClient } from '@/components/staff/staff-layout-client'

const STAFF_ROLES = ['cajero', 'admin', 'super_admin', 'developer']

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/personal/venta')

  // Use service role to bypass RLS — guarantees we always read the correct role
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await svc
    .from('profiles')
    .select('role, permisos')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string; permisos: string[] | null } | null }

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    redirect('/dashboard')
  }

  const permisos: string[] = profile.permisos ?? (profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'developer' ? ['all'] : [])

  return (
    <StaffLayoutClient permisos={permisos}>
      {children}
    </StaffLayoutClient>
  )
}
