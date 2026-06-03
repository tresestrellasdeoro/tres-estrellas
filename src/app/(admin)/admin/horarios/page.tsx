'use client'

import { useState } from 'react'
import { Clock, Plus, Calendar, Bus, Users, CheckCircle2, XCircle, AlertTriangle, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const DEPARTURE_TIMES = ['07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00','22:00','23:00']
const ROUTES_DEMO = ['LA-LTI', 'LA-ATI', 'LA-CAT']
const BUSES_DEMO  = ['CA-TEO-001', 'CA-TEO-002', 'CA-TEO-003']

function randomSeats(total = 55) {
  return Math.floor(Math.random() * total)
}

type TripStatus = 'scheduled' | 'boarding' | 'in_transit' | 'arrived' | 'cancelled'

interface Trip {
  id: string
  route: string
  time: string
  bus: string
  sold: number
  total: number
  status: TripStatus
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled:  { label: 'Programado',  color: 'bg-blue-50 text-blue-700 border-blue-200',    icon: <Clock className="w-3 h-3" /> },
  boarding:   { label: 'Abordando',   color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Users className="w-3 h-3" /> },
  in_transit: { label: 'En ruta',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Bus className="w-3 h-3" /> },
  arrived:    { label: 'Llegó',       color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: 'Cancelado',   color: 'bg-red-50 text-red-600 border-red-200',        icon: <XCircle className="w-3 h-3" /> },
}

function buildTrips(date: string): Trip[] {
  const trips: Trip[] = []
  DEPARTURE_TIMES.forEach((time, i) => {
    ROUTES_DEMO.forEach((route, j) => {
      const sold = randomSeats()
      trips.push({
        id: `${date}-${i}-${j}`,
        route,
        time,
        bus: BUSES_DEMO[j],
        sold,
        total: 55,
        status: 'scheduled',
      })
    })
  })
  return trips
}

export default function HorariosPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [trips, setTrips]   = useState<Trip[]>(() => buildTrips(format(new Date(), 'yyyy-MM-dd')))
  const [filterRoute, setFilterRoute] = useState('all')
  const [open, setOpen]     = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)

  const changeDate = (delta: number) => {
    const d = format(delta > 0 ? addDays(parseISO(selectedDate), delta) : subDays(parseISO(selectedDate), Math.abs(delta)), 'yyyy-MM-dd')
    setSelectedDate(d)
    setTrips(buildTrips(d))
  }

  const updateStatus = (id: string, status: TripStatus) =>
    setTrips(prev => prev.map(t => t.id === id ? { ...t, status } : t))

  const filtered = trips.filter(t => filterRoute === 'all' || t.route === filterRoute)
  const grouped  = DEPARTURE_TIMES.reduce<Record<string, Trip[]>>((acc, time) => {
    acc[time] = filtered.filter(t => t.time === time)
    return acc
  }, {})

  const dateLabel = format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })

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
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setTrips(buildTrips(e.target.value)) }}
            className="px-3 py-2 text-sm font-semibold text-slate-700 bg-transparent focus:outline-none border-x border-slate-200 cursor-pointer" />
          <button onClick={() => changeDate(1)} className="px-3 py-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex bg-slate-100 rounded-xl p-0.5 overflow-x-auto">
          {['all', ...ROUTES_DEMO].map(r => (
            <button key={r} onClick={() => setFilterRoute(r)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRoute === r ? 'bg-white shadow text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
              {r === 'all' ? 'Todas las rutas' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Stats mini */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Viajes totales',   value: String(filtered.length), color: 'text-[#0a1628]' },
          { label: 'Pasajeros totales',value: String(filtered.reduce((s,t) => s + t.sold, 0)), color: 'text-blue-700' },
          { label: 'Capacidad usada',  value: Math.round((filtered.reduce((s,t)=>s+t.sold,0) / (filtered.length*55||1))*100) + '%', color: 'text-emerald-700' },
          { label: 'Disponibles',      value: String(filtered.reduce((s,t)=>s+(t.total-t.sold),0)), color: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">{s.label}</p>
            <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="space-y-4">
        {DEPARTURE_TIMES.map(time => {
          const timeTrips = grouped[time] || []
          if (timeTrips.length === 0) return null
          return (
            <div key={time} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-14 text-center">
                  <p className="font-black text-[#0a1628] text-lg leading-none">{time}</p>
                </div>
                <span className="text-slate-400 text-xs">{timeTrips.length} {timeTrips.length === 1 ? 'salida' : 'salidas'}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {timeTrips.map(trip => {
                  const pct = Math.round((trip.sold / trip.total) * 100)
                  const cfg = STATUS_CONFIG[trip.status]
                  return (
                    <div key={trip.id} className="px-5 py-3.5 flex items-center gap-4 flex-wrap">
                      <div className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-20 text-center shrink-0">{trip.route}</div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                        <Bus className="w-3.5 h-3.5 text-[#d97706]" />
                        {trip.bus}
                      </div>

                      <div className="flex-1 min-w-[120px]">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{trip.sold}/{trip.total} pasajeros</span>
                          <span className={pct >= 90 ? 'text-red-500 font-bold' : pct >= 70 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-[#f0b429]'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.color} shrink-0`}>
                        {cfg.icon} {cfg.label}
                      </span>

                      <select value={trip.status} onChange={e => updateStatus(trip.id, e.target.value as TripStatus)}
                        className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#f0b429] cursor-pointer">
                        <option value="scheduled">Programado</option>
                        <option value="boarding">Abordando</option>
                        <option value="in_transit">En ruta</option>
                        <option value="arrived">Llegó</option>
                        <option value="cancelled">Cancelar</option>
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
