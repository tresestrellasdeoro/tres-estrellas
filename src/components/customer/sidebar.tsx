'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bus, LayoutDashboard, Ticket, Star, User, LogOut, ChevronRight, Menu, X, Package } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

const NAV = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Inicio' },
  { href: '/mis-tickets',  icon: Ticket,           label: 'Mis boletos' },
  { href: '/puntos',       icon: Star,             label: 'Mis puntos' },
  { href: '/mis-paquetes', icon: Package,          label: 'Mis paquetes' },
  { href: '/perfil',       icon: User,             label: 'Mi perfil' },
]

const TIER_COLORS: Record<string, string> = {
  none:     'bg-slate-200 text-slate-600',
  bronze:   'bg-orange-100 text-orange-700',
  silver:   'bg-slate-200 text-slate-700',
  gold:     'bg-[rgba(240,180,41,0.15)] text-[#d97706]',
  platinum: 'bg-purple-100 text-purple-700',
}
const TIER_EMOJIS: Record<string, string> = { none: '', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }

export function CustomerSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const tier = profile?.loyalty_tier || 'none'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 p-5 border-b border-white/8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f0b429] to-[#d97706] flex items-center justify-center">
          <Bus className="w-5 h-5 text-[#0a1628]" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-white font-bold text-sm font-display">Tres Estrellas</div>
          <div className="text-[#f0b429]/50 text-[10px] tracking-widest">de Oro</div>
        </div>
      </Link>

      {/* User card */}
      {profile && (
        <div className="p-4 m-3 rounded-xl bg-white/5 border border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(240,180,41,0.2)] border border-[rgba(240,180,41,0.3)] flex items-center justify-center text-[#f0b429] font-black text-sm">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{profile.full_name}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[tier]}`}>
                {TIER_EMOJIS[tier]} {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Puntos</p>
              <p className="text-[#f0b429] font-black text-lg leading-tight">{(profile.loyalty_points || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Viajes</p>
              <p className="text-white font-black text-lg leading-tight">{profile.total_trips || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-semibold transition-all group ${
                active
                  ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.25)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/8">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-[#0a1628] border border-white/10 rounded-xl flex items-center justify-center text-white/70"
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64 bg-[#0a1628] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#0a1628] flex-col border-r border-white/5">
        <SidebarContent />
      </div>
    </>
  )
}
