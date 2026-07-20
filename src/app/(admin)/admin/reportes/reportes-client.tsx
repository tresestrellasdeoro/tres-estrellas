'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, DollarSign, Ticket, TrendingUp, TrendingDown,
  Store, Users, ClipboardCheck, CheckCircle2, XCircle, Loader2,
  Bus, Route, Percent, Calendar, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReportesData, MonthData } from './page'

const PERIOD_MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1a': 12 }
const TABS = [
  { id: 'general',    label: 'General',       icon: BarChart3 },
  { id: 'sucursales', label: 'Por Sucursal',   icon: Store },
  { id: 'empleados',  label: 'Por Empleado',   icon: Users },
  { id: 'ocupacion',  label: 'Ocupación',      icon: Percent },
  { id: 'autobuses',  label: 'Por Autobus',    icon: Bus },
  { id: 'rutas',      label: 'Por Ruta',       icon: Route },
  { id: 'cajeros',    label: 'Por Cajero',     icon: UserCheck },
  { id: 'cierres',    label: 'Cierres',        icon: ClipboardCheck },
]

// ── OccBar shared component ───────────────────────────────────────────────────
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

// ── Date range helper ─────────────────────────────────────────────────────────
function defaultFrom(daysBack: number) {
  const d = new Date(); d.setDate(d.getDate() - daysBack); return d.toISOString().split('T')[0]
}
function todayStr() { return new Date().toISOString().split('T')[0] }

// ── Types ─────────────────────────────────────────────────────────────────────
interface Corrida {
  id: string; trip_number: string; departure_date: string; departure_time: string
  status: string; seats_total: number
  route: { code: string; name: string; origin_stop: { name: string }; destination_stop: { name: string } } | null
  bus:   { id: string; plate: string; brand: string; model: string; capacity: number } | null
  driver:{ id: string; name: string } | null
  passengers: number; promo_count: number; revenue: number; occupancy_pct: number
}
interface Cajero { user_id: string; name: string; sucursal: string; bookings: number; revenue: number }

