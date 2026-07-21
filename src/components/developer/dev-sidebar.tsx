'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bus, LayoutDashboard, Map, Clock, Users, BarChart3, LogOut, Menu, X,
  Settings, UserCog, Package, BookOpen, Store, Route, UserCheck,
  MessageCircle, HeadphonesIcon, Terminal
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ADMIN_NAV = [
  { href: '/admin/corridas',     icon: Route,           label: 'Corridas' },
  { href: '/admin/choferes',     icon: UserCheck,       label: 'Choferes' },
  { href: '/admin/rutas',        icon: Map,             label: 'Rutas' },
  { href: '/admin/horarios',     icon: Clock,           label: 'Horarios' },
  { href: '/admin/buses',        icon: Bus,             label: 'Autobuses' },
  { href: '/admin/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/admin/reportes',     icon: BarChart3,       label: 'Reportes' },
  { href: '/admin/contabilidad', icon: BookOpen,        label: 'Contabilidad' },
  { href: '/admin/personal',     icon: UserCog,         label: 'Personal' },
  { href: '/admin/paquetes',     icon: Package,         label: 'Paquetes' },
  { href: '/admin/sucursales',   icon: Store,           label: 'Sucursales' },
  { href: '/admin/configuracion',icon: Settings,        label: 'Configuración' },
]

const DEV_NAV = [
  { href: '/developer/soporte', icon: HeadphonesIcon, label: 'Soporte' },
]

export function DevSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: typeof Bus; label: string }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href} onClick={() => setOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-semibold transition-all ${
          active
            ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.2)]'
            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
        }`}>
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-sm font-display">Developer</div>
            <div className="text-violet-400/70 text-[10px] tracking-widest">Tres Estrellas de Oro</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <NavItem href="/developer/dashboard" icon={LayoutDashboard} label="Dev Dashboard" />
        <div className="my-2 border-t border-white/8" />
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Panel Admin</p>
        {ADMIN_NAV.map(item => <NavItem key={item.href} {...item} />)}

        <div className="my-3 border-t border-white/8" />

        <p className="text-violet-400/70 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 flex items-center gap-1.5">
          <MessageCircle className="w-3 h-3" /> Exclusivo Developer
        </p>
        {DEV_NAV.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      <div className="p-3 border-t border-white/8 shrink-0">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-[#0a1628] border border-white/10 rounded-xl flex items-center justify-center text-white/70">
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}
      <div className={`lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 bg-[#0a1628] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#0a1628] flex-col border-r border-white/5">
        <SidebarContent />
      </div>
    </>
  )
}
