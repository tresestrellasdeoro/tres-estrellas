'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { Menu, X, Star, LogIn, Phone, ChevronDown, Info, ShieldAlert, ShieldCheck, Package, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoNavbar } from './logo'

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f2c5c]/97 backdrop-blur-md border-b border-white/10">
      {/* Top bar */}
      <div className="hidden md:flex items-center justify-end gap-6 px-6 py-1 bg-[#0a1e42] border-b border-white/8">
        <a href="tel:+12132751402" className="flex items-center gap-1.5 text-white/55 hover:text-white text-[11px] transition-colors">
          <Phone className="w-3 h-3" /> (213) 275-1402
        </a>
        <a href="tel:+13235889188" className="flex items-center gap-1.5 text-white/55 hover:text-white text-[11px] transition-colors">
          <Phone className="w-3 h-3" /> (323) 588-9188
        </a>
        <a href="tel:+16194285512" className="flex items-center gap-1.5 text-white/55 hover:text-white text-[11px] transition-colors">
          <Phone className="w-3 h-3" /> (619) 428-5512 San Ysidro
        </a>
        <a href="tel:+526642088399" className="flex items-center gap-1.5 text-white/55 hover:text-white text-[11px] transition-colors">
          <Phone className="w-3 h-3" /> (664) 208-8399 México
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <LogoNavbar />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/" className="text-white/75 hover:text-white text-sm font-medium transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              Home
            </Link>
            <Link href="/buscar" className="text-white/75 hover:text-white text-sm font-medium transition-colors">Horarios</Link>
            <Link href="/#rutas" className="text-white/75 hover:text-white text-sm font-medium transition-colors">Rutas</Link>
            <Link href="/#terminales" className="text-white/75 hover:text-white text-sm font-medium transition-colors">Terminales</Link>
            <Link href="/#servicios" className="text-white/75 hover:text-white text-sm font-medium transition-colors">Servicios</Link>
            <Link href="/paqueteo" className="text-white/75 hover:text-white text-sm font-medium transition-colors">Paqueteo</Link>
            {/* Dropdown: Antes de viajar */}
            <div ref={infoRef} className="relative">
              <button
                onClick={() => setInfoOpen(v => !v)}
                className="flex items-center gap-1 text-white/75 hover:text-white text-sm font-medium transition-colors"
              >
                Antes de viajar
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
              </button>
              {infoOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <Link
                    href="/antes-de-viajar"
                    onClick={() => setInfoOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
                  >
                    <Info className="w-4 h-4 text-[#c01515] shrink-0" />
                    <div>
                      <p className="text-slate-800 text-sm font-semibold">Antes de viajar</p>
                      <p className="text-slate-400 text-xs">Equipaje y terminales</p>
                    </div>
                  </Link>
                  <div className="border-t border-slate-100" />
                  <Link
                    href="/restricciones"
                    onClick={() => setInfoOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
                  >
                    <ShieldAlert className="w-4 h-4 text-[#c01515] shrink-0" />
                    <div>
                      <p className="text-slate-800 text-sm font-semibold">Restricciones</p>
                      <p className="text-slate-400 text-xs">Boletos y reembolsos</p>
                    </div>
                  </Link>
                  <div className="border-t border-slate-100" />
                  <Link
                    href="/politicas"
                    onClick={() => setInfoOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#c01515] shrink-0" />
                    <div>
                      <p className="text-slate-800 text-sm font-semibold">Regulaciones y políticas</p>
                      <p className="text-slate-400 text-xs">Normas en terminales y buses</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
            <Link href="/#lealtad" className="text-white/75 hover:text-white text-sm font-medium transition-colors flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#c8a951]" />
              Puntos
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="border-white/25 text-white hover:bg-white/10 hover:text-white bg-transparent text-xs font-semibold">
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                Mi cuenta
              </Button>
            </Link>
            <Link href="/buscar">
              <Button size="sm" className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold text-xs px-5 shadow-lg">
                Comprar boleto
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white/80 hover:text-white p-1"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#0f2c5c] px-4 py-4 flex flex-col gap-3">
          <Link href="/" className="text-white/80 text-sm font-medium py-2 flex items-center gap-2" onClick={() => setOpen(false)}>
            <Home className="w-3.5 h-3.5 text-[#c8a951]" /> Home
          </Link>
          <Link href="/buscar" className="text-white/80 text-sm font-medium py-2" onClick={() => setOpen(false)}>Horarios</Link>
          <Link href="/#rutas" className="text-white/80 text-sm font-medium py-2" onClick={() => setOpen(false)}>Rutas</Link>
          <Link href="/paqueteo" className="text-white/80 text-sm font-medium py-2 flex items-center gap-2" onClick={() => setOpen(false)}>
            <Package className="w-3.5 h-3.5 text-[#c8a951]" /> Paqueteo
          </Link>
          <div className="border-t border-white/10 pt-2">
            <p className="text-white/35 text-[10px] uppercase tracking-widest font-bold mb-2">Antes de viajar</p>
            <Link href="/antes-de-viajar" className="text-white/80 text-sm font-medium py-1.5 flex items-center gap-2" onClick={() => setOpen(false)}>
              <Info className="w-3.5 h-3.5 text-[#c8a951]" /> Información general
            </Link>
            <Link href="/restricciones" className="text-white/80 text-sm font-medium py-1.5 flex items-center gap-2" onClick={() => setOpen(false)}>
              <ShieldAlert className="w-3.5 h-3.5 text-[#c8a951]" /> Restricciones
            </Link>
            <Link href="/politicas" className="text-white/80 text-sm font-medium py-1.5 flex items-center gap-2" onClick={() => setOpen(false)}>
              <ShieldCheck className="w-3.5 h-3.5 text-[#c8a951]" /> Regulaciones y políticas
            </Link>
          </div>
          <Link href="/#lealtad" className="text-white/80 text-sm font-medium py-2" onClick={() => setOpen(false)}>Puntos de lealtad</Link>
          <div className="border-t border-white/10 pt-3 space-y-2">
            <a href="tel:+12132751402" className="flex items-center gap-2 text-white/60 text-sm">
              <Phone className="w-4 h-4 text-[#c8a951]" /> (213) 275-1402
            </a>
            <a href="tel:+13235889188" className="flex items-center gap-2 text-white/60 text-sm">
              <Phone className="w-4 h-4 text-[#c8a951]" /> (323) 588-9188
            </a>
          </div>
          <div className="flex gap-2 pt-2">
            <Link href="/auth/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full border-white/25 text-white bg-transparent text-sm">Mi cuenta</Button>
            </Link>
            <Link href="/buscar" className="flex-1" onClick={() => setOpen(false)}>
              <Button className="w-full bg-[#c01515] hover:bg-[#a01010] text-white font-bold text-sm">Comprar</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
