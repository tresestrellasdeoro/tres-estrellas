'use client'

import { useState } from 'react'
import {
  History, Search, Loader2, User, ArrowRight, ArrowLeftRight,
  CalendarDays, Hash, XCircle, CheckCircle2, Clock, MapPin,
} from 'lucide-react'

interface LegacyTicket {
  id: number
  ticket_id: string
  booking_number: string
  origin_code: string
  destination_code: string
  ticket_type: string
  passenger_name: string
  passenger_type: string
  travel_date: string
  travel_time: string | null
  amount: number
  payment_method: string
  sold_by: string | null
  cancelled: boolean
  imported_at: string
}

const STOP_NAMES: Record<string, string> = {
  HUN: 'Huntington Park',
  LAX: 'Los Angeles',
  SYC: 'San Ysidro',
  ATI: 'Aeropuerto TIJ',
  OTY: 'Garita de Otay',
  CAT: 'Central Camionera TIJ',
  LTI: 'Las Tijeras',
  ELP: 'El Paso',
  FAT: 'Fresno',
  AHM: 'Anaheim',
  SAC: 'Sacramento',
  PHX: 'Phoenix',
  SNA: 'Santa Ana',
  CBX: 'Cross Border Xpress',
}

function stopName(code: string) {
  return STOP_NAMES[code] ?? code
}

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function formatTime(t: string | null) {
  if (!t) return null
  const [hh, mm] = t.split(':')
  const h = parseInt(hh)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mm} ${ampm}`
}

export default function HistoricoPage() {
  const [mode, setMode]             = useState<'nombre' | 'boleto'>('nombre')
  const [nombre, setNombre]         = useState('')
  const [fecha, setFecha]           = useState('')
  const [numeroBoleto, setNumeroBoleto] = useState('')
  const [loading, setLoading]       = useState(false)
  const [results, setResults]       = useState<LegacyTicket[]>([])
  const [error, setError]           = useState('')
  const [searched, setSearched]     = useState(false)

  const reset = () => {
    setResults([])
    setError('')
    setSearched(false)
  }

  const search = async () => {
    reset()
    if (mode === 'nombre' && !nombre.trim() && !fecha) return
    if (mode === 'boleto' && !numeroBoleto.trim()) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (mode === 'boleto') {
        params.set('ticket', numeroBoleto.trim())
      } else {
        if (nombre.trim()) params.set('q', nombre.trim())
        if (fecha)         params.set('date', fecha)
      }

      const res  = await fetch(`/api/staff/legacy-boletos?${params}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al buscar'); return }
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) setError('No se encontraron boletos con esa búsqueda.')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search()
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <History className="w-6 h-6 text-[#c01515]" />
          Boletos históricos
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Consulta boletos vendidos en el sistema anterior (2018–2025). Útil para clientes con boleto de ida y vuelta que regresan.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('nombre'); reset() }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
            mode === 'nombre'
              ? 'bg-[#0f2c5c] text-white border-[#0f2c5c]'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          Por nombre / fecha
        </button>
        <button
          onClick={() => { setMode('boleto'); reset() }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
            mode === 'boleto'
              ? 'bg-[#0f2c5c] text-white border-[#0f2c5c]'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          Por número de boleto
        </button>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5 space-y-3">

        {mode === 'boleto' ? (
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Número de boleto
            </label>
            <div className="flex gap-2">
              <input
                value={numeroBoleto}
                onChange={e => setNumeroBoleto(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ej: 123456  ó  TEO123456"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={search}
                disabled={loading || !numeroBoleto.trim()}
                className="px-5 py-3 bg-[#c01515] hover:bg-[#a01010] text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nombre del pasajero
              </label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ej: Juan Garcia"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Fecha de viaje (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515]"
                />
                {fecha && (
                  <button onClick={() => setFecha('')}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:bg-slate-50">
                    ✕
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={search}
              disabled={loading || (!nombre.trim() && !fecha)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Buscando...' : 'Buscar en histórico'}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
          <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-amber-700 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {results.length} boleto{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
            {results.length === 50 ? ' (mostrando primeros 50)' : ''}
          </p>

          {results.map(t => (
            <div key={t.id}
              className={`bg-white rounded-2xl border-2 p-4 shadow-sm ${
                t.cancelled ? 'border-red-200 opacity-70' : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-black text-[#0a1628] text-base">{t.passenger_name}</p>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">{t.booking_number}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {t.cancelled ? (
                    <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> CANCELADO
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> VÁLIDO
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.ticket_type === 'round_trip'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {t.ticket_type === 'round_trip' ? 'IDA Y VUELTA' : 'SÓLO IDA'}
                  </span>
                </div>
              </div>

              {/* Ruta */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Origen</p>
                  <p className="font-bold text-slate-700 text-sm">{stopName(t.origin_code)}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{t.origin_code}</p>
                </div>
                {t.ticket_type === 'round_trip'
                  ? <ArrowLeftRight className="w-4 h-4 text-blue-400 shrink-0" />
                  : <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                }
                <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Destino</p>
                  <p className="font-bold text-slate-700 text-sm">{stopName(t.destination_code)}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{t.destination_code}</p>
                </div>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1 mb-0.5">
                    <CalendarDays className="w-3 h-3" /> Fecha
                  </p>
                  <p className="font-black text-slate-700">{formatDate(t.travel_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1 mb-0.5">
                    <Clock className="w-3 h-3" /> Hora
                  </p>
                  <p className="font-black text-slate-700">{formatTime(t.travel_time) ?? 'Abierta'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-slate-400 font-bold uppercase text-[10px] mb-0.5">Precio</p>
                  <p className="font-black text-[#c01515]">${t.amount}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {t.passenger_type === 'adult' ? 'Adulto' : 'Menor'}
                </span>
                {t.sold_by && <span>Vendido por: <strong>{t.sold_by}</strong></span>}
                {t.ticket_type === 'round_trip' && !t.cancelled && (
                  <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                    Puede usar tramo regreso
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío inicial */}
      {!searched && !loading && results.length === 0 && !error && (
        <div className="text-center py-12 text-slate-300">
          <History className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">Ingresa el nombre o número de boleto para buscar</p>
          <p className="text-xs text-slate-300 mt-1">Base de datos histórica: boletos vendidos 2018–2025</p>
        </div>
      )}
    </div>
  )
}
