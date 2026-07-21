import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { DevSidebar } from '@/components/developer/dev-sidebar'

export default async function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/developer/dashboard')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  if (profile?.role !== 'developer') {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DevSidebar />
      <main className="flex-1 ml-0 lg:ml-64 min-h-screen">{children}</main>
    </div>
  )
}