export default function ReportesClient({ data }: { data: ReportesData }) {
  const [tab,    setTab]    = useState('general')
  const [period, setPeriod] = useState('6m')

  // Cierre state
  const [cierreModal, setCierreModal] = useState(false)
  const [ciSucursal,  setCiSucursal]  = useState('')
  const [ciNotas,     setCiNotas]     = useState('')
  const [ciLoading,   setCiLoading]   = useState(false)
  const [cierreToast, setCierreToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null)
  const [cierres,     setCierres]     = useState(data.cierres)

  // Dynamic tabs shared date filter
  const [dynFrom, setDynFrom] = useState(() => defaultFrom(30))
  const [dynTo,   setDynTo]   = useState(todayStr)

  // Corridas data (shared for ocupacion/autobuses/rutas tabs)
  const [corridas,       setCorridas]       = useState<Corrida[]>([])
  const [corridasLoading,setCorridasLoading]= useState(false)
  const [corridasLoaded, setCorridasLoaded] = useState(false)

  // Cajeros data
  const [cajeros,       setCajeros]       = useState<Cajero[]>([])
  const [cajerosLoading,setCajerosLoading]= useState(false)
  const [cajerosLoaded, setCajerosLoaded] = useState(false)

  const monthsToShow   = PERIOD_MONTHS[period] ?? 6
  const visibleMonths: MonthData[] = data.monthlyData.slice(-monthsToShow)
  const periodRevenue  = visibleMonths.reduce((s, d) => s + d.revenue, 0)
  const periodBookings = visibleMonths.reduce((s, d) => s + d.bookings, 0)
  const periodAvg      = visibleMonths.length > 0 ? Math.round(periodRevenue / visibleMonths.length) : 0
  const maxRevenue     = Math.max(...visibleMonths.map(d => d.revenue), 1)
  const prevMonths     = data.monthlyData.slice(-(monthsToShow * 2), -monthsToShow)
  const prevRevenue    = prevMonths.reduce((s, d) => s + d.revenue, 0)
  const revTrendPct    = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : 0

  const fetchCorridas = useCallback(async () => {
    setCorridasLoading(true)
    const res  = await fetch(`/api/admin/corridas?from=${dynFrom}&to=${dynTo}&limit=500`)
    const json = await res.json()
    setCorridas(json.corridas ?? [])
    setCorridasLoaded(true)
    setCorridasLoading(false)
  }, [dynFrom, dynTo])

  const fetchCajeros = useCallback(async () => {
    setCajerosLoading(true)
    const res  = await fetch(`/api/admin/reportes/cajeros?from=${dynFrom}&to=${dynTo}`)
    const json = await res.json()
    setCajeros(json.cajeros ?? [])
    setCajerosLoaded(true)
    setCajerosLoading(false)
  }, [dynFrom, dynTo])

  // Load data when switching to a dynamic tab
  useEffect(() => {
    if (['ocupacion','autobuses','rutas'].includes(tab)) {
      setCorridasLoaded(false)
      fetchCorridas()
    }
    if (tab === 'cajeros') {
      setCajerosLoaded(false)
      fetchCajeros()
    }
  }, [tab, fetchCorridas, fetchCajeros])

  // Derived aggregations from corridas
  const busMap = new Map<string, { plate: string; brand: string; model: string; trips: number; passengers: number; revenue: number; occ_sum: number }>()
  const routeMap = new Map<string, { code: string; name: string; origin: string; dest: string; trips: number; passengers: number; revenue: number }>()
  for (const c of corridas) {
    if (c.bus) {
      const key = c.bus.id
      if (!busMap.has(key)) busMap.set(key, { plate: c.bus.plate, brand: c.bus.brand, model: c.bus.model, trips: 0, passengers: 0, revenue: 0, occ_sum: 0 })
      const b = busMap.get(key)!
      b.trips++; b.passengers += c.passengers; b.revenue += c.revenue; b.occ_sum += c.occupancy_pct
    }
    if (c.route) {
      const key = c.route.code
      if (!routeMap.has(key)) routeMap.set(key, { code: c.route.code, name: c.route.name, origin: c.route.origin_stop.name, dest: c.route.destination_stop.name, trips: 0, passengers: 0, revenue: 0 })
      const r = routeMap.get(key)!
      r.trips++; r.passengers += c.passengers; r.revenue += c.revenue
    }
  }
  const busList   = Array.from(busMap.entries()).map(([, v]) => ({ ...v, avg_occ: v.trips > 0 ? Math.round(v.occ_sum / v.trips) : 0 })).sort((a, b) => b.revenue - a.revenue)
  const routeList = Array.from(routeMap.values()).sort((a, b) => b.revenue - a.revenue)

  const handleCierre = async () => {
    if (!ciSucursal) return
    setCiLoading(true)
    try {
      const res  = await fetch('/api/admin/cierres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursal_id: ciSucursal, notas: ciNotas || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCierreToast({ type: 'success', msg: `Cierre generado${json.cierre?.qb_synced ? ' y enviado a QuickBooks ✓' : ' (QB no conectado — sin sincronizar)'}` })
      setCierres(prev => [json.cierre, ...prev])
      setCierreModal(false)
      setCiNotas('')
      setTimeout(() => setCierreToast(null), 5000)
    } catch (e: any) {
      setCierreToast({ type: 'error', msg: e.message })
    } finally {
      setCiLoading(false)
    }
  }

  // ── Date range bar (shared for dynamic tabs) ──────────────────────────────
  const DynDateBar = ({ onSearch }: { onSearch: () => void }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desde</label>
          <input type="date" value={dynFrom} onChange={e => setDynFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasta</label>
          <input type="date" value={dynTo} onChange={e => setDynTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20" />
        </div>
        <button onClick={onSearch}
          className="px-3 py-1.5 rounded-lg bg-[#c01515] text-white text-xs font-bold hover:bg-[#a01010] transition-colors">
          Buscar
        </button>
        <button onClick={() => { setDynFrom(defaultFrom(30)); setDynTo(todayStr()) }}
          className="text-xs font-bold text-slate-400 hover:text-slate-600">Últimos 30 días</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#d97706]" />
            Reportes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Ventas, sucursales, corridas y cierres de turno</p>
        </div>
        <Button onClick={() => setCierreModal(true)}
          className="bg-[#0a1e42] hover:bg-[#0d2654] text-white font-bold rounded-xl">
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Cerrar Turno
        </Button>
      </div>

      {/* Toast */}
      {cierreToast && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold border ${
          cierreToast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {cierreToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {cierreToast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t.id ? 'bg-white shadow text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <>
          <div className="flex justify-end mb-4">
            <div className="flex bg-slate-100 rounded-xl p-0.5">
              {(['1m','3m','6m','1a'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p ? 'bg-white shadow text-[#0a1628]' : 'text-slate-500'
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Ingresos totales',  value: `$${periodRevenue.toLocaleString('es-MX')}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', trend: revTrendPct !== 0 ? `${revTrendPct > 0 ? '+' : ''}${revTrendPct}%` : '—', up: revTrendPct >= 0 },
              { label: 'Reservaciones',      value: periodBookings.toLocaleString('es-MX'),       icon: Ticket,     color: 'bg-blue-50 text-blue-600',     trend: '—', up: true },
              { label: 'Promedio mensual',   value: `$${periodAvg.toLocaleString('es-MX')}`,      icon: BarChart3,  color: 'bg-purple-50 text-purple-600', trend: '—', up: true },
              { label: 'Sucursales activas', value: String(data.sucursalStats.length),            icon: Store,      color: 'bg-amber-50 text-amber-600',   trend: '—', up: true },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kpi.trend !== '—' && (kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                    {kpi.trend}
                  </span>
                </div>
                <p className="font-black text-2xl text-[#0a1628]">{kpi.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-6">Ingresos mensuales</h2>
              {visibleMonths.every(d => d.revenue === 0) ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300">
                  <BarChart3 className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">Sin datos para este período</p>
                </div>
              ) : (
                <div className="flex items-end gap-3 h-48">
                  {visibleMonths.map(d => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">
                        {d.revenue >= 1000 ? `$${(d.revenue/1000).toFixed(0)}k` : `$${d.revenue}`}
                      </span>
                      <div className="w-full relative group">
                        <div className="w-full rounded-t-lg bg-gradient-to-t from-[#f0b429] to-[#fcd34d] hover:from-[#d97706] hover:to-[#f0b429] transition-all"
                          style={{ height: `${Math.max((d.revenue/maxRevenue)*160, d.revenue > 0 ? 4 : 0)}px` }} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0a1628] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                          {d.bookings} reservaciones
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{d.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-6">Métodos de pago</h2>
              {data.paymentStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <p className="text-sm font-medium">Sin datos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.paymentStats.map(p => (
                    <div key={p.method}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 font-medium">{p.method}</span>
                        <span className="font-bold text-slate-800">{p.pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.count} reservaciones</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── POR SUCURSAL ── */}
      {tab === 'sucursales' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Ventas por sucursal — últimos 6 meses</h2>
          </div>
          {data.sucursalStats.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Store className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p>No hay ventas con sucursal asignada aún.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Boletos</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Participación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.sucursalStats.map(s => {
                  const pct = data.totalRevenue > 0 ? Math.round((s.revenue / data.totalRevenue) * 100) : 0
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{s.code}</span>
                          <span className="font-semibold text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">{s.bookings}</td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">${s.revenue.toLocaleString('es-MX')}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#f0b429] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-500 text-xs font-bold">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── POR EMPLEADO ── */}
      {tab === 'empleados' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Ventas por empleado — últimos 6 meses</h2>
          </div>
          {data.empleadoStats.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p>No hay ventas con empleado registrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Empleado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Boletos</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.empleadoStats.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                          {e.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{e.sucursal}</td>
                    <td className="px-5 py-4 text-right text-slate-600">{e.bookings}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">${e.revenue.toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── OCUPACIÓN POR CORRIDA ── */}
      {tab === 'ocupacion' && (
        <>
          <DynDateBar onSearch={fetchCorridas} />
          {corridasLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Corridas',  value: corridas.length,                                                                          color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { label: 'Pasajeros', value: corridas.reduce((s, c) => s + c.passengers, 0),                                           color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { label: 'Ocupación promedio', value: corridas.length > 0 ? Math.round(corridas.reduce((s,c) => s+c.occupancy_pct,0)/corridas.length)+'%' : '—', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                ].map(c => (
                  <div key={c.label} className={`rounded-2xl p-4 border ${c.color}`}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">{c.label}</p>
                    <p className="text-2xl font-black">{c.value}</p>
                  </div>
                ))}
              </div>

              {corridas.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Percent className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No hay corridas en este rango</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Bus</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Asientos</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Vendidos</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Ocupación</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {corridas.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 text-xs">{c.departure_date}</p>
                            <p className="text-slate-400 text-xs">{c.departure_time?.slice(0,5)}</p>
                          </td>
                          <td className="px-4 py-3">
                            {c.route
                              ? <span className="text-xs text-slate-700">{c.route.origin_stop.name} → {c.route.destination_stop.name}</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{c.bus?.plate ?? '—'}</td>
                          <td className="px-4 py-3 text-center text-slate-500 text-xs">{c.seats_total || '—'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700 text-xs">{c.passengers}</td>
                          <td className="px-4 py-3"><OccBar pct={c.occupancy_pct} /></td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 text-xs">${c.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── POR AUTOBUS ── */}
      {tab === 'autobuses' && (
        <>
          <DynDateBar onSearch={fetchCorridas} />
          {corridasLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : busList.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bus className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sin corridas con bus asignado en este rango</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Operación por autobus — {dynFrom} a {dynTo}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Autobus</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Corridas</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Pasajeros</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Ocup. Prom.</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {busList.map(b => (
                    <tr key={b.plate} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{b.plate}</p>
                        <p className="text-xs text-slate-400">{b.brand} {b.model}</p>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">{b.trips}</td>
                      <td className="px-5 py-4 text-right text-slate-700 font-semibold">{b.passengers}</td>
                      <td className="px-5 py-4"><OccBar pct={b.avg_occ} /></td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">${b.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── POR RUTA ── */}
      {tab === 'rutas' && (
        <>
          <DynDateBar onSearch={fetchCorridas} />
          {corridasLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : routeList.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sin corridas en este rango</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Ingresos por ruta — {dynFrom} a {dynTo}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Corridas</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Pasajeros</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeList.map(r => {
                    const total = routeList.reduce((s, x) => s + x.revenue, 0)
                    const pct   = total > 0 ? Math.round((r.revenue / total) * 100) : 0
                    return (
                      <tr key={r.code} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{r.code}</span>
                            <div>
                              <p className="font-semibold text-slate-800 text-xs">{r.origin} → {r.dest}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600">{r.trips}</td>
                        <td className="px-5 py-4 text-right text-slate-700 font-semibold">{r.passengers}</td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-600">${r.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#c01515] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-slate-500 text-xs font-bold">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── POR CAJERO ── */}
      {tab === 'cajeros' && (
        <>
          <DynDateBar onSearch={fetchCajeros} />
          {cajerosLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : cajeros.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sin ventas por cajero en este rango</p>
              <p className="text-xs mt-1">Las ventas en taquilla registrarán el cajero automáticamente a partir de ahora.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Ventas por cajero — {dynFrom} a {dynTo}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Cajero</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Boletos</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cajeros.map(c => (
                    <tr key={c.user_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#c01515]/10 flex items-center justify-center text-[#c01515] font-bold text-xs shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{c.sucursal}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{c.bookings}</td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">${c.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-5 py-4 text-right text-slate-500">${c.bookings > 0 ? Math.round(c.revenue / c.bookings).toLocaleString('en-US') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── CIERRES ── */}
      {tab === 'cierres' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 text-sm">Historial de cierres de turno por sucursal</p>
            <Button onClick={() => setCierreModal(true)}
              className="bg-[#0a1e42] hover:bg-[#0d2654] text-white font-bold rounded-xl text-sm">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Nuevo cierre
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {cierres.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p>No hay cierres de turno registrados.</p>
                <p className="text-xs mt-1">Genera el primer cierre con el botón de arriba.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Empleado</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Boletos</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Efectivo</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarjeta</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">QB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cierres.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-slate-600 font-medium">{c.fecha}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.sucursal_code}</span>
                          <span className="text-slate-700">{c.sucursal_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{c.empleado}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{c.total_boletos}</td>
                      <td className="px-5 py-4 text-right text-amber-600 font-medium">${Number(c.total_efectivo).toFixed(2)}</td>
                      <td className="px-5 py-4 text-right text-blue-600 font-medium">${Number(c.total_tarjeta).toFixed(2)}</td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">${Number(c.total_general).toFixed(2)}</td>
                      <td className="px-5 py-4 text-center">
                        {c.qb_synced
                          ? <span title="Enviado a QuickBooks"><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></span>
                          : <span title="No enviado a QB"><XCircle className="w-4 h-4 text-slate-300 mx-auto" /></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL CIERRE DE TURNO ── */}
      {cierreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-black text-slate-800 mb-2">Cerrar Turno</h2>
            <p className="text-slate-400 text-sm mb-5">
              El sistema calculará automáticamente el total de ventas del día para la sucursal seleccionada y enviará el resumen a QuickBooks.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Sucursal *</label>
                <select value={ciSucursal} onChange={e => setCiSucursal(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0a1e42]/20 focus:border-[#0a1e42]">
                  <option value="">— Selecciona sucursal —</option>
                  {data.sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Notas del turno</label>
                <textarea value={ciNotas} onChange={e => setCiNotas(e.target.value)} rows={3}
                  placeholder="Incidencias, observaciones del turno..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#0a1e42]/20 focus:border-[#0a1e42]" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setCierreModal(false)}
                className="flex-1 rounded-xl border-slate-200">Cancelar</Button>
              <Button onClick={handleCierre} disabled={ciLoading || !ciSucursal}
                className="flex-1 bg-[#0a1e42] hover:bg-[#0d2654] text-white font-bold rounded-xl">
                {ciLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando...</>
                  : <><ClipboardCheck className="w-4 h-4 mr-2" />Generar cierre</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
