'use client'

import { useState } from 'react'
import { Clock, Bus, Users, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BUS_ROUTES, ALL_STOPS } from '@/lib/data/bus-config'

type TripStatus = 'scheduled' | 'boarding' | 'in_transit' | 'arrived' | 'cancelled'

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled:  { label: 'Programado', color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <Clock className="w-3 h-3" /> },
  boarding:   { label: 'Abordando',  color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Users className="w-3 h-3" /> },
  in_transit: { label: 'En ruta',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Bus className="w-3 h-3" /> },
  arrived:    { label: 'Llegó',      color: 'bg-slate-100 text-slate-500 border-slate-200',      icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200',             icon: <XCircle className="w-3 h-3" /> },
}

type FilterDir = 'all' | 'LA_TO_TJ' | 'TJ_TO_LA'

export default function HorariosPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterDir, setFilterDir]       = useState<FilterDir>('all')
  const [statuses, setStatuses]         = useState<Record<string, TripStatus>>({})

  const changeDate = (delta: number) => {
    const base = parseISO(selectedDate)
    const next = delta > 0 ? addDays(base, delta) : subDays(base, Math.abs(delta))
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }

  const setStatus = (id: string, status: TripStatus) =>
    setStatuses(prev => ({ ...prev, [id]: status }))

  const filtered = BUS_ROUTES.filter(r =>
    filterDir === 'all' || r.direction === filterDir
  )

  const dateLabel = format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#d97706]" />
            Horarios y viajes
          </h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{dateLabel}</p>
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => changeDate(-1)} className="px-3 py-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm font-semibold text-slate-700 bg-transparent focus:outline-none border-x border-slate-200 cursor-pointer" />
          <button onClick={() => changeDate(1)} className="px-3 py-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex bg-slate-100 rounded-xl p-0.5">
          {([
            { id: 'all',      label: 'Todas las rutas' },
            { id: 'LA_TO_TJ', label: 'LA → Tijuana' },
            { id: 'TJ_TO_LA', label: 'Tijuana → LA' },
          ] as { id: FilterDir; label: string }[]).map(f => (
            <button key={f.id} onClick={() => setFilterDir(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterDir === f.id ? 'bg-white shadow text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Viajes programados',  value: filtered.length },
          { label: 'LA → Tijuana',        value: BUS_ROUTES.filter(r => r.direction === 'LA_TO_TJ').length },
          { label: 'Tijuana → LA',        value: BUS_ROUTES.filter(r => r.direction === 'TJ_TO_LA').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">{s.label}</p>
            <p className="font-black text-xl text-[#0a1628]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Schedule list */}
      <div className="space-y-3">
        {filtered.map(bus => {
          const status: TripStatus = statuses[bus.id] || 'scheduled'
          const cfg = STATUS_CONFIG[status]
          const origin = bus.stops[0]
          const dest   = bus.stops[bus.stops.length - 1]

          return (
            <div key={bus.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap">

                {/* Time */}
                <div className="text-center min-w-[70px]">
                  <p className="font-black text-[#0a1628] text-lg leading-none">{bus.departs}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-wide">salida</p>
                </div>

                {/* Route */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm">{bus.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {bus.stops.map(stop => (
                      <span key={stop.code} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        stop.type === 'boarding' ? 'bg-blue-50 text-blue-700' : 'bg-[rgba(240,180,41,0.1)] text-[#d97706]'
                      }`}>
                        {ALL_STOPS[stop.code]?.name} · {stop.time}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.color} shrink-0`}>
                  {cfg.icon} {cfg.label}
                </span>

                {/* Status selector */}
                <select
                  value={status}
                  onChange={e => setStatus(bus.id, e.target.value as TripStatus)}
                  className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#f0b429] cursor-pointer shrink-0"
                >
                  <option value="scheduled">Programado</option>
                  <option value="boarding">Abordando</option>
                  <option value="in_transit">En ruta</option>
                  <option value="arrived">Llegó</option>
                  <option value="cancelled">Cancelar</option>
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
