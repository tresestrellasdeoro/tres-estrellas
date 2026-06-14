import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverNav } from '@/components/driver/driver-nav'

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/conductor/scanner')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle() as { data: { role: string; full_name: string } | null }

  if (!profile || !['driver', 'admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <DriverNav name={profile.full_name} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
