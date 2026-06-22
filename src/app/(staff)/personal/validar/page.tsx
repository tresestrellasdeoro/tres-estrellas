'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ScanLine, Search, CheckCircle2, XCircle, User, CreditCard, Banknote,
  Loader2, RotateCcw, ArrowRight, ArrowLeft, Clock, Wifi,
  ChevronDown, ChevronUp, CalendarDays, Mail, Hash,
} from 'lucide-react'

interface Passenger {
  id: string
  full_name: string
  passenger_type: string
  price: number
  checked_in: boolean
  checked_in_at: string | null
  return_checked_in: boolean
  return_checked_in_at: string | null
}

interface BookingResult {
  id: string
  booking_number: string
  status: string
  ticket_type: string
  total_amount: number
  payment_method: string
  guest_email: string
  created_at: string
  return_date: string | null
  passengers: Passenger[]
}

const AUTO_RESET_SECONDS = 8

function today() { return new Date().toISOString().split('T')[0] }

function passengerTypeLabel(t: string) {
  return t === 'adult' ? 'Adulto' : t === 'senior' ? 'Senior' : 'Menor'
}

export default function ValidarPage() {
  // ── Scanner mode ──────────────────────────────────────────────────────
  const [query, setQuery]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [result, setResult]             = useState<BookingResult | null>(null)
  const [checkingInLeg, setCheckingInLeg] = useState<'outbound' | 'return' | null>(null)
  const [countdown, setCountdown]       = useState<number | null>(null)
  const inputRef                        = useRef<HTMLInputElement>(null)
  const countdownRef                    = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Search mode ───────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen]     = useState(false)
  const [searchQ, setSearchQ]           = useState('')
  const [searchDate, setSearchDate]     = useState('')
  const [searching, setSearching]       = useState(false)
  const [searchResults, setSearchResults] = useState<BookingResult[]>([])
  const [searchError, setSearchError]   = useState('')

  // Keep focus on scanner input
  const refocusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [])

  // Auto-reset countdown
  const startCountdown = useCallback(() => {
    setCountdown(AUTO_RESET_SECONDS)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!)
          setResult(null)
          setQuery('')
          setError('')
          refocusInput()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [refocusInput])

  const cancelCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(null)
  }

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

  // ── Scanner lookup (exact booking number) ────────────────────────────
  const handleSearch = useCallback(async (value?: string) => {
    const q = (value ?? query).trim().toUpperCase()
    if (!q) return
    setLoading(true)
    setError('')
    setResult(null)
    cancelCountdown()
    try {
      const res  = await fetch(`/api/staff/validate?booking=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No encontrado'); refocusInput(); return }
      setResult(data)
    } catch {
      setError('Error de conexión')
      refocusInput()
    } finally {
      setLoading(false)
    }
  }, [query, refocusInput])

  // ── Advanced search ───────────────────────────────────────────────────
  const handleAdvancedSearch = async () => {
    if (!searchQ.trim() && !searchDate) return
    setSearching(true)
    setSearchError('')
    setSearchResults([])
    setResult(null)
    cancelCountdown()
    try {
      const params = new URLSearchParams()
      if (searchQ.trim()) params.set('q', searchQ.trim())
      if (searchDate)      params.set('date', searchDate)
      const res  = await fetch(`/api/staff/bookings?${params}`)
      const data = await res.json()
      if (!res.ok) { setSearchError(data.error || 'Error al buscar'); return }
      setSearchResults(data.bookings ?? [])
      if ((data.bookings ?? []).length === 0) setSearchError('Sin resultados para esa búsqueda')
    } catch {
      setSearchError('Error de conexión')
    } finally {
      setSearching(false)
    }
  }

  const selectSearchResult = (b: BookingResult) => {
    setResult(b)
    setError('')
    cancelCountdown()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Check-in ─────────────────────────────────────────────────────────
  const handleCheckIn = async (leg: 'outbound' | 'return') => {
    if (!result) return
    setCheckingInLeg(leg)
    setError('')
    cancelCountdown()
    try {
      const res  = await fetch('/api/staff/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ booking_number: result.booking_number, leg }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al registrar abordaje'); return }

      const now = new Date().toISOString()
      setResult(prev => {
        if (!prev) return null
        return {
          ...prev,
          status: leg === 'return' || prev.ticket_type === 'one_way' ? 'used' : prev.status,
          passengers: prev.passengers.map(p =>
            leg === 'outbound'
              ? { ...p, checked_in: true, checked_in_at: p.checked_in_at ?? now }
              : { ...p, return_checked_in: true, return_checked_in_at: p.return_checked_in_at ?? now }
          ),
        }
      })
      startCountdown()
    } catch {
      setError('Error de conexión')
    } finally {
      setCheckingInLeg(null)
    }
  }

  const handleReset = () => {
    cancelCountdown()
    setResult(null)
    setQuery('')
    setError('')
    setSearchResults([])
    refocusInput()
  }

  // ── Derived state ─────────────────────────────────────────────────────
  const allOutboundDone = result?.passengers.every(p => p.checked_in)
  const allReturnDone   = result?.passengers.every(p => p.return_checked_in)
  const isRoundTrip     = result?.ticket_type === 'round_trip'

  const statusColor = () => {
    if (!result) return 'bg-slate-400'
    if (result.status === 'used') return 'bg-emerald-500'
    if (result.status === 'confirmed') {
      if (isRoundTrip && allOutboundDone && !allReturnDone) return 'bg-blue-600'
      return 'bg-[#0f2c5c]'
    }
    return 'bg-amber-500'
  }

  const statusLabel = () => {
    if (!result) return ''
    if (result.status === 'used') return 'VIAJE COMPLETADO'
    if (result.status === 'confirmed') {
      if (isRoundTrip && allOutboundDone && !allReturnDone) return 'REGRESO PENDIENTE'
      return 'BOLETO VÁLIDO'
    }
    return 'BOLETO PENDIENTE'
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-[#c01515]" />
            Validar boleto
          </h1>
          <p className="text-slate-500 text-sm mt-1">Escanea el QR o busca por nombre, correo o fecha.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <Wifi className="w-3.5 h-3.5" />
          Escáner listo
        </div>
      </div>

      {/* ── SCANNER INPUT ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-[#c01515]/20 focus-within:border-[#c01515] p-5 shadow-sm mb-3 transition-colors">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5" /> Número de reservación
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="TEO-XXXXXXXX  ·  Apunta el escáner aquí"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button onClick={() => handleSearch()} disabled={loading || !query.trim()}
            className="px-5 py-3 bg-[#c01515] hover:bg-[#a01010] text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-colors flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
        <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
          <ScanLine className="w-3 h-3" />
          El escáner enviará el Enter automáticamente — solo apunta y dispara
        </p>
      </div>

      {/* ── BÚSQUEDA AVANZADA ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
        <button
          onClick={() => setSearchOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            Búsqueda avanzada — por nombre, correo o fecha
          </div>
          {searchOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {searchOpen && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
            {/* Search field */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Nombre del pasajero, correo o # de reservación
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdvancedSearch()}
                  placeholder="Ej: Juan García  ·  juan@gmail.com  ·  TEO-ABC123"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30"
                />
              </div>
              <p className="text-slate-400 text-[11px] mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> Nombre del pasajero</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Correo electrónico</span>
                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> # reservación</span>
              </p>
            </div>

            {/* Date filter */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Fecha de salida (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30"
                />
                <button onClick={() => setSearchDate(today())}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                  Hoy
                </button>
                {searchDate && (
                  <button onClick={() => setSearchDate('')}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors">
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button onClick={handleAdvancedSearch} disabled={searching || (!searchQ.trim() && !searchDate)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0f2c5c] hover:bg-[#0a1e42] disabled:bg-slate-200 text-white font-bold text-sm transition-colors">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? 'Buscando...' : 'Buscar reservaciones'}
            </button>

            {/* Search error */}
            {searchError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {searchError}
              </div>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{searchResults.length} resultado{searchResults.length > 1 ? 's' : ''}</p>
                {searchResults.map(b => (
                  <button key={b.id} onClick={() => selectSearchResult(b)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:border-[#c01515]/40 hover:bg-[#c01515]/5 ${
                      result?.id === b.id ? 'border-[#c01515] bg-[#c01515]/5' : 'border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-black text-sm text-[#0a1628]">{b.booking_number}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'used' ? 'bg-emerald-100 text-emerald-700' :
                          b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {b.status === 'used' ? 'Usado' : b.status === 'confirmed' ? 'Válido' : 'Pendiente'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {b.ticket_type === 'round_trip' ? 'Ida y vuelta' : 'Sólo ida'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {b.passengers.map(p => p.full_name).join(' · ')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(b.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {b.guest_email && ` · ${b.guest_email}`}
                      {' · '}
                      <span className="font-bold text-[#c01515]">${b.total_amount}</span>
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error scanner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* ── BOOKING DETAIL ────────────────────────────────────────────── */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Status bar */}
          <div className={`px-6 py-4 flex items-center justify-between ${statusColor()}`}>
            <div className="flex items-center gap-2">
              {result.status === 'confirmed'
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : result.status === 'used'
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : <XCircle className="w-5 h-5 text-white" />
              }
              <span className="text-white font-black text-sm">{statusLabel()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-white/90 text-xs font-bold px-2 py-0.5 rounded-full ${isRoundTrip ? 'bg-white/20' : 'bg-transparent'}`}>
                {isRoundTrip ? 'IDA Y VUELTA' : 'SÓLO IDA'}
              </span>
              <span className="text-white/70 font-mono text-xs">{result.booking_number}</span>
            </div>
          </div>

          <div className="p-5 space-y-5">

            {/* Countdown */}
            {countdown !== null && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 text-sm font-bold">¡Abordaje registrado! Listo en {countdown}s…</span>
                </div>
                <button onClick={cancelCountdown} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold underline">
                  Quedarme aquí
                </button>
              </div>
            )}

            {/* Passengers */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pasajeros</p>
              <div className="space-y-2">
                {result.passengers.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.checked_in ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                        <User className={`w-4 h-4 ${p.checked_in ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.full_name}</p>
                        <p className="text-slate-400 text-xs">{passengerTypeLabel(p.passenger_type)} · ${p.price}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.checked_in && (
                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Ida ✓
                        </span>
                      )}
                      {isRoundTrip && p.return_checked_in && (
                        <span className="text-blue-600 text-xs font-bold flex items-center gap-1">
                          <ArrowLeft className="w-3 h-3" /> Regreso ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Round-trip legs */}
            {isRoundTrip && (
              <div className="space-y-3">
                <div className={`rounded-xl border-2 p-4 ${allOutboundDone ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRight className={`w-4 h-4 ${allOutboundDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className={`font-bold text-sm ${allOutboundDone ? 'text-emerald-700' : 'text-slate-600'}`}>TRAMO IDA</span>
                    </div>
                    {allOutboundDone
                      ? <span className="text-emerald-600 text-xs font-black flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Registrado</span>
                      : result.status === 'confirmed' && (
                        <button onClick={() => handleCheckIn('outbound')} disabled={checkingInLeg !== null}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                          {checkingInLeg === 'outbound' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Confirmar ida
                        </button>
                      )
                    }
                  </div>
                </div>

                <div className={`rounded-xl border-2 p-4 ${
                  allReturnDone ? 'border-blue-200 bg-blue-50' :
                  allOutboundDone ? 'border-blue-200 bg-blue-50/40' :
                  'border-slate-100 bg-slate-50/50 opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ArrowLeft className={`w-4 h-4 ${allReturnDone ? 'text-blue-600' : allOutboundDone ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className={`font-bold text-sm ${allReturnDone ? 'text-blue-700' : allOutboundDone ? 'text-blue-600' : 'text-slate-400'}`}>TRAMO REGRESO</span>
                      </div>
                      {!allReturnDone && allOutboundDone && (
                        <div className="mt-1.5 space-y-0.5">
                          {result.return_date && <p className="text-blue-700 text-xs font-black">Fecha: {result.return_date}</p>}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="text-blue-600 text-xs font-semibold">Hora abierta — puede abordar cualquier bus disponible</span>
                          </div>
                        </div>
                      )}
                      {!allOutboundDone && <p className="text-slate-400 text-xs mt-1">Registra primero el tramo de ida</p>}
                    </div>
                    {allReturnDone
                      ? <span className="text-blue-600 text-xs font-black flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Registrado</span>
                      : allOutboundDone && result.status === 'confirmed' && (
                        <button onClick={() => handleCheckIn('return')} disabled={checkingInLeg !== null}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                          {checkingInLeg === 'return' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Confirmar regreso
                        </button>
                      )
                    }
                  </div>
                </div>
              </div>
            )}

            {/* One-way check-in */}
            {!isRoundTrip && !allOutboundDone && result.status === 'confirmed' && (
              <>
                {result.payment_method === 'cash' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-amber-800 text-xs font-bold">⚠️ Pago en efectivo pendiente</p>
                    <p className="text-amber-700 text-xs mt-0.5">Cobra ${result.total_amount} antes de confirmar el abordaje.</p>
                  </div>
                )}
                <button onClick={() => handleCheckIn('outbound')} disabled={checkingInLeg !== null}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black disabled:opacity-50">
                  {checkingInLeg === 'outbound' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar abordaje
                </button>
              </>
            )}

            {isRoundTrip && !allOutboundDone && result.payment_method === 'cash' && result.status === 'confirmed' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-800 text-xs font-bold">⚠️ Pago en efectivo pendiente</p>
                <p className="text-amber-700 text-xs mt-0.5">Cobra ${result.total_amount} antes de confirmar el abordaje de ida.</p>
              </div>
            )}

            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Total
                </p>
                <p className="font-black text-slate-800">${result.total_amount}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  {result.payment_method === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                  Pago
                </p>
                <p className={`font-black text-sm ${result.payment_method === 'cash' ? 'text-amber-600' : 'text-slate-800'}`}>
                  {result.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                </p>
              </div>
              {result.guest_email && (
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Correo</p>
                  <p className="font-semibold text-slate-700 text-xs truncate">{result.guest_email}</p>
                </div>
              )}
            </div>

            <button onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors">
              <RotateCcw className="w-4 h-4" />
              Buscar otro boleto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
