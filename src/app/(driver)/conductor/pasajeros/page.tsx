'use client'

import { useState } from 'react'
import { Users, Search, CheckCircle2, Clock, QrCode, UserCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'

const DEMO_PASSENGERS = [
  { id:'1', name:'María García',    type:'adult', seat: null, checked_in: true,  checked_in_at:'09:02', price:35 },
  { id:'2', name:'Juan Hernández',  type:'adult', seat: null, checked_in: true,  checked_in_at:'09:04', price:35 },
  { id:'3', name:'Ana López',       type:'child', seat: null, checked_in: false, checked_in_at: null,   price:20 },
  { id:'4', name:'Carlos Ruiz',     type:'adult', seat: null, checked_in: false, checked_in_at: null,   price:35 },
  { id:'5', name:'Sofía Martínez',  type:'adult', seat: null, checked_in: true,  checked_in_at:'09:06', price:35 },
  { id:'6', name:'Roberto Flores',  type:'adult', seat: null, checked_in: false, checked_in_at: null,   price:35 },
  { id:'7', name:'Isabella Torres', type:'adult', seat: null, checked_in: true,  checked_in_at:'09:08', price:35 },
  { id:'8', name:'Miguel Sánchez',  type:'child', seat: null, checked_in: false, checked_in_at: null,   price:20 },
]

export default function PasajerosPage() {
  const [passengers, setPassengers] = useState(DEMO_PASSENGERS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'checked' | 'pending'>('all')

  const checkIn = (id: string) => {
    setPassengers(prev => prev.map(p => p.id === id ? {
      ...p, checked_in: true, checked_in_at: new Date().toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
    } : p))
  }

  const checkedCount = passengers.filter(p => p.checked_in).length
  const filtered = passengers
    .filter(p => filter === 'all' ? true : filter === 'checked' ? p.checked_in : !p.checked_in)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#0a1628] p-4 sm:p-6">
      <div className="max-w-xl mx-auto">

        <div className="mb-5">
          <h1 className="font-display font-black text-xl text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#f0b429]" />
            Lista de pasajeros
          </h1>
          <p className="text-white/40 text-sm mt-1">TEO-240601-0042 · LA → LTI · 09:00</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="font-black text-xl text-emerald-400">{checkedCount}</p>
            <p className="text-emerald-400/60 text-[10px] uppercase tracking-wider">Abordados</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="font-black text-xl text-amber-400">{passengers.length - checkedCount}</p>
            <p className="text-amber-400/60 text-[10px] uppercase tracking-wider">Pendientes</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="font-black text-xl text-white">{passengers.length}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Total</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-5 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#f0b429] rounded-full transition-all" style={{ width: `${(checkedCount/passengers.length)*100}%` }} />
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pasajero..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20" />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 shrink-0">
            {[{ k:'all', l:'Todos' }, { k:'checked', l:'✓' }, { k:'pending', l:'⏳' }].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.k ? 'bg-[#f0b429] text-[#0a1628]' : 'text-white/40 hover:text-white/70'}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Passengers list */}
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              p.checked_in ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-white/4 border-white/8 hover:bg-white/6'
            }`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${
                p.checked_in ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'
              }`}>
                {p.checked_in ? <CheckCircle2 className="w-5 h-5" /> : p.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${p.checked_in ? 'text-white/80' : 'text-white'}`}>{p.name}</p>
                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${p.type === 'adult' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {p.type === 'adult' ? 'Adulto' : 'Menor'}
                  </span>
                  {p.checked_in && p.checked_in_at && (
                    <span className="text-emerald-400/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p.checked_in_at}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-white/40 text-xs">${p.price}</p>
                {!p.checked_in && (
                  <button onClick={() => checkIn(p.id)}
                    className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#f0b429] hover:text-[#d97706] transition-colors">
                    <UserCheck className="w-3.5 h-3.5" />
                    Check-in
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  )
}
