'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ScanLine, Search, CheckCircle2, XCircle, User, CreditCard, Banknote,
  Loader2, RotateCcw, ArrowRight, ArrowLeft, Clock, Wifi,
  ChevronDown, ChevronUp, CalendarDays, Mail, Hash, CalendarClock,
  Ban, AlertTriangle, Luggage, Plus,
} from 'lucide-react'
import Link from 'next/link'

const DEPARTURE_TIMES = [
  '3:20 AM','4:30 AM','5:00 AM','6:00 AM','7:00 AM','7:30 AM','8:00 AM',
  '9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM',
  '4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM','11:00 PM',
]

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
  id:               string
  booking_number:   string
  status:           string
  ticket_type:      string
  total_amount:     number
  luggage_price:    number
  luggage_label:    string | null
  payment_method:   string
  guest_email:      string
  created_at:       string
  return_date:      string | null
  departure_date:   string | null
  departure_time:   string | null
  origin_name:      string | null
  destination_name: string | null
  notes:            string | null
  passengers:       Passenger[]
  source?:          'new' | 'legacy'
}

interface LegacyLuggage {
  exc_id:         number
  numero_maletas: number
  peso_total:     number
  bicicletas:     number
  electronicos:   number
  costo_exceso:   number
  fecha_exceso:   string | null
}

interface LegacyBookingResult {
  id:               number
  ticket_id:        string
  booking_number:   string
  folio:            string | null
  passenger_name:   string
  passenger_type:   string
  phone:            string | null
  origin_code:      string
  origin_name:      string | null
  destination_code: string
  destination_name: string | null
  ticket_type:      string
  travel_date:      string
  travel_time:      string | null
  amount:           number
  payment_method:   string
  sold_by:          string | null
  cancelled:        boolean | null
  seat:             number | null
  sale_date:        string | null
  luggage:          LegacyLuggage[]
  source:           'legacy'
}

interface BoardingInfo {
  boarded_at:      string
  boarded_by_name: string | null
  seat:            number | null
  notes:           string | null
}

const AUTO_RESET_SECONDS = 8

function today() { return new Date().toISOString().split('T')[0] }

function passengerTypeLabel(t: string) {
  return t === 'adult' ? 'Adulto' : t === 'senior' ? 'Senior' : 'Menor'
}

