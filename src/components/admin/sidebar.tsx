'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bus, LayoutDashboard, Map, Clock, Users, BarChart3, LogOut, Menu, X, Settings, UserCog, Package, BookOpen, Store, Route, UserCheck, MessageCircle, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupportWidget } from '@/components/support/support-widget'

const NAV = [
  { href: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/corridas',     icon: Route,           label: 'Corridas' },
  { href: '/admin/choferes',     icon: UserCheck,       label: 'Choferes' },
  { href: '/admin/rutas',        icon: Map,             label: 'Rutas' },
  { href: '/admin/horarios',     icon: Clock,           label: 'Horarios' },
  { href: '/admin/buses',        icon: Bus,             label: 'Autobuses' },
  { href: '/admin/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/admin/reportes',     icon: BarChart3,       label: 'Reportes' },
  { href: '/admin/analitica',    icon: TrendingUp,      label: 'Analítica' },
  { href: '/admin/contabilidad', icon: BookOpen,        label: 'Contabilidad' },
  { href: '/admin/personal',     icon: UserCog,         label: 'Personal' },
  { href: '/admin/paquetes',     icon: Package,         label: 'Paquetes' },
  { href: '/admin/sucursales',   icon: Store,           label: 'Sucursales' },
  { href: '/admin/configuracion',icon: Settings,        label: 'Configuración' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f0b429] to-[#d97706] flex items-center justify-center">
            <Bus className="w-5 h-5 text-[#0a1628]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-sm font-display">Admin Panel</div>
            <div className="text-[#f0b429]/50 text-[10px] tracking-widest">Tres Estrellas de Oro</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Gestión</p>
        {NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-semibold transition-all ${
                active
                  ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.2)]'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              }`}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-2 border-t border-white/8 pt-3">
        <Link href="/admin/soporte" onClick={() => setOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            pathname.startsWith('/admin/soporte')
              ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.2)]'
              : 'text-white/50 hover:text-white/90 hover:bg-white/5'
          }`}>
          <MessageCircle className="w-4 h-4 shrink-0" />
          Soporte
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all mt-1">
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
      <SupportWidget />
    </>
  )
}
