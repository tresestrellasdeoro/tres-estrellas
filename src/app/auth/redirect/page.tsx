import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Server component: runs on the server with full cookie access.
// Reads the role via service role (bypasses all RLS) and redirects correctly.
export default async function AuthRedirectPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  const role = profile?.role ?? null
  const { next } = await searchParams

  if (role === 'cajero' || role === 'driver') {
    redirect('/personal/validar')
  } else if (role === 'admin' || role === 'super_admin') {
    redirect('/admin/dashboard')
  } else if (role === 'developer') {
    redirect('/developer/dashboard')
  } else {
    redirect(next || '/dashboard')
  }
}
