'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, CheckCircle2, Clock, Users, Bus, Search,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Phone, User,
  ArrowRight, AlertTriangle,
} from 'lucide-react'

interface Pasajero {
  booking_number:   string
  folio:            string | null
  passenger_name:   string
  passenger_type:   string
  phone:            string | null
  origin_code:      string
  origin_name:      string
  destination_code: string
  destination_name: string
  travel_date:      string
  travel_time:      string | null
  seat:             number | null
  ticket_type:      string
  amount:           number
  sold_by:          string | null
  boarded:          boolean
  boarded_at:       string | null
  source:           'new' | 'legacy'
}

function today() { return new Date().toISOString().slice(0, 10) }

function typeLabel(t: string) {
  return t === 'senior' ? 'Senior' : t === 'child' ? 'Menor' : 'Adulto'
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function ReservacionesPage() {
  const [date, setDate]           = useState(today)
  const [horaFilter, setHoraFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [data, setData]           = useState<{ pasajeros: Pasajero[]; hours: string[] } | null>(null)
  const [loading, setLoading]     = useState(false)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [boarding, setBoarding]   = useState<Record<string, boolean>>({})
  const [boardingLoading, setBoardingLoading] = useState<string | null>(null)

  const load = useCallback(async (d: string, hora: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ date: d })
      if (hora) params.set('hora', hora + ':00')
      const res  = await fetch(`/api/staff/pasajeros?${params}`)
      const json = await res.json()
      setData(json)
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(date, horaFilter) }, [date, horaFilter, load])

  const markBoarded = async (p: Pasajero) => {
    if (p.source === 'new') return // new system uses existing check-in
    setBoardingLoading(p.booking_number)
    try {
      const res = await fetch('/api/staff/boarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          booking_number:   p.booking_number,
          travel_date:      p.travel_date,
          source:           'legacy',
          passenger_name:   p.passenger_name,
          origin_code:      p.origin_code,
          destination_code: p.destination_code,
          travel_time:      p.travel_time,
          seat:             p.seat,
        }),
      })
      if (res.ok) {
        setBoarding(prev => ({ ...prev, [p.booking_number]: true }))
        setData(prev => prev ? {
          ...prev,
          pasajeros: prev.pasajeros.map(x =>
            x.booking_number === p.booking_number ? { ...x, boarded: true, boarded_at: new Date().toISOString() } : x
          ),
        } : prev)
      }
    } catch { /* silently ignore */ }
    finally { setBoardingLoading(null) }
  }

  const pasajeros = (data?.pasajeros ?? []).filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.passenger_name.toLowerCase().includes(q) ||
           p.booking_number.includes(q) ||
           (p.phone ?? '').includes(q)
  })

  // Group by travel_time
  const groups = pasajeros.reduce<Record<string, Pasajero[]>>((acc, p) => {
    const key = p.travel_time ?? 'Sin hora'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const totalBoarded = (data?.pasajeros ?? []).filter(p => p.boarded).length
  const total        = data?.pasajeros.length ?? 0
  const legacy       = (data?.pasajeros ?? []).filter(p => p.source === 'legacy').length
  const newSys       = total - legacy

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Bus className="w-6 h-6 text-[#c01515]" />
            Lista de pasajeros
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Sistema nuevo + sistema anterior combinados</p>
        </div>
        <button onClick={() => load(date, horaFilter)} disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Hora de salida</label>
            <select value={horaFilter} onChange={e => setHoraFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] bg-white">
              <option value="">Todas las horas</option>
              {(data?.hours ?? []).map(h => (
                <option key={h} value={h.slice(0, 5)}>{fmt12(h)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, número de boleto o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',       value: total,          color: 'bg-slate-50 text-slate-700' },
            { label: 'Abordaron',   value: totalBoarded,   color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Sistema TEO', value: newSys,         color: 'bg-blue-50 text-blue-700' },
            { label: 'Sis. anterior', value: legacy,       color: 'bg-amber-50 text-amber-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 ${s.color}`}>
              <p className="font-black text-2xl">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#c01515]" />
        </div>
      )}

      {/* Empty */}
      {!loading && total === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Sin pasajeros para esta fecha</p>
          <p className="text-slate-400 text-sm mt-1">Cambia la fecha o quita el filtro de hora</p>
        </div>
      )}

      {/* Groups by departure time */}
      {!loading && Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([hora, pax]) => {
        const boardedCount = pax.filter(p => p.boarded).length
        return (
          <div key={hora} className="mb-4">
            {/* Time header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 bg-[#0a1628] text-white px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-black text-sm">{hora !== 'Sin hora' ? fmt12(hora) : 'Sin hora'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <Users className="w-3.5 h-3.5" />
                {pax.length} pasajeros
                <span className="text-emerald-600">· {boardedCount} abordaron</span>
              </div>
              {/* Seat progress bar */}
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-24">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (boardedCount / pax.length) * 100)}%` }} />
              </div>
            </div>

            {/* Passenger cards */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {pax.map((p, i) => {
                const isBoarded = p.boarded || !!boarding[p.booking_number]
                const isOpen    = expanded === `${hora}-${p.booking_number}`
                return (
                  <div key={`${p.booking_number}-${i}`}
                    className={`border-b border-slate-100 last:border-0 ${isBoarded ? 'bg-emerald-50/40' : ''}`}>
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : `${hora}-${p.booking_number}`)}>

                      {/* Boarded indicator */}
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isBoarded ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        {isBoarded
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <User className="w-4 h-4 text-slate-400" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 text-sm">{p.passenger_name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {typeLabel(p.passenger_type)}
                          </span>
                          {p.source === 'legacy' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                              Sis. anterior
                            </span>
                          )}
                          {isBoarded && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Abordó
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          #{p.booking_number}
                          {p.seat && <span className="ml-2 font-bold">· Asiento {p.seat}</span>}
                          <span className="ml-2">{p.origin_code || p.origin_name} → {p.destination_code || p.destination_name}</span>
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="font-bold text-slate-600 text-sm">${Number(p.amount).toFixed(0)}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-slate-400 font-bold uppercase tracking-wider">Ruta</p>
                            <p className="text-slate-700 font-semibold mt-0.5">
                              {p.origin_name || p.origin_code} → {p.destination_name || p.destination_code}
                            </p>
                            <p className="text-slate-400 mt-0.5">
                              {p.ticket_type === 'round_trip' ? 'Ida y vuelta' : 'Sólo ida'}
                            </p>
                          </div>
                          {p.phone && (
                            <div>
                              <p className="text-slate-400 font-bold uppercase tracking-wider">Teléfono</p>
                              <p className="text-slate-700 font-semibold mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3" />{p.phone}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-400 font-bold uppercase tracking-wider">Boleto</p>
                            <p className="text-slate-700 font-mono font-semibold mt-0.5">#{p.booking_number}</p>
                            {p.folio && p.folio !== p.booking_number && (
                              <p className="text-slate-400 mt-0.5">Folio: {p.folio}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase tracking-wider">Total</p>
                            <p className="font-black text-slate-800 text-base">${Number(p.amount).toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Boarding action */}
                        {p.source === 'legacy' && (
                          isBoarded ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Abordó {p.boarded_at
                                ? new Date(p.boarded_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </div>
                          ) : (
                            <button onClick={() => markBoarded(p)}
                              disabled={boardingLoading === p.booking_number}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors">
                              {boardingLoading === p.booking_number
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CheckCircle2 className="w-4 h-4" />
                              }
                              Marcar como abordado
                            </button>
                          )
                        )}
                        {p.source === 'new' && !isBoarded && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-xl px-3 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Abordaje se registra al escanear el boleto en Validar
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
