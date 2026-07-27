'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bus, LayoutDashboard, Map, Clock, Users, BarChart3, LogOut, Menu, X,
  Settings, UserCog, Package, BookOpen, Store, Route, UserCheck,
  MessageCircle, TrendingUp, Monitor, ChevronDown, Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupportWidget } from '@/components/support/support-widget'
import { DashboardAgent } from '@/components/dashboard/dashboard-agent'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavItem  = { href: string; icon: React.ElementType; label: string }
type NavGroup = { label: string; icon: React.ElementType; basePaths: string[]; items: NavItem[] }
type NavEntry = { type: 'item'; item: NavItem } | { type: 'group'; group: NavGroup }

const NAV: NavEntry[] = [
  {
    type: 'item',
    item: { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  },
  {
    type: 'group',
    group: {
      label: 'Flota',
      icon: Bus,
      basePaths: ['/admin/buses', '/admin/rutas', '/admin/horarios', '/admin/corridas', '/admin/choferes'],
      items: [
        { href: '/admin/buses',     icon: Bus,       label: 'Autobuses' },
        { href: '/admin/rutas',     icon: Map,        label: 'Rutas' },
        { href: '/admin/horarios',  icon: Clock,      label: 'Horarios' },
        { href: '/admin/corridas',  icon: Route,      label: 'Corridas' },
        { href: '/admin/choferes',  icon: UserCheck,  label: 'Choferes' },
      ],
    },
  },
  {
    type: 'item',
    item: { href: '/admin/clientes', icon: Users, label: 'Clientes' },
  },
  {
    type: 'item',
    item: { href: '/admin/paquetes', icon: Package, label: 'Paquetes' },
  },
  {
    type: 'group',
    group: {
      label: 'Finanzas',
      icon: BarChart3,
      basePaths: ['/admin/contabilidad', '/admin/reportes', '/admin/analitica'],
      items: [
        { href: '/admin/contabilidad', icon: BookOpen,   label: 'Contabilidad' },
        { href: '/admin/reportes',     icon: BarChart3,  label: 'Reportes' },
        { href: '/admin/analitica',    icon: TrendingUp, label: 'Analítica' },
      ],
    },
  },
  {
    type: 'group',
    group: {
      label: 'Personal',
      icon: UserCog,
      basePaths: ['/admin/personal', '/admin/terminales'],
      items: [
        { href: '/admin/personal',    icon: UserCog, label: 'Empleados' },
        { href: '/admin/terminales',  icon: Monitor, label: 'Puntos de Venta' },
      ],
    },
  },
  {
    type: 'group',
    group: {
      label: 'Configuración',
      icon: Settings,
      basePaths: ['/admin/sucursales', '/admin/configuracion'],
      items: [
        { href: '/admin/sucursales',    icon: Store,    label: 'Sucursales' },
        { href: '/admin/configuracion', icon: Settings, label: 'Configuración' },
      ],
    },
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Pre-open groups that contain the active path
  const defaultOpen = NAV
    .filter((e): e is { type: 'group'; group: NavGroup } => e.type === 'group')
    .filter(e => e.group.basePaths.some(p => pathname.startsWith(p)))
    .map(e => e.group.label)

  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpen)

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const NavLink = ({ item }: { item: NavItem; sub?: boolean }) => {
    const active = pathname.startsWith(item.href)
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          active
            ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.2)]'
            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
        }`}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    )
  }

  const NavGroupItem = ({ group }: { group: NavGroup }) => {
    const isOpen   = openGroups.includes(group.label)
    const isActive = group.basePaths.some(p => pathname.startsWith(p))
    return (
      <div>
        <button
          onClick={() => toggleGroup(group.label)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
            isActive && !isOpen
              ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.2)]'
              : 'text-white/50 hover:text-white/90 hover:bg-white/5'
          }`}
        >
          <group.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="ml-3 mt-0.5 pl-3 border-l border-white/10 space-y-0.5">
            {group.items.map(item => <NavLink key={item.href} item={item} sub />)}
          </div>
        )}
      </div>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f0b429] to-[#d97706] flex items-center justify-center">
            <Bus className="w-5 h-5 text-[#0a1628]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Admin Panel</div>
            <div className="text-[#f0b429]/50 text-[10px] tracking-widest">Tres Estrellas de Oro</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((entry, i) =>
          entry.type === 'item'
            ? <NavLink key={i} item={entry.item} />
            : <NavGroupItem key={i} group={entry.group} />
        )}
      </nav>

      <div className="px-3 pb-2 border-t border-white/8 pt-3 space-y-1">

        {/* TEOBOT AI Agent button */}
        <Link
          href="/admin/agente"
          onClick={() => setMobileOpen(false)}
          className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${
            pathname.startsWith('/admin/agente') ? 'ring-1 ring-[#c8a951]/40' : ''
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f2c5c] via-[#1a1a5e] to-[#0f2c5c] opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 rounded-xl border border-[#c8a951]/30 group-hover:border-[#c8a951]/60 transition-colors" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <div className="relative flex items-center gap-3 w-full">
            <div className="w-7 h-7 rounded-lg bg-[#c8a951]/20 border border-[#c8a951]/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#c8a951] animate-pulse" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-xs font-black tracking-wide">TEOBOT</p>
              <p className="text-[#c8a951]/60 text-[9px] font-semibold tracking-widest uppercase">Agente IA</p>
            </div>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#c8a951]/20 text-[#c8a951] border border-[#c8a951]/30 tracking-wider">AI</span>
          </div>
        </Link>

        <Link href="/admin/soporte" onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
            pathname.startsWith('/admin/soporte')
              ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.2)]'
              : 'text-white/50 hover:text-white/90 hover:bg-white/5'
          }`}>
          <MessageCircle className="w-4 h-4 shrink-0" />
          Soporte
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-xl w-full text-sm font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-[#0a1628] border border-white/10 rounded-xl flex items-center justify-center text-white/70">
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />}
      <div className={`lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 bg-[#0a1628] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#0a1628] flex-col border-r border-white/5">
        <SidebarContent />
      </div>
      <DashboardAgent />
      <SupportWidget />
    </>
  )
}
