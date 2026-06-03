'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bus, QrCode, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DriverNav({ name }: { name: string }) {
  const pathname = usePathname()
  const router   = useRouter()

  const logout = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className="bg-[#0a1628] border-b border-white/8 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f0b429] to-[#d97706] flex items-center justify-center">
          <Bus className="w-4 h-4 text-[#0a1628]" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-white font-bold text-xs font-display">Conductor</p>
          <p className="text-white/40 text-[10px]">{name}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Link href="/conductor/scanner"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${pathname.includes('scanner') ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
          <QrCode className="w-4 h-4" />
          Scanner
        </Link>
        <Link href="/conductor/pasajeros"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${pathname.includes('pasajeros') ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
          <Users className="w-4 h-4" />
          Pasajeros
        </Link>
        <button onClick={logout} className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}
