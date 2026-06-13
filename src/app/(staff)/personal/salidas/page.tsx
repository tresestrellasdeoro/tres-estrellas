'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bus, CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react'

type TripStatus = 'scheduled' | 'departed' | 'cancelled' | 'delayed'

interface TripRow {
  schedule_id: string
  departure_time: string
  route: {
    name: string
    code: string
    origin_stop: { name: string } | null
    destination_stop: { name: string } | null
  } | null
  status: TripStatus
  delay_minutes: number
  notes: string | null
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Programado',  color: 'text-slate-600',   bg: 'bg-slate-100',    icon: <Clock className="w-4 h-4" /> },
  departed:  { label: 'Salió',       color: 'text-emerald-700', bg: 'bg-emerald-100',  icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: 'Cancelado',   color: 'text-red-700',     bg: 'bg-red-100',      icon: <XCircle className="w-4 h-4" /> },
  delayed:   { label: 'Demorado',    color: 'text-amber-700',   bg: 'bg-amber-100',    icon: <AlertTriangle className="w-4 h-4" /> },
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
    } catch {
      /* empty */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (scheduleId: string, status: TripStatus) => {
    setSaving(scheduleId)
    try {
      const res = await fetch('/api/staff/trips', {
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
        setExpanded(null)
      }
    } finally {
      setSaving(null)
    }
  }

  const now = new Date()
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
          <p className="text-slate-500 text-sm mt-1 capitalize">{todayLabel} {date && `· ${date}`}</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Warning if table missing */}
      {noTable && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <p className="text-amber-800 font-bold text-sm mb-1">⚠️ Tabla de registros no encontrada</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            Para guardar el estado de salidas, el administrador debe ejecutar este SQL en Supabase:
          </p>
          <pre className="mt-2 bg-white border border-amber-200 rounded-xl p-3 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS trip_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  trip_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','departed','cancelled','delayed')),
  delay_minutes int DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(schedule_id, trip_date)
);
ALTER TABLE trip_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON trip_logs
  TO service_role USING (true) WITH CHECK (true);`}</pre>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.entries(STATUS_CONFIG) as [TripStatus, typeof STATUS_CONFIG[TripStatus]][]).map(([key, cfg]) => (
          <span key={key} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
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
          const cfg  = STATUS_CONFIG[trip.status]
          const isExpanded = expanded === trip.schedule_id
          const isSaving   = saving === trip.schedule_id
          const time = trip.departure_time.slice(0, 5)

          return (
            <div key={trip.schedule_id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                trip.status === 'cancelled' ? 'border-red-200 opacity-75' :
                trip.status === 'departed'  ? 'border-emerald-200' :
                trip.status === 'delayed'   ? 'border-amber-200' :
                'border-slate-200'
              }`}>

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
                  {trip.notes && (
                    <p className="text-slate-500 text-xs mt-0.5 italic">"{trip.notes}"</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}{cfg.label}
                </span>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : trip.schedule_id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expanded: action panel */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
                  {/* Quick actions */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actualizar estado</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => updateStatus(trip.schedule_id, 'departed')}
                        disabled={isSaving || trip.status === 'departed'}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:opacity-40 ${
                          trip.status === 'departed'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Salió
                      </button>
                      <button
                        onClick={() => updateStatus(trip.schedule_id, 'cancelled')}
                        disabled={isSaving || trip.status === 'cancelled'}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:opacity-40 ${
                          trip.status === 'cancelled'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                        Cancelado
                      </button>
                      <button
                        onClick={() => setExpanded(`${trip.schedule_id}-delay`)}
                        disabled={isSaving}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:opacity-40 ${
                          trip.status === 'delayed'
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <AlertTriangle className="w-5 h-5" />
                        Demorado
                      </button>
                    </div>
                  </div>

                  {/* Delay config (only when delay button clicked) */}
                  {expanded === `${trip.schedule_id}-delay` && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <p className="text-amber-800 text-xs font-bold">Configurar demora</p>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-amber-700 shrink-0">Minutos de demora</label>
                        <input
                          type="number"
                          min={0}
                          max={240}
                          value={delayMin[trip.schedule_id] ?? 0}
                          onChange={e => setDelayMin(p => ({ ...p, [trip.schedule_id]: Number(e.target.value) }))}
                          className="w-24 px-3 py-1.5 rounded-lg border border-amber-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setExpanded(trip.schedule_id)
                          updateStatus(trip.schedule_id, 'delayed')
                        }}
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

                  {/* Reset to scheduled */}
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
