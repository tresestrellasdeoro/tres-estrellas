'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MapPin, Calendar, Users, ArrowLeftRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

const STOPS = [
  { value: 'LA',  label: 'Los Angeles' },
  { value: 'HP',  label: 'Huntington Park' },
  { value: 'SYS', label: 'San Ysidro' },
  { value: 'TIJ', label: 'Aeropuerto Tijuana' },
  { value: 'OTY', label: 'Garita de Otay — Tijuana' },
]

export function SearchForm() {
  const router = useRouter()
  const params = useSearchParams()

  const [origin, setOrigin]           = useState(params.get('origin') || 'LA')
  const [destination, setDestination] = useState(params.get('destination') || 'OTY')
  const [date, setDate]               = useState(params.get('date') || format(new Date(), 'yyyy-MM-dd'))
  const [passengers, setPassengers]   = useState(Number(params.get('passengers')) || 1)
  const [tripType, setTripType]       = useState(params.get('tripType') || 'one_way')

  const today = format(new Date(), 'yyyy-MM-dd')

  const search = () => {
    const p = new URLSearchParams({ origin, destination, date, passengers: String(passengers), tripType })
    router.push(`/buscar?${p.toString()}`)
  }

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <div className="bg-white border-t border-[#cc1a1a]/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Origin */}
          <div className="min-w-[170px] flex-1">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3 h-3 text-[#c01515]" /> Origen
            </label>
            <div className="relative">
              <select value={origin} onChange={e => setOrigin(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] pr-7 cursor-pointer">
                {STOPS.filter(s => s.value !== destination).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▾</span>
            </div>
          </div>

          {/* Swap */}
          <button onClick={swap} className="mb-0.5 w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-[#c01515]/30 flex items-center justify-center transition-all">
            <ArrowLeftRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Destination */}
          <div className="min-w-[170px] flex-1">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3 h-3 text-[#c01515]" /> Destino
            </label>
            <div className="relative">
              <select value={destination} onChange={e => setDestination(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] pr-7 cursor-pointer">
                {STOPS.filter(s => s.value !== origin).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▾</span>
            </div>
          </div>

          {/* Date */}
          <div className="min-w-[140px]">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3 h-3 text-[#c01515]" /> Fecha
            </label>
            <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] cursor-pointer" />
          </div>

          {/* Passengers */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <Users className="w-3 h-3 text-[#c01515]" /> Pasajeros
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden w-28">
              <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-base leading-none">−</button>
              <span className="flex-1 text-center text-sm font-bold text-slate-800">{passengers}</span>
              <button onClick={() => setPassengers(Math.min(10, passengers + 1))} className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-base leading-none">+</button>
            </div>
          </div>

          {/* Trip type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
            <div className="flex bg-slate-100 rounded-xl p-0.5">
              {[{ v: 'one_way', l: 'Solo ida' }, { v: 'round_trip', l: 'Ida y vuelta' }].map(t => (
                <button key={t.v} onClick={() => setTripType(t.v)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tripType === t.v ? 'bg-[#c01515] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Search button */}
          <Button onClick={search} className="bg-[#c01515] hover:bg-[#a01010] text-white font-black h-10 px-6 rounded-xl text-sm">
            <Search className="w-4 h-4 mr-1.5" />
            Buscar
          </Button>
        </div>
      </div>
    </div>
  )
}
