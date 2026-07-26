'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Calendar, Clock, ChevronRight, ArrowLeft,
  CheckCircle2, XCircle, Loader2, RefreshCw, Bus,
  CreditCard, Banknote, Search, Luggage,
} from 'lucide-react'

interface TripSummary {
  id:             string
  departure_date: string
  departure_time: string
  status:         string
  seats_total:    number
  seats_available: number
  pax_count:      number
  boarded_count:  number
  schedules:      { routes: { name: string; origin_stop: { name: string }; destination_stop: { name: string } } } | null
}

interface Passenger {
  id:                    string
  full_name:             string
  passenger_type:        string
  price:                 number
  seat_number:           string | null
  checked_in:            boolean
  checked_in_at:         string | null
  return_checked_in:     boolean
  return_checked_in_at:  string | null
  booking_number:        string
  booking_status:        string
  ticket_type:           string
  payment_method:        string
  guest_email:           string | null
  luggage_label:         string | null
  luggage_price:         number
}

interface ManifestData {
  trip: TripSummary
  passengers: Passenger[]
  summary: { total: number; boarded: number; pending: number }
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function today() { return new Date().toISOString().split('T')[0] }

function paxLabel(t: string) {
  return t === 'adult' ? 'Adulto' : t === 'senior' ? 'Senior' : 'Menor'
}

export default function ManifestoPage() {
  const [date,      setDate]      = useState(today())
  const [trips,     setTrips]     = useState<TripSummary[]>([])
  const [manifest,  setManifest]  = useState<ManifestData | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [loadingM,  setLoadingM]  = useState(false)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'boarded'>('all')
  const [search,    setSearch]    = useState('')

  const fetchTrips = useCallback(async (d: string) => {
    setLoading(true)
    setError('')
    setManifest(null)
    try {
      const res  = await fetch(`/api/driver/manifest?date=${d}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al cargar trips'); return }
      setTrips(data.trips ?? [])
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchManifest = async (tripId: string) => {
    setLoadingM(true)
    setError('')
    try {
      const res  = await fetch(`/api/driver/manifest?date=${date}&trip_id=${tripId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al cargar manifiesto'); return }
      setManifest(data)
      setSearch('')
      setFilter('all')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoadingM(false)
    }
  }

  useEffect(() => { fetchTrips(date) }, [date, fetchTrips])

  const route     = manifest?.trip.schedules?.routes
  const passengers = (manifest?.passengers ?? []).filter(p => {
    if (filter === 'pending')  return !p.checked_in
    if (filter === 'boarded')  return  p.checked_in
    return true
  }).filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.booking_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Sin manifiesto: selector de corrida ──────────────────── */}
        {!manifest && (
          <>
            <div className="mb-6">
              <h1 className="font-black text-2xl flex items-center gap-2">
                <Users className="w-6 h-6 text-[#f0b429]" />
                Lista de pasajeros
              </h1>
              <p className="text-white/50 text-sm mt-1">Selecciona la fecha y la corrida para ver el manifiesto.</p>
            </div>

            {/* Date picker */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <label className="text-white/50 text-xs font-bold uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0b429]/50"
                />
                <button onClick={() => setDate(today())}
                  className="px-3 py-2 rounded-xl bg-[#f0b429]/10 border border-[#f0b429]/30 text-[#f0b429] text-xs font-bold hover:bg-[#f0b429]/20 transition-colors">
                  Hoy
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-300 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Trips list */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#f0b429]" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Bus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay corridas programadas para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{trips.length} corrida{trips.length !== 1 ? 's' : ''}</p>
                {trips.map(t => {
                  const r       = t.schedules?.routes
                  const sold    = t.pax_count
                  const boarded = t.boarded_count
                  const pct     = sold > 0 ? Math.round(boarded / sold * 100) : 0
                  return (
                    <button
                      key={t.id}
                      onClick={() => fetchManifest(t.id)}
                      className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#f0b429]/40 rounded-2xl p-4 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-3.5 h-3.5 text-[#f0b429] shrink-0" />
                          <span className="font-black text-lg text-[#f0b429]">{fmtTime(t.departure_time)}</span>
                        </div>
                        {r && (
                          <p className="text-white/80 text-sm font-semibold truncate">
                            {r.origin_stop?.name ?? '?'} → {r.destination_stop?.name ?? '?'}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-white/50 text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> {sold} pasajeros
                          </span>
                          <span className={`text-xs font-bold flex items-center gap-1 ${boarded === sold && sold > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                            <CheckCircle2 className="w-3 h-3" /> {boarded} abordados ({pct}%)
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Manifiesto de pasajeros ──────────────────────────────── */}
        {manifest && (
          <>
            {/* Header */}
            <div className="mb-5">
              <button
                onClick={() => setManifest(null)}
                className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-semibold mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a corridas
              </button>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-[#f0b429]" />
                    <span className="font-black text-2xl text-[#f0b429]">{fmtTime(manifest.trip.departure_time)}</span>
                    <span className="text-white/40 text-sm">{manifest.trip.departure_date}</span>
                  </div>
                  {route && (
                    <p className="text-white/80 font-semibold">
                      {route.origin_stop?.name ?? '?'} → {route.destination_stop?.name ?? '?'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => fetchManifest(manifest.trip.id)}
                  disabled={loadingM}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {loadingM ? <Loader2 className="w-4 h-4 animate-spin text-[#f0b429]" /> : <RefreshCw className="w-4 h-4 text-white/50" />}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-white">{manifest.summary.total}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
                <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-widest mb-1">Abordaron</p>
                <p className="text-2xl font-black text-emerald-400">{manifest.summary.boarded}</p>
              </div>
              <div className={`rounded-2xl p-3 text-center border ${manifest.summary.pending > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${manifest.summary.pending > 0 ? 'text-amber-400/70' : 'text-white/40'}`}>Pendientes</p>
                <p className={`text-2xl font-black ${manifest.summary.pending > 0 ? 'text-amber-400' : 'text-white/30'}`}>{manifest.summary.pending}</p>
              </div>
            </div>

            {/* Search + filter */}
            <div className="space-y-2 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar pasajero o # reservación..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#f0b429]/40"
                />
              </div>
              <div className="flex gap-2">
                {([['all', 'Todos'], ['pending', 'Pendientes'], ['boarded', 'Abordaron']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      filter === val
                        ? 'bg-[#f0b429] text-[#0a1628]'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Passenger list */}
            {passengers.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin pasajeros en esta vista</p>
              </div>
            ) : (
              <div className="space-y-2">
                {passengers.map((p, i) => (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-3 flex items-center gap-3 ${
                      p.checked_in
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      p.checked_in ? 'bg-emerald-500/20' : 'bg-white/10'
                    }`}>
                      {p.checked_in
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <span className="text-white/30 text-xs font-bold">{i + 1}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{p.full_name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-white/40 text-xs">{paxLabel(p.passenger_type)}</span>
                        <span className="text-white/30 text-xs font-mono">{p.booking_number}</span>
                        {p.seat_number && (
                          <span className="text-[#f0b429] text-xs font-bold">Asiento {p.seat_number}</span>
                        )}
                        {p.payment_method === 'cash'
                          ? <Banknote className="w-3 h-3 text-amber-400" />
                          : <CreditCard className="w-3 h-3 text-blue-400" />
                        }
                        {p.luggage_label && (
                          <span className="flex items-center gap-0.5 text-purple-300 text-[10px] font-semibold">
                            <Luggage className="w-2.5 h-2.5" />
                            {p.luggage_label}
                          </span>
                        )}
                      </div>
                      {p.checked_in && p.checked_in_at && (
                        <p className="text-emerald-400/70 text-[10px] mt-0.5">
                          Abordó {new Date(p.checked_in_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {p.checked_in ? (
                        <span className="text-emerald-400 text-[10px] font-black uppercase">✓ Abordó</span>
                      ) : (
                        <span className="text-white/30 text-[10px] font-bold uppercase">Pendiente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer count */}
            <p className="text-white/30 text-xs text-center mt-4">
              Mostrando {passengers.length} de {manifest.summary.total} pasajeros
            </p>
          </>
        )}
      </div>
    </div>
  )
}
