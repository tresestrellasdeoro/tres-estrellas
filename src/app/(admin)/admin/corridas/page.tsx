'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Route, Loader2, RefreshCw, Bus, UserCheck, Users,
  TrendingUp, ChevronDown, ChevronUp, AlertCircle,
  Calendar, Clock, Percent,
} from 'lucide-react'

interface Corrida {
  id:               string
  trip_number:      string
  departure_date:   string
  departure_time:   string
  estimated_arrival:string | null
  status:           string
  seats_total:      number
  route:            { code: string; name: string; origin_stop: { name: string }; destination_stop: { name: string } } | null
  bus:              { id: string; plate: string; brand: string; model: string; capacity: number } | null
  driver:           { id: string; name: string; phone: string | null } | null
  passengers:       number
  promo_count:      number
  revenue:          number
  occupancy_pct:    number
}

interface BusOption    { id: string; plate: string; brand: string; model: string; capacity: number }
interface DriverOption { id: string; name: string; phone: string | null }

function OccBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-slate-400'}`}>{pct}%</span>
    </div>
  )
}

export default function CorridasPage() {
  const [corridas,  setCorridas]  = useState<Corrida[]>([])
  const [buses,     setBuses]     = useState<BusOption[]>([])
  const [drivers,   setDrivers]   = useState<DriverOption[]>([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [toast,     setToast]     = useState('')

  // Filters
  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
  })
  const [to,   setTo]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [corRes, busRes, drRes] = await Promise.all([
      fetch(`/api/admin/corridas?from=${from}&to=${to}&limit=300`),
      fetch('/api/admin/buses'),
      fetch('/api/admin/drivers'),
    ])
    const [corData, busData, drData] = await Promise.all([corRes.json(), busRes.json(), drRes.json()])
    setCorridas(corData.corridas ?? [])
    setBuses(busData.buses ?? [])
    setDrivers(drData.drivers ?? [])
    setLoading(false)
  }, [from, to])

  useEffect(() => { fetchAll() }, [fetchAll])

  const assign = async (id: string, field: 'bus_id' | 'driver_id', value: string) => {
    setAssigning(id + field)
    const res = await fetch('/api/admin/corridas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value || null }),
    })
    if (res.ok) {
      setToast('Guardado')
      setTimeout(() => setToast(''), 2000)
      fetchAll()
    }
    setAssigning(null)
  }

  // Totals
  const totalPax = corridas.reduce((s, c) => s + c.passengers, 0)
  const totalRev = corridas.reduce((s, c) => s + c.revenue, 0)
  const avgOcc   = corridas.length > 0 ? Math.round(corridas.reduce((s, c) => s + c.occupancy_pct, 0) / corridas.length) : 0

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Route className="w-6 h-6 text-[#c01515]" />
            Corridas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Salidas programadas — asigna bus y chofer</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* Date filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20" />
          </div>
          <button onClick={() => { setFrom(today); setTo(today) }}
            className="text-xs font-bold text-[#c01515] hover:underline">Hoy</button>
          <button onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 7)
            setFrom(d.toISOString().split('T')[0]); setTo(new Date(Date.now() + 7*86400000).toISOString().split('T')[0])
          }} className="text-xs font-bold text-slate-500 hover:underline">±7 días</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Corridas',    value: corridas.length,                  sub: 'en el rango',          icon: Route,    color: 'blue' },
          { label: 'Pasajeros',   value: totalPax,                         sub: 'total vendidos',        icon: Users,    color: 'emerald' },
          { label: 'Ocupación',   value: avgOcc + '%',                     sub: 'promedio',              icon: Percent,  color: 'amber' },
          { label: 'Ingresos',    value: '$'+totalRev.toLocaleString('en-US', {minimumFractionDigits:2}), sub: 'total corridas', icon: TrendingUp, color: 'green' },
        ].map(c => {
          const Icon = c.icon
          const colors: Record<string, string> = {
            blue: 'bg-blue-50 border-blue-200 text-blue-700',
            emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            amber: 'bg-amber-50 border-amber-200 text-amber-700',
            green: 'bg-green-50 border-green-200 text-green-700',
          }
          return (
            <div key={c.label} className={`rounded-2xl p-4 border ${colors[c.color]}`}>
              <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" /><p className="text-xs font-bold uppercase tracking-wider">{c.label}</p></div>
              <p className="text-2xl font-black">{c.value}</p>
              <p className="text-xs mt-0.5 opacity-60">{c.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : corridas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay corridas en este rango</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha / Hora</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Bus</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Chofer</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Pasajeros</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Ocupación</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {corridas.map(c => {
                const isExp = expanded === c.id
                const isToday = c.departure_date === today
                return (
                  <>
                    <tr key={c.id} className={`transition-colors ${isToday ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isToday && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />}
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{c.departure_date}</p>
                            <p className="text-slate-500 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />{c.departure_time?.slice(0,5)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.route
                          ? <div>
                              <p className="font-bold text-slate-700 text-xs">{c.route.origin_stop.name}</p>
                              <p className="text-slate-400 text-xs">→ {c.route.destination_stop.name}</p>
                            </div>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>

                      {/* Bus selector */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <select
                            value={c.bus?.id ?? ''}
                            onChange={e => assign(c.id, 'bus_id', e.target.value)}
                            disabled={assigning === c.id + 'bus_id'}
                            className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer max-w-[110px] truncate">
                            <option value="">Sin asignar</option>
                            {buses.map(b => <option key={b.id} value={b.id}>{b.plate}</option>)}
                          </select>
                        </div>
                      </td>

                      {/* Driver selector */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <select
                            value={c.driver?.id ?? ''}
                            onChange={e => assign(c.id, 'driver_id', e.target.value)}
                            disabled={assigning === c.id + 'driver_id'}
                            className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer max-w-[120px] truncate">
                            <option value="">Sin asignar</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-slate-700">{c.passengers}</span>
                        <span className="text-slate-400 text-xs">/{c.seats_total || '—'}</span>
                        {c.promo_count > 0 && (
                          <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded-full">{c.promo_count}P</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <OccBar pct={c.occupancy_pct} />
                      </td>

                      <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                        ${c.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(isExp ? null : c.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors">
                          {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isExp && (
                      <tr key={c.id + '-detail'}>
                        <td colSpan={8} className="px-4 pb-4 bg-slate-50/80">
                          <div className="pt-3 grid grid-cols-3 gap-4 text-xs">
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Corrida</p>
                              <p className="font-mono text-slate-700">{c.trip_number}</p>
                              <p className="text-slate-400 mt-1 capitalize">{c.status}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Desglose pasajeros</p>
                              <p className="text-slate-700">Regulares: <strong>{c.passengers - c.promo_count}</strong></p>
                              <p className="text-amber-600">Promo: <strong>{c.promo_count}</strong></p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                              <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Bus asignado</p>
                              {c.bus
                                ? <><p className="text-slate-700 font-bold">{c.bus.plate}</p><p className="text-slate-400">{c.bus.brand} {c.bus.model}</p></>
                                : <p className="text-slate-300 italic">Sin bus asignado</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
