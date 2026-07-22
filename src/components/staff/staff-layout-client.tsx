'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, ClipboardList, LogOut, Bus, Menu, X, ShoppingCart, Navigation, Package, Receipt, Loader2, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { SupportWidget } from '@/components/support/support-widget'

const ALL_NAV = [
  { href: '/personal/validar',       label: 'Validar boleto',   icon: ScanLine,      perm: 'checkin' },
  { href: '/personal/venta',         label: 'Nueva venta',      icon: ShoppingCart,  perm: 'ventas' },
  { href: '/personal/reservaciones', label: 'Pasajeros de hoy', icon: ClipboardList, perm: 'checkin' },
  { href: '/personal/salidas',       label: 'Salidas',          icon: Navigation,    perm: 'checkin' },
  { href: '/personal/paquetes',      label: 'Paquetes',         icon: Package,       perm: 'paquetes' },
  { href: '/personal/gastos',        label: 'Gastos',           icon: Receipt,       perm: 'ventas' },
]

export function StaffLayoutClient({
  children,
  permisos,
}: {
  children: React.ReactNode
  permisos: string[]
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  const hasAll   = permisos.includes('all')
  const navItems = ALL_NAV.filter(item => hasAll || permisos.includes(item.perm))

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.length === 0 ? (
        <div className="px-3 py-4 text-white/30 text-xs text-center">Sin accesos asignados</div>
      ) : (
        navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={onClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active ? 'bg-[#c01515] text-white' : 'text-white/55 hover:bg-white/8 hover:text-white'
              }`}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0a1e42] min-h-screen shrink-0">
        <div className="p-5 border-b border-white/8">
          <Link href="/personal/venta">
            <Image src="/logo.png" alt="TEO" width={80} height={64} className="h-14 w-auto object-contain" />
          </Link>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Portal Personal</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLinks />
          <div className="border-t border-white/8 my-2" />
          <Link href="/personal/soporte"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname.startsWith('/personal/soporte') ? 'bg-[#c01515] text-white' : 'text-white/55 hover:bg-white/8 hover:text-white'
            }`}>
            <MessageCircle className="w-4 h-4 shrink-0" />
            Mis incidencias
          </Link>
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
            <NavLinks onClick={() => setOpen(false)} />
            <div className="border-t border-white/8 my-2" />
            <Link href="/personal/soporte" onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                pathname.startsWith('/personal/soporte') ? 'bg-[#c01515] text-white' : 'text-white/55 hover:bg-white/8 hover:text-white'
              }`}>
              <MessageCircle className="w-4 h-4 shrink-0" />
              Mis incidencias
            </Link>
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

      <SupportWidget />
    </div>
  )
}
