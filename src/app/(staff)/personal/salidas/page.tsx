'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bus, CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, AlertTriangle, MapPin, RotateCcw } from 'lucide-react'

type TripStatus = 'scheduled' | 'departed' | 'cancelled' | 'delayed'

interface StopEntry {
  stop_id: string
  stop_order: number
  name: string
  city: string
  departed: boolean
  departed_at: string | null
}

interface TripRow {
  schedule_id: string
  departure_time: string
  route: {
    name: string
    code: string
    origin_stop: { id: string; name: string } | null
    destination_stop: { id: string; name: string } | null
  } | null
  stops: StopEntry[]
  status: TripStatus
  delay_minutes: number
  notes: string | null
}

function getDerivedStatus(trip: TripRow): { label: string; color: string; bg: string; icon: React.ReactNode; sublabel?: string } {
  if (trip.status === 'cancelled') {
    return { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100', icon: <XCircle className="w-4 h-4" /> }
  }
  if (trip.status === 'delayed') {
    return {
      label: 'Demorado', color: 'text-amber-700', bg: 'bg-amber-100',
      icon: <AlertTriangle className="w-4 h-4" />,
      sublabel: trip.delay_minutes > 0 ? `+${trip.delay_minutes} min` : undefined,
    }
  }

  const { stops } = trip
  if (!stops.length) {
    return { label: 'Programado', color: 'text-slate-600', bg: 'bg-slate-100', icon: <Clock className="w-4 h-4" /> }
  }

  const departedStops = stops.filter(s => s.departed).sort((a, b) => b.stop_order - a.stop_order)
  const lastStop      = stops[stops.length - 1]

  if (!departedStops.length) {
    return { label: 'Programado', color: 'text-slate-600', bg: 'bg-slate-100', icon: <Clock className="w-4 h-4" /> }
  }
  if (departedStops[0].stop_id === lastStop.stop_id) {
    return { label: 'Salió', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <CheckCircle2 className="w-4 h-4" /> }
  }

  return {
    label: 'En camino',
    sublabel: departedStops[0].name,
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: <Bus className="w-4 h-4" />,
  }
}

export default function SalidasPage() {
  const [trips, setTrips]       = useState<TripRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [delayMin, setDelayMin] = useState<Record<string, number>>({})
  const [notesTxt, setNotesTxt] = useState<Record<string, string>>({})
  const [date, setDate]         = useState('')
  const [noTable, setNoTable]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/staff/trips')
      const data = await res.json()
      if (data.trips) {
        setTrips(data.trips)
        setDate(data.date)
        const dm: Record<string, number> = {}
        const nt: Record<string, string> = {}
        data.trips.forEach((t: TripRow) => {
          dm[t.schedule_id] = t.delay_minutes ?? 0
          nt[t.schedule_id] = t.notes ?? ''
        })
        setDelayMin(dm)
        setNotesTxt(nt)
      }
      if (data.error?.includes('trip_logs') || data.error?.includes('does not exist')) {
        setNoTable(true)
      }
    } catch { /* empty */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (scheduleId: string, status: TripStatus) => {
    setSaving(scheduleId)
    try {
      const res  = await fetch('/api/staff/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id:   scheduleId,
          status,
          delay_minutes: delayMin[scheduleId] ?? 0,
          notes:         notesTxt[scheduleId] ?? null,
        }),
      })
      const data = await res.json()
      if (data.error?.includes('does not exist') || data.error?.includes('trip_logs')) {
        setNoTable(true)
        return
      }
      if (data.log || res.ok) {
        setTrips(prev => prev.map(t =>
          t.schedule_id === scheduleId
            ? { ...t, status, delay_minutes: delayMin[scheduleId] ?? 0, notes: notesTxt[scheduleId] ?? null }
            : t
        ))
        if (expanded === `${scheduleId}-delay`) setExpanded(scheduleId)
      }
    } finally {
      setSaving(null)
    }
  }

  const markStopDeparted = async (scheduleId: string, stop: StopEntry, undo = false) => {
    const key = `${scheduleId}-${stop.stop_id}`
    setSaving(key)
    try {
      const res  = await fetch('/api/staff/trips/stop', {
        method: undo ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: scheduleId,
          stop_id:     stop.stop_id,
          stop_order:  stop.stop_order,
        }),
      })
      const data = await res.json()
      if (data.error?.includes('does not exist') || data.error?.includes('trip_stop_logs')) {
        setNoTable(true)
        return
      }
      if (res.ok) {
        setTrips(prev => prev.map(t =>
          t.schedule_id !== scheduleId ? t : {
            ...t,
            stops: t.stops.map(s =>
              s.stop_id !== stop.stop_id ? s : {
                ...s,
                departed:    !undo,
                departed_at: undo ? null : new Date().toISOString(),
              }
            ),
          }
        ))
      }
    } finally {
      setSaving(null)
    }
  }

  const now       = new Date()
  const todayLabel = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Bus className="w-6 h-6 text-[#c01515]" />
            Salidas de hoy
          </h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{todayLabel}{date && ` · ${date}`}</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Warning: tables missing */}
      {noTable && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <p className="text-amber-800 font-bold text-sm mb-1">⚠️ Tablas de seguimiento no encontradas</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            El administrador debe ejecutar el archivo <strong>supabase/trip-stops-migration.sql</strong> en Supabase SQL Editor para activar el seguimiento por parada.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { label: 'Programado', color: 'text-slate-600',   bg: 'bg-slate-100',   icon: <Clock className="w-3.5 h-3.5" /> },
          { label: 'En camino',  color: 'text-blue-700',    bg: 'bg-blue-100',    icon: <Bus className="w-3.5 h-3.5" /> },
          { label: 'Salió',      color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
          { label: 'Demorado',   color: 'text-amber-700',   bg: 'bg-amber-100',   icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { label: 'Cancelado',  color: 'text-red-700',     bg: 'bg-red-100',     icon: <XCircle className="w-3.5 h-3.5" /> },
        ].map(cfg => (
          <span key={cfg.label} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando salidas...</div>}
      {!loading && trips.length === 0 && (
        <div className="text-center py-16">
          <Bus className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">Sin salidas programadas para hoy</p>
          <p className="text-slate-300 text-sm mt-1">Verifica los horarios en el panel de administración.</p>
        </div>
      )}

      <div className="space-y-3">
        {trips.map(trip => {
          const derived    = getDerivedStatus(trip)
          const isExpanded = expanded === trip.schedule_id || expanded === `${trip.schedule_id}-delay`
          const isSaving   = saving === trip.schedule_id
          const time       = trip.departure_time.slice(0, 5)

          const borderColor =
            trip.status === 'cancelled'    ? 'border-red-200 opacity-75' :
            derived.label === 'En camino'  ? 'border-blue-200' :
            derived.label === 'Salió'      ? 'border-emerald-200' :
            trip.status === 'delayed'      ? 'border-amber-200' :
            'border-slate-200'

          return (
            <div key={trip.schedule_id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${borderColor}`}>

              {/* Main row */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Time */}
                <div className="text-center shrink-0 w-14">
                  <p className="font-mono font-black text-[#0f2c5c] text-xl leading-none">{time}</p>
                  {trip.status === 'delayed' && trip.delay_minutes > 0 && (
                    <p className="text-amber-600 text-[10px] font-bold mt-0.5">+{trip.delay_minutes}min</p>
                  )}
                </div>

                {/* Route */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {trip.route?.origin_stop?.name ?? '—'} → {trip.route?.destination_stop?.name ?? '—'}
                  </p>
                  <p className="text-slate-400 text-xs">{trip.route?.name ?? trip.route?.code ?? ''}</p>
                  {derived.sublabel && (
                    <p className={`text-xs mt-0.5 font-semibold flex items-center gap-1 ${derived.color}`}>
                      {derived.label === 'En camino' && <MapPin className="w-3 h-3" />}
                      {derived.label === 'En camino' ? `Salió de ${derived.sublabel}` : derived.sublabel}
                    </p>
                  )}
                  {trip.notes && !derived.sublabel && (
                    <p className="text-slate-500 text-xs mt-0.5 italic">"{trip.notes}"</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${derived.bg} ${derived.color}`}>
                  {derived.icon}{derived.label}
                </span>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : trip.schedule_id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-5">

                  {/* ── Stop timeline ── */}
                  {trip.stops.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Recorrido por parada
                      </p>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {trip.stops.map((stop, idx) => {
                          const isLast      = idx === trip.stops.length - 1
                          const stopKey     = `${trip.schedule_id}-${stop.stop_id}`
                          const isSavingStop = saving === stopKey
                          const timeStr     = stop.departed_at
                            ? new Date(stop.departed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                            : null

                          return (
                            <div key={stop.stop_id}
                              className={`flex items-stretch gap-0 ${!isLast ? 'border-b border-slate-100' : ''}`}>

                              {/* Timeline indicator column */}
                              <div className="flex flex-col items-center w-10 py-3 shrink-0">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  stop.departed
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : idx === 0 || trip.stops.slice(0, idx).every(s => s.departed)
                                      ? 'border-blue-400 bg-white'
                                      : 'border-slate-300 bg-white'
                                }`}>
                                  {stop.departed && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                {!isLast && (
                                  <div className={`w-0.5 flex-1 mt-1 ${
                                    stop.departed ? 'bg-emerald-300' : 'bg-slate-200'
                                  }`} />
                                )}
                              </div>

                              {/* Stop info */}
                              <div className="flex-1 flex items-center justify-between gap-3 px-3 py-3">
                                <div className="min-w-0">
                                  <p className={`text-sm font-bold truncate ${
                                    stop.departed ? 'text-emerald-800' : 'text-slate-700'
                                  }`}>
                                    {stop.name}
                                  </p>
                                  {stop.departed && timeStr ? (
                                    <p className="text-emerald-600 text-xs font-semibold">Salió · {timeStr}</p>
                                  ) : (
                                    <p className="text-slate-400 text-xs">
                                      {idx === 0 ? 'Origen' : isLast ? 'Destino' : 'Parada intermedia'}
                                    </p>
                                  )}
                                </div>

                                {/* Action buttons */}
                                <div className="shrink-0 flex items-center gap-1.5">
                                  {!stop.departed ? (
                                    <button
                                      onClick={() => markStopDeparted(trip.schedule_id, stop)}
                                      disabled={isSavingStop || trip.status === 'cancelled'}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                                    >
                                      {isSavingStop ? '…' : <><CheckCircle2 className="w-3.5 h-3.5" /> Salió</>}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => markStopDeparted(trip.schedule_id, stop, true)}
                                      disabled={isSavingStop}
                                      title="Deshacer"
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 text-xs disabled:opacity-40 transition-colors"
                                    >
                                      {isSavingStop ? '…' : <><RotateCcw className="w-3 h-3" /> Deshacer</>}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <hr className="border-slate-200" />

                  {/* ── Service controls ── */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estado del servicio</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateStatus(trip.schedule_id, 'cancelled')}
                        disabled={isSaving || trip.status === 'cancelled'}
                        className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:opacity-40 ${
                          trip.status === 'cancelled'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar servicio
                      </button>
                      <button
                        onClick={() => setExpanded(`${trip.schedule_id}-delay`)}
                        disabled={isSaving}
                        className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:opacity-40 ${
                          trip.status === 'delayed'
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Marcar demorado
                      </button>
                    </div>
                  </div>

                  {/* Delay config */}
                  {expanded === `${trip.schedule_id}-delay` && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <p className="text-amber-800 text-xs font-bold">Configurar demora</p>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-amber-700 shrink-0">Minutos de demora</label>
                        <input
                          type="number" min={0} max={240}
                          value={delayMin[trip.schedule_id] ?? 0}
                          onChange={e => setDelayMin(p => ({ ...p, [trip.schedule_id]: Number(e.target.value) }))}
                          className="w-24 px-3 py-1.5 rounded-lg border border-amber-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                      </div>
                      <button
                        onClick={() => updateStatus(trip.schedule_id, 'delayed')}
                        disabled={isSaving}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm disabled:opacity-40 transition-colors"
                      >
                        {isSaving ? 'Guardando…' : 'Marcar como demorado'}
                      </button>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nota (opcional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notesTxt[trip.schedule_id] ?? ''}
                        onChange={e => setNotesTxt(p => ({ ...p, [trip.schedule_id]: e.target.value }))}
                        placeholder="Ej. Problema mecánico, driver ausente…"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-white"
                      />
                      <button
                        onClick={() => updateStatus(trip.schedule_id, trip.status)}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-[#0f2c5c] hover:bg-[#0a1e42] text-white text-sm font-bold disabled:opacity-40 transition-colors"
                      >
                        {isSaving ? '…' : 'Guardar'}
                      </button>
                    </div>
                  </div>

                  {/* Reset */}
                  {trip.status !== 'scheduled' && (
                    <button
                      onClick={() => updateStatus(trip.schedule_id, 'scheduled')}
                      disabled={isSaving}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold underline transition-colors disabled:opacity-40"
                    >
                      Restablecer a Programado
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
