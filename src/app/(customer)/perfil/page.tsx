import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import PerfilForm from './perfil-form'
import type { Profile } from '@/lib/types/database'

export const metadata = { title: 'Mi perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <User className="w-6 h-6 text-[#d97706]" />
          Mi perfil
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gestiona tu información personal</p>
      </div>

      <PerfilForm
        userId={user.id}
        defaultName={profile?.full_name || ''}
        defaultEmail={user.email || ''}
        defaultPhone={profile?.phone || ''}
      />
    </div>
  )
}
