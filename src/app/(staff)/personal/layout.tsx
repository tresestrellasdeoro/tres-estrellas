'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, Users, ClipboardList, LogOut, Bus, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const NAV_CAJERO = [
  { href: '/personal/validar',       label: 'Validar boleto',    icon: ScanLine },
  { href: '/personal/reservaciones', label: 'Reservaciones',     icon: ClipboardList },
]

const NAV_BUSERO = [
  { href: '/personal/validar',   label: 'Validar boleto', icon: ScanLine },
  { href: '/personal/pasajeros', label: 'Pasajeros',      icon: Users },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  const navItems = NAV_CAJERO

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0a1e42] min-h-screen shrink-0">
        <div className="p-5 border-b border-white/8">
          <Link href="/personal/validar">
            <Image src="/logo.png" alt="TEO" width={80} height={64} className="h-14 w-auto object-contain" />
          </Link>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Portal Personal</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'bg-[#c01515] text-white' : 'text-white/55 hover:bg-white/8 hover:text-white'
                }`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/8">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 text-sm font-semibold transition-all">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a1e42] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="w-5 h-5 text-[#c8a951]" />
          <span className="text-white font-bold text-sm">Portal Personal</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white/70">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0a1e42] pt-14">
          <nav className="p-4 space-y-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  pathname === item.href ? 'bg-[#c01515] text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-white text-sm font-semibold">
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:pt-0 pt-14 overflow-auto">
        {children}
      </main>
    </div>
  )
}
