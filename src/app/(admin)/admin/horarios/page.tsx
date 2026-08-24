'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock, ChevronLeft, ChevronRight, Plus, Trash2, Pencil,
  RefreshCw, CheckCircle2, XCircle, Bus, Users, Zap, AlertTriangle,
  Calendar, Check, X,
} from 'lucide-react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stop   { id: string; name: string; code: string }
interface Route  { id: string; code: string; name: string; duration_minutes: number; origin_stop: Stop; destination_stop: Stop }
interface Schedule {
  id: string; route_id: string; departure_time: string
  days_of_week: number[]; is_active: boolean
  route: Route
}
interface Trip {
  id: string; trip_number: string; departure_date: string
  departure_time: string; estimated_arrival: string
  status: TripStatus; seats_total: number; seats_available: number
  bus: { id: string; plate_number: string; unit_number: string } | null
  schedule: { id: string; route: Route } | null
}
type TripStatus = 'scheduled' | 'boarding' | 'in_transit' | 'arrived' | 'cancelled'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const STATUS_META: Record<TripStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled:  { label: 'Programado', color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <Clock className="w-3 h-3" /> },
  boarding:   { label: 'Abordando',  color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Users className="w-3 h-3" /> },
  in_transit: { label: 'En ruta',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Bus className="w-3 h-3" /> },
  arrived:    { label: 'Llegó',      color: 'bg-slate-100 text-slate-600 border-slate-200',      icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200',             icon: <XCircle className="w-3 h-3" /> },
}

// ── Schedules tab ─────────────────────────────────────────────────────────────

function SchedulesTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [routes, setRoutes]       = useState<Route[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Schedule | null>(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [genRange, setGenRange]   = useState({ from: format(new Date(), 'yyyy-MM-dd'), to: format(addDays(new Date(), 30), 'yyyy-MM-dd') })
  const [genResult, setGenResult] = useState<{ created: number; skipped: number } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError]         = useState('')

  const [form, setForm] = useState({ route_id: '', departure_time: '', days_of_week: [0,1,2,3,4,5,6] as number[] })

  const load = useCallback(async () => {
    setLoading(true)
    const [schRes, rtRes] = await Promise.all([
      fetch('/api/admin/schedules'),
      fetch('/api/admin/routes'),
    ])
    const schData = await schRes.json()
    const rtData  = await rtRes.json()
    setSchedules(schData.schedules ?? [])
    setRoutes(rtData.routes ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => { setForm({ route_id: '', departure_time: '', days_of_week: [0,1,2,3,4,5,6] }); setEditing(null); setShowForm(false); setError('') }

  const startEdit = (s: Schedule) => {
    setEditing(s)
    setForm({ route_id: s.route_id, departure_time: s.departure_time.slice(0,5), days_of_week: s.days_of_week })
    setShowForm(true)
  }

  const toggleDay = (d: number) =>
    setForm(f => ({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter(x => x !== d) : [...f.days_of_week, d].sort() }))

  const save = async () => {
    if (!form.route_id || !form.departure_time || form.days_of_week.length === 0) { setError('Completa todos los campos'); return }
    setSaving(true); setError('')
    const body = { route_id: form.route_id, departure_time: form.departure_time + ':00', days_of_week: form.days_of_week }
    const res = editing
      ? await fetch('/api/admin/schedules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...body }) })
      : await fetch('/api/admin/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); setSaving(false); return }
    await load(); resetForm(); setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este horario? Los viajes futuros ya generados no se eliminarán.')) return
    setDeleting(id)
    await fetch(`/api/admin/schedules?id=${id}`, { method: 'DELETE' })
    setSchedules(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  const generate = async () => {
    setGenerating(true); setGenResult(null)
    const res  = await fetch('/api/admin/trips/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(genRange) })
    const data = await res.json()
    setGenResult({ created: data.created ?? 0, skipped: data.skipped ?? 0 })
    setGenerating(false)
  }

  return (
    <div className="space-y-6">

      {/* Generate trips box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="font-black text-lg text-[#0a1628]">Generar viajes</h2>
        </div>
        <p className="text-slate-500 text-sm mb-4">
          Crea los viajes en el sitio web para el rango de fechas seleccionado, basándose en los horarios activos.
          Los viajes ya existentes no se duplican.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Desde</label>
            <input type="date" value={genRange.from} onChange={e => setGenRange(r => ({ ...r, from: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#c01515]" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Hasta</label>
            <input type="date" value={genRange.to} onChange={e => setGenRange(r => ({ ...r, to: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#c01515]" />
          </div>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors disabled:opacity-50">
            <Zap className="w-4 h-4" />
            {generating ? 'Generando...' : 'Generar viajes'}
          </button>
        </div>
        {genResult && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-emerald-700">{genResult.created} viajes creados</span>
            {genResult.skipped > 0 && <span className="text-slate-400">· {genResult.skipped} ya existían</span>}
          </div>
        )}
      </div>

      {/* Schedules list */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#c01515]" />
            <h2 className="font-black text-lg text-[#0a1628]">Horarios recurrentes</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{schedules.length}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> Nuevo horario
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-[#0a1628] text-sm mb-4">{editing ? 'Editar horario' : 'Nuevo horario'}</h3>
            {error && <p className="text-red-500 text-sm mb-3 font-semibold">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Ruta</label>
                <select value={form.route_id} onChange={e => setForm(f => ({ ...f, route_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#c01515] bg-white">
                  <option value="">Seleccionar ruta...</option>
                  {routes.filter(r => r.origin_stop && r.destination_stop).map(r => (
                    <option key={r.id} value={r.id}>{r.origin_stop.name} → {r.destination_stop.name} ({r.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Hora de salida</label>
                <input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#c01515]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Días de operación</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold border transition-all ${
                        form.days_of_week.includes(i)
                          ? 'bg-[#0a1e42] text-white border-[#0a1e42]'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white font-bold text-sm disabled:opacity-50">
                  <Check className="w-4 h-4" /> {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear horario'}
                </button>
                <button onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-slate-400 text-sm">Cargando horarios...</div>}

        {!loading && schedules.length === 0 && (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">Sin horarios recurrentes</p>
            <p className="text-slate-400 text-sm mt-1">Crea un horario para empezar a generar viajes</p>
          </div>
        )}

        <div className="space-y-2">
          {schedules.map(s => {
            const rt = s.route
            return (
              <div key={s.id} className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${s.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <div className="text-center min-w-[52px]">
                  <p className="font-mono font-black text-[#0a1628] text-lg leading-none">{s.departure_time.slice(0,5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  {rt ? (
                    <>
                      <p className="font-bold text-slate-700 text-sm truncate">{rt.origin_stop?.name} → {rt.destination_stop?.name}</p>
                      <p className="text-slate-400 text-xs">{rt.code} · {rt.duration_minutes} min</p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">Ruta eliminada</p>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap shrink-0">
                  {DAYS.map((d, i) => (
                    <span key={i} className={`text-[10px] font-bold w-7 h-7 rounded-lg flex items-center justify-center ${
                      s.days_of_week.includes(i) ? 'bg-[#0a1e42] text-white' : 'bg-slate-100 text-slate-300'
                    }`}>{d}</span>
                  ))}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(s.id)} disabled={deleting === s.id} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Trips tab ─────────────────────────────────────────────────────────────────

function TripsTab() {
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [trips, setTrips]     = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const changeDate = (delta: number) => {
    const base = parseISO(date)
    setDate(format(delta > 0 ? addDays(base, delta) : subDays(base, Math.abs(delta)), 'yyyy-MM-dd'))
  }

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const res  = await fetch(`/api/admin/trips?date=${d}`)
    const data = await res.json()
    setTrips(data.trips ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  const changeStatus = async (id: string, status: TripStatus) => {
    setUpdating(id)
    await fetch('/api/admin/trips', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setTrips(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    setUpdating(null)
  }

  const deleteTrip = async (id: string) => {
    if (!confirm('¿Eliminar este viaje? Los boletos vendidos no se afectarán.')) return
    setUpdating(id)
    await fetch(`/api/admin/trips?id=${id}`, { method: 'DELETE' })
    setTrips(prev => prev.filter(t => t.id !== id))
    setUpdating(null)
  }

  const dateLabel = format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es })
  const total     = trips.length
  const cancelled = trips.filter(t => t.status === 'cancelled').length
  const active    = total - cancelled

  return (
    <div className="space-y-5">

      {/* Date picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => changeDate(-1)} className="px-3 py-2.5 hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-transparent focus:outline-none border-x border-slate-200 cursor-pointer" />
          <button onClick={() => changeDate(1)} className="px-3 py-2.5 hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-slate-500 text-sm capitalize font-semibold">{dateLabel}</p>
        <button onClick={() => load(date)} disabled={loading} className="ml-auto p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total de viajes', value: total, color: 'text-[#0a1628]' },
            { label: 'Activos',         value: active, color: 'text-emerald-600' },
            { label: 'Cancelados',      value: cancelled, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">{s.label}</p>
              <p className={`font-black text-2xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando viajes...</div>}

      {!loading && trips.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Sin viajes para esta fecha</p>
          <p className="text-slate-400 text-sm mt-1">Ve a la pestaña "Horarios" y genera viajes para este rango de fechas</p>
        </div>
      )}

      <div className="space-y-3">
        {trips.map(trip => {
          const rt   = trip.schedule?.route
          const meta = STATUS_META[trip.status]
          const busy = updating === trip.id

          return (
            <div key={trip.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${trip.status === 'cancelled' ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}>
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap">

                {/* Time */}
                <div className="text-center min-w-[60px]">
                  <p className="font-mono font-black text-[#0a1628] text-lg leading-none">{trip.departure_time.slice(0,5)}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">→ {trip.estimated_arrival?.slice(0,5) ?? '—'}</p>
                </div>

                {/* Route */}
                <div className="flex-1 min-w-0">
                  {rt ? (
                    <>
                      <p className="font-bold text-slate-700 text-sm">{rt.origin_stop?.name} → {rt.destination_stop?.name}</p>
                      <p className="text-slate-400 text-xs">{rt.code} · {trip.trip_number || 'Sin número'} · {trip.seats_available}/{trip.seats_total} asientos</p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">Ruta desconocida</p>
                  )}
                  {trip.bus && (
                    <p className="text-slate-400 text-xs">{trip.bus.unit_number} · {trip.bus.plate_number}</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>

                {/* Status selector */}
                <select value={trip.status} onChange={e => changeStatus(trip.id, e.target.value as TripStatus)}
                  disabled={busy}
                  className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#f0b429] cursor-pointer shrink-0 disabled:opacity-50">
                  <option value="scheduled">Programado</option>
                  <option value="boarding">Abordando</option>
                  <option value="in_transit">En ruta</option>
                  <option value="arrived">Llegó</option>
                  <option value="cancelled">Cancelar</option>
                </select>

                <button onClick={() => deleteTrip(trip.id)} disabled={busy}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && trips.length > 0 && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-blue-700 text-xs font-semibold">
            Los cambios de estado se reflejan inmediatamente en el sitio web. Al cancelar un viaje los clientes ya no podrán comprarlo.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'horarios' | 'viajes'

export default function HorariosPage() {
  const [tab, setTab] = useState<Tab>('viajes')

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-[#d97706]" />
          Horarios y viajes
        </h1>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button onClick={() => setTab('viajes')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'viajes' ? 'bg-white shadow-sm text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calendar className="w-4 h-4" /> Viajes por fecha
          </button>
          <button onClick={() => setTab('horarios')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'horarios' ? 'bg-white shadow-sm text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
            <Clock className="w-4 h-4" /> Horarios recurrentes
          </button>
        </div>
      </div>

      {tab === 'viajes' ? <TripsTab /> : <SchedulesTab />}
    </div>
  )
}