export default function ValidarPage() {
  const [turnoActivo, setTurnoActivo] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/staff/turno')
      .then(r => r.json())
      .then(d => setTurnoActivo(!!d.turno))
      .catch(() => setTurnoActivo(false))
  }, [])

  // ── Scanner mode ──────────────────────────────────────────────────────
  const [query, setQuery]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [result, setResult]             = useState<BookingResult | null>(null)
  const [legacyResult, setLegacyResult] = useState<LegacyBookingResult | null>(null)
  const [checkingInLeg, setCheckingInLeg] = useState<'outbound' | 'return' | null>(null)
  const [boardingInfo, setBoardingInfo]   = useState<BoardingInfo | null>(null)
  const [boardingChecked, setBoardingChecked] = useState(false)
  const [boardingLoading, setBoardingLoading] = useState(false)
  const [boardingDone, setBoardingDone]   = useState(false)
  const [countdown, setCountdown]       = useState<number | null>(null)
  const inputRef                        = useRef<HTMLInputElement>(null)
  const countdownRef                    = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Reagendar modal ───────────────────────────────────────────────────
  const [reagendarOpen, setReagendarOpen]   = useState(false)
  const [reagendarLeg, setReagendarLeg]     = useState<'outbound' | 'return'>('outbound')
  const [reagendarDate, setReagendarDate]   = useState('')
  const [reagendarTime, setReagendarTime]   = useState('8:00 AM')
  const [reagendarLoading, setReagendarLoading] = useState(false)
  const [reagendarMsg, setReagendarMsg]     = useState('')
  const [reagendarError, setReagendarError] = useState('')

  // ── Cancelar modal ────────────────────────────────────────────────────
  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [cancelRazon,   setCancelRazon]   = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelMsg,     setCancelMsg]     = useState('')
  const [cancelError,   setCancelError]   = useState('')

  // ── Equipaje extra inline ─────────────────────────────────────────────
  const [extraOpen,     setExtraOpen]     = useState(false)
  const [extraLabel,    setExtraLabel]    = useState('1 maleta extra')
  const [extraPrice,    setExtraPrice]    = useState('')
  const [extraPayment,  setExtraPayment]  = useState<'cash' | 'card'>('cash')
  const [extraLoading,  setExtraLoading]  = useState(false)
  const [extraMsg,      setExtraMsg]      = useState('')
  const [extraError,    setExtraError]    = useState('')

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
    setLegacyResult(null)
    setBoardingInfo(null)
    setBoardingChecked(false)
    setBoardingDone(false)
    cancelCountdown()
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      const res  = await fetch(`/api/staff/validate?booking=${encodeURIComponent(q)}`, { signal: controller.signal })
      clearTimeout(timer)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No encontrado'); refocusInput(); return }
      if (data.source === 'legacy') {
        const lr = data as LegacyBookingResult
        setLegacyResult(lr)
        // Check boarding status for legacy tickets
        if (lr.travel_date) {
          const bp = await fetch(`/api/staff/boarding?booking=${lr.booking_number}&date=${lr.travel_date}`)
          if (bp.ok) {
            const bd = await bp.json()
            setBoardingInfo(bd.boarding)
            setBoardingChecked(true)
          }
        }
      } else {
        setResult(data as BookingResult)
      }
    } catch {
      setError('Error de conexión')
      refocusInput()
    } finally {
      setLoading(false)
    }
  }, [query, refocusInput])

  // ── Mark as boarded (legacy tickets) ─────────────────────────────────
  const markBoarded = async () => {
    if (!legacyResult) return
    setBoardingLoading(true)
    try {
      const res = await fetch('/api/staff/boarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          booking_number:   legacyResult.booking_number,
          travel_date:      legacyResult.travel_date,
          source:           'legacy',
          passenger_name:   legacyResult.passenger_name,
          origin_code:      legacyResult.origin_code,
          destination_code: legacyResult.destination_code,
          travel_time:      legacyResult.travel_time,
          seat:             legacyResult.seat,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setBoardingInfo(data.boarding)
        setBoardingDone(true)
      }
    } catch { /* silently ignore */ }
    finally { setBoardingLoading(false) }
  }

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

  const openReagendar = (leg: 'outbound' | 'return') => {
    setReagendarLeg(leg)
    setReagendarDate('')
    setReagendarTime('8:00 AM')
    setReagendarMsg('')
    setReagendarError('')
    setReagendarOpen(true)
    cancelCountdown()
  }

  const handleReagendar = async () => {
    if (!result || !reagendarDate) return
    setReagendarLoading(true)
    setReagendarError('')
    setReagendarMsg('')
    try {
      const body: Record<string, unknown> = {
        booking_number:     result.booking_number,
        leg:                reagendarLeg,
        new_date:           reagendarDate,
      }
      if (reagendarLeg === 'outbound') body.new_departure_time = reagendarTime

      const res  = await fetch('/api/staff/bookings/reagendar', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setReagendarError(data.error || 'Error al reagendar'); return }

      setReagendarMsg(data.msg)
      // Actualizar result local con los nuevos valores
      setResult(prev => {
        if (!prev) return null
        if (reagendarLeg === 'outbound') {
          return { ...prev, departure_time: reagendarTime }
        } else {
          return { ...prev, return_date: reagendarDate }
        }
      })
      setTimeout(() => setReagendarOpen(false), 2000)
    } catch {
      setReagendarError('Error de conexión')
    } finally {
      setReagendarLoading(false)
    }
  }

  const handleCobrarEquipaje = async () => {
    if (!result || !extraLabel.trim() || !extraPrice) return
    const price = parseFloat(extraPrice)
    if (isNaN(price) || price <= 0) return
    setExtraLoading(true)
    setExtraError('')
    setExtraMsg('')
    try {
      const res  = await fetch('/api/staff/bookings/equipaje-extra', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          booking_number: result.booking_number,
          luggage_label:  extraLabel.trim(),
          extra_price:    price,
          payment_method: extraPayment,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setExtraError(data.error || 'Error al cobrar'); return }
      setExtraMsg(data.message)
      setResult(prev => prev ? {
        ...prev,
        luggage_price: data.luggage_price,
        luggage_label: data.luggage_label,
        total_amount:  data.total_amount,
      } : null)
      setTimeout(() => { setExtraOpen(false); setExtraPrice('') }, 3000)
    } catch {
      setExtraError('Error de conexión')
    } finally {
      setExtraLoading(false)
    }
  }

  const handleReset = () => {
    cancelCountdown()
    setResult(null)
    setLegacyResult(null)
    setQuery('')
    setError('')
    setSearchResults([])
    refocusInput()
  }

  const openCancelar = () => {
    setCancelRazon('')
    setCancelMsg('')
    setCancelError('')
    setCancelOpen(true)
    cancelCountdown()
  }

  const handleCancelar = async () => {
    if (!result) return
    setCancelLoading(true)
    setCancelError('')
    setCancelMsg('')
    try {
      const res  = await fetch('/api/staff/bookings/cancelar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ booking_number: result.booking_number, razon: cancelRazon || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setCancelError(data.error || 'Error al cancelar'); return }
      setCancelMsg(data.message)
      setResult(prev => prev ? { ...prev, status: data.status } : null)
      setTimeout(() => setCancelOpen(false), 3000)
    } catch {
      setCancelError('Error de conexión')
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────
  const allOutboundDone = result?.passengers.every(p => p.checked_in)
  const allReturnDone   = result?.passengers.every(p => p.return_checked_in)
  const isRoundTrip     = result?.ticket_type === 'round_trip'

  // Compara fecha local sin hora para no fallar por zona horaria
  const todayStr = () => new Date().toISOString().split('T')[0]

  const outboundExpired = !!(
    result &&
    result.status === 'confirmed' &&
    !allOutboundDone &&
    result.departure_date &&
    result.departure_date < todayStr()
  )

  const returnExpired = !!(
    result &&
    isRoundTrip &&
    result.status === 'confirmed' &&
    allOutboundDone &&
    !allReturnDone &&
    result.return_date &&
    result.return_date < todayStr()
  )

  const statusColor = () => {
    if (!result) return 'bg-slate-400'
    if (result.status === 'used') return 'bg-emerald-500'
    if (outboundExpired || returnExpired) return 'bg-orange-500'
    if (result.status === 'confirmed') {
      if (isRoundTrip && allOutboundDone && !allReturnDone) return 'bg-blue-600'
      return 'bg-[#0f2c5c]'
    }
    return 'bg-amber-500'
  }

  const statusLabel = () => {
    if (!result) return ''
    if (result.status === 'used') return 'VIAJE COMPLETADO'
    if (outboundExpired) return 'BUS YA SALIÓ — REAGENDAR'
    if (returnExpired)   return 'FECHA DE REGRESO VENCIDA — REAGENDAR'
    if (result.status === 'confirmed') {
      if (isRoundTrip && allOutboundDone && !allReturnDone) return 'REGRESO PENDIENTE'
      return 'BOLETO VÁLIDO'
    }
    return 'BOLETO PENDIENTE'
  }

  if (turnoActivo === false) {
    return (
      <div className="p-6 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sin turno activo</h2>
        <p className="text-slate-500 text-sm mb-6">
          Debes iniciar tu turno antes de validar boletos.<br />
          Ve a "Mi turno" para comenzar.
        </p>
        <Link href="/personal/turno"
          className="inline-flex items-center gap-2 bg-[#0a1e42] hover:bg-[#0f2c5c] text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-sm">
          <Clock className="w-4 h-4" />
          Ir a Mi turno
        </Link>
      </div>
    )
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

      {/* ── LEGACY BOOKING RESULT ─────────────────────────────────────── */}
      {legacyResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">

          {/* Header bar */}
          <div className={`px-6 py-4 flex items-center justify-between ${legacyResult.cancelled ? 'bg-red-600' : 'bg-amber-600'}`}>
            <div className="flex items-center gap-2">
              {legacyResult.cancelled
                ? <XCircle className="w-5 h-5 text-white" />
                : <CheckCircle2 className="w-5 h-5 text-white" />
              }
              <span className="text-white font-black text-sm">
                {legacyResult.cancelled ? 'BOLETO CANCELADO' : 'BOLETO VÁLIDO — SISTEMA ANTERIOR'}
              </span>
            </div>
            <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full">
              SISTEMA ANTERIOR
            </span>
          </div>

          <div className="p-5 space-y-4">

            {/* Aviso informativo */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs font-semibold">
                Este boleto fue vendido en el sistema anterior. Verifica los datos y permite el abordaje si es válido.
              </p>
            </div>

            {/* Boarding status — YA ABORDÓ o botón ABORDAR */}
            {boardingChecked && !legacyResult.cancelled && (
              boardingInfo ? (
                <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="font-black text-red-700 text-base">ESTE PASAJERO YA ABORDÓ</p>
                  </div>
                  <p className="text-red-600 text-sm">
                    Abordó el {new Date(boardingInfo.boarded_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {boardingInfo.boarded_by_name && ` · Registrado por ${boardingInfo.boarded_by_name}`}
                  </p>
                  <p className="text-red-500 text-xs mt-1 font-bold">NO PERMITIR SEGUNDO ABORDAJE</p>
                </div>
              ) : (
                <div className={`rounded-2xl p-4 ${boardingDone ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-slate-50 border-2 border-slate-200'}`}>
                  {boardingDone ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-black text-emerald-700">Abordaje registrado</p>
                        <p className="text-emerald-600 text-xs">El pasajero ha abordado correctamente</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-500 text-xs font-bold mb-2">Este boleto aún no ha sido escaneado hoy</p>
                      <button onClick={markBoarded} disabled={boardingLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-base rounded-xl transition-colors">
                        {boardingLoading
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <CheckCircle2 className="w-5 h-5" />
                        }
                        PERMITIR ABORDAJE
                      </button>
                    </>
                  )}
                </div>
              )
            )}

            {/* Pasajero */}
            <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-base">{legacyResult.passenger_name}</p>
                <p className="text-slate-500 text-xs">
                  {legacyResult.passenger_type === 'adult' ? 'Adulto' : legacyResult.passenger_type === 'child' ? 'Menor' : 'Senior'}
                  {' · '}
                  <span className="font-mono">#{legacyResult.booking_number}</span>
                  {legacyResult.folio && legacyResult.folio !== legacyResult.booking_number && (
                    <span className="ml-1 text-slate-400">· Folio {legacyResult.folio}</span>
                  )}
                </p>
                {legacyResult.phone && (
                  <p className="text-slate-600 text-sm font-semibold mt-0.5">📞 {legacyResult.phone}</p>
                )}
              </div>
            </div>

            {/* Ruta y fecha */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> Ruta
                </p>
                <p className="font-black text-slate-800 text-base">
                  {legacyResult.origin_code} → {legacyResult.destination_code}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {legacyResult.origin_name ?? legacyResult.origin_code}
                  {' → '}
                  {legacyResult.destination_name ?? legacyResult.destination_code}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {legacyResult.ticket_type === 'round_trip' ? 'Ida y vuelta' : 'Sólo ida'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Fecha de viaje
                </p>
                <p className="font-black text-slate-800">
                  {new Date(legacyResult.travel_date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {legacyResult.travel_time && (
                  <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {legacyResult.travel_time.slice(0, 5)}
                  </p>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Total pagado
                </p>
                <p className="font-black text-slate-800">${Number(legacyResult.amount).toFixed(2)}</p>
                <p className="text-slate-400 text-xs mt-0.5">💵 Efectivo</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Vendido por
                </p>
                <p className="font-black text-slate-800 text-sm">{legacyResult.sold_by || '—'}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {legacyResult.sale_date ? `Venta: ${legacyResult.sale_date}` : 'Sistema anterior'}
                </p>
              </div>
              {legacyResult.seat && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs mb-1">Asiento</p>
                  <p className="font-black text-slate-800 text-2xl">#{legacyResult.seat}</p>
                </div>
              )}
            </div>

            {/* Equipaje */}
            {legacyResult.luggage?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Luggage className="w-3.5 h-3.5" /> Equipaje registrado
                </p>
                <div className="space-y-2">
                  {legacyResult.luggage.map(l => (
                    <div key={l.exc_id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-3 text-xs text-amber-800 font-semibold">
                          {l.numero_maletas > 0 && <span>🧳 {l.numero_maletas} maleta{l.numero_maletas > 1 ? 's' : ''}</span>}
                          {l.bicicletas > 0 && <span>🚲 {l.bicicletas} bici</span>}
                          {l.electronicos > 0 && <span>📦 {l.electronicos} electrónico{l.electronicos > 1 ? 's' : ''}</span>}
                          {l.peso_total > 0 && <span>{l.peso_total} kg</span>}
                        </div>
                        {l.costo_exceso > 0 && <span className="font-black text-amber-700">${l.costo_exceso}</span>}
                      </div>
                      {l.fecha_exceso && <p className="text-amber-600 text-xs mt-1">{l.fecha_exceso}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón resetear */}
            <button onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors">
              <RotateCcw className="w-4 h-4" />
              Buscar otro boleto
            </button>
          </div>
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

            {/* Boleto vencido — banner de advertencia */}
            {(outboundExpired || returnExpired) && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="font-black text-orange-800 text-sm">
                      {outboundExpired
                        ? `El bus del ${result!.departure_date} a las ${result!.departure_time ?? '—'} ya salió`
                        : `La fecha de regreso ${result!.return_date} ya pasó`
                      }
                    </p>
                    <p className="text-orange-700 text-xs mt-1">
                      El boleto sigue siendo válido — puedes reagendarlo al siguiente bus disponible sin costo adicional.
                    </p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {outboundExpired && (
                        <button
                          onClick={() => openReagendar('outbound')}
                          className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          Reagendar ida ahora
                        </button>
                      )}
                      {returnExpired && (
                        <button
                          onClick={() => openReagendar('return')}
                          className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          Reagendar regreso ahora
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                      : result.status === 'confirmed' && !outboundExpired && (
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
                      : allOutboundDone && result.status === 'confirmed' && !returnExpired && (
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
            {!isRoundTrip && !allOutboundDone && result.status === 'confirmed' && !outboundExpired && (
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

            {isRoundTrip && !allOutboundDone && result.payment_method === 'cash' && result.status === 'confirmed' && !outboundExpired && (
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

              {/* Equipaje */}
              <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <Luggage className="w-3 h-3" /> Equipaje
                </p>
                <p className="font-semibold text-slate-700 text-sm">
                  {result.luggage_label || 'Sin equipaje adicional'}
                  {result.luggage_price > 0 && (
                    <span className="ml-2 text-slate-500 font-normal text-xs">+${result.luggage_price}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Cobrar equipaje extra */}
            {result.status === 'confirmed' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => { setExtraOpen(o => !o); setExtraMsg(''); setExtraError('') }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-600"
                >
                  <span className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-slate-400" />
                    Cobrar equipaje extra
                  </span>
                  <Plus className={`w-4 h-4 text-slate-400 transition-transform ${extraOpen ? 'rotate-45' : ''}`} />
                </button>

                {extraOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                        <input
                          value={extraLabel}
                          onChange={e => setExtraLabel(e.target.value)}
                          placeholder="Ej: 1 maleta extra"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Precio</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input
                            type="number" min="1" step="0.01"
                            value={extraPrice}
                            onChange={e => setExtraPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(['cash', 'card'] as const).map(m => (
                        <button key={m} onClick={() => setExtraPayment(m)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                            extraPayment === m ? 'border-[#c01515] bg-[#c01515]/5 text-[#c01515]' : 'border-slate-200 text-slate-500'
                          }`}>
                          {m === 'cash' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                          {m === 'cash' ? 'Efectivo' : 'Tarjeta'}
                        </button>
                      ))}
                    </div>

                    {extraPayment === 'card' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 text-xs">
                        Para cobrar con tarjeta usa la terminal física Square — ingresa el monto ${ extraPrice || '0'} directamente en el dispositivo.
                      </div>
                    )}

                    {extraError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs font-semibold flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 shrink-0" /> {extraError}
                      </div>
                    )}
                    {extraMsg && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-700 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {extraMsg}
                      </div>
                    )}

                    <button
                      onClick={handleCobrarEquipaje}
                      disabled={extraLoading || !extraLabel.trim() || !extraPrice || parseFloat(extraPrice) <= 0 || !!extraMsg}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0f2c5c] hover:bg-[#0a1e42] disabled:opacity-40 text-white font-bold text-sm transition-colors"
                    >
                      {extraLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Luggage className="w-4 h-4" />}
                      {extraLoading ? 'Cobrando...' : `Cobrar $${extraPrice || '0'} equipaje`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2">
              <button onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors">
                <RotateCcw className="w-4 h-4" />
                Buscar otro boleto
              </button>

              {/* Reagendar ida — solo si no ha abordado */}
              {result.status === 'confirmed' && !allOutboundDone && (
                <button onClick={() => openReagendar('outbound')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#c8a951] text-[#8a6d10] bg-amber-50 hover:bg-amber-100 text-sm font-semibold transition-colors">
                  <CalendarClock className="w-4 h-4" />
                  Reagendar ida
                </button>
              )}

              {/* Reagendar regreso — solo si es round-trip y no ha regresado */}
              {isRoundTrip && result.status === 'confirmed' && allOutboundDone && !allReturnDone && (
                <button onClick={() => openReagendar('return')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-semibold transition-colors">
                  <CalendarClock className="w-4 h-4" />
                  Reagendar regreso
                </button>
              )}

              {/* Cancelar boleto — solo si sigue activo */}
              {result.status === 'confirmed' && (
                <button onClick={openCancelar}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-semibold transition-colors">
                  <Ban className="w-4 h-4" />
                  Cancelar boleto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL CANCELAR ───────────────────────────────────────────── */}
      {cancelOpen && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-black text-slate-800 text-lg">Cancelar boleto</h3>
            </div>

            <p className="text-slate-500 text-sm mb-1">
              <span className="font-mono font-bold text-[#0a1628]">{result.booking_number}</span>
              {result.origin_name && result.destination_name &&
                <> · {result.origin_name} → {result.destination_name}</>
              }
            </p>
            <p className="text-slate-500 text-xs mb-4">
              {result.passengers.map(p => p.full_name).join(', ')}
            </p>

            {/* Aviso de reembolso */}
            {result.payment_method === 'card' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs">
                <p className="font-bold text-blue-800">💳 Pago con tarjeta — se emitirá reembolso automático</p>
                <p className="text-blue-700 mt-0.5">Square procesará el reembolso de <strong>${result.total_amount}</strong> a la tarjeta original (3–5 días hábiles).</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs">
                <p className="font-bold text-amber-800">💵 Pago en efectivo — reembolso manual</p>
                <p className="text-amber-700 mt-0.5">Deberás devolver <strong>${result.total_amount}</strong> en efectivo al cliente en este momento.</p>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Motivo de cancelación (opcional)
              </label>
              <textarea
                value={cancelRazon}
                onChange={e => setCancelRazon(e.target.value)}
                placeholder="Ej: Cliente no se presentó, error en reservación..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-red-300"
              />
            </div>

            {cancelError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-xs font-semibold mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {cancelError}
              </div>
            )}

            {cancelMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-xs font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {cancelMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCancelOpen(false)}
                disabled={cancelLoading}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelLoading || !!cancelMsg}
                className="flex-1 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {cancelLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
                  : <><Ban className="w-4 h-4" /> Confirmar cancelación</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REAGENDAR ──────────────────────────────────────────── */}
      {reagendarOpen && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">

            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="w-5 h-5 text-[#c8a951]" />
              <h3 className="font-black text-slate-800 text-lg">
                Reagendar {reagendarLeg === 'outbound' ? 'ida' : 'regreso'}
              </h3>
            </div>

            <p className="text-slate-500 text-sm mb-1">
              <span className="font-mono font-bold text-[#0a1628]">{result.booking_number}</span>
              {result.origin_name && result.destination_name &&
                <> · {result.origin_name} → {result.destination_name}</>
              }
            </p>

            {result.departure_time && reagendarLeg === 'outbound' && (
              <p className="text-xs text-slate-400 mb-4">
                Horario actual: <span className="font-bold">{result.departure_time}</span>
              </p>
            )}
            {result.return_date && reagendarLeg === 'return' && (
              <p className="text-xs text-slate-400 mb-4">
                Fecha de regreso actual: <span className="font-bold">{result.return_date}</span>
              </p>
            )}

            <div className="space-y-3 mb-4">
              {/* Nueva fecha */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Nueva fecha
                </label>
                <input
                  type="date"
                  value={reagendarDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setReagendarDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a1e42]/40"
                />
              </div>

              {/* Nueva hora — solo para outbound */}
              {reagendarLeg === 'outbound' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Nuevo horario de salida
                  </label>
                  <select
                    value={reagendarTime}
                    onChange={e => setReagendarTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a1e42]/40"
                  >
                    {DEPARTURE_TIMES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {reagendarError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-xs font-semibold mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {reagendarError}
              </div>
            )}

            {reagendarMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-xs font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {reagendarMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReagendarOpen(false)}
                disabled={reagendarLoading}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReagendar}
                disabled={reagendarLoading || !reagendarDate}
                className="flex-1 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {reagendarLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  : <><CalendarClock className="w-4 h-4" /> Confirmar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
