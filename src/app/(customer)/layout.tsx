import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerSidebar } from '@/components/customer/sidebar'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <CustomerSidebar profile={profile} />
      <main className="flex-1 ml-0 lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
