'use client'

import { useState } from 'react'
import { ScanLine, Search, CheckCircle2, XCircle, User, MapPin, Calendar, CreditCard, Banknote, Loader2, RotateCcw } from 'lucide-react'

interface BookingResult {
  booking_number: string
  status: string
  ticket_type: string
  total_amount: number
  payment_method: string
  guest_email: string
  created_at: string
  passengers: {
    id: string
    full_name: string
    passenger_type: string
    price: number
    checked_in: boolean
    checked_in_at: string | null
  }[]
}

export default function ValidarPage() {
  const [query, setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BookingResult | null>(null)
  const [error, setError]   = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkedIn, setCheckedIn]   = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setCheckedIn(false)
    try {
      const res = await fetch(`/api/staff/validate?booking=${encodeURIComponent(query.trim().toUpperCase())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No encontrado'); return }
      setResult(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!result) return
    setCheckingIn(true)
    try {
      const res = await fetch('/api/staff/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_number: result.booking_number }),
      })
      if (res.ok) {
        setCheckedIn(true)
        setResult(prev => prev ? {
          ...prev,
          passengers: prev.passengers.map(p => ({ ...p, checked_in: true, checked_in_at: new Date().toISOString() }))
        } : null)
      }
    } catch {
      setError('Error al registrar abordaje')
    } finally {
      setCheckingIn(false)
    }
  }

  const allCheckedIn = result?.passengers.every(p => p.checked_in)

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-[#c01515]" />
          Validar boleto
        </h1>
        <p className="text-slate-500 text-sm mt-1">Ingresa el número de reservación para validar.</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Número de reservación
        </label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="TEO-XXXXXXXX"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-[#c01515] hover:bg-[#a01010] text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 mb-6">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Status bar */}
          <div className={`px-6 py-4 flex items-center justify-between ${
            checkedIn || allCheckedIn ? 'bg-emerald-500' : result.status === 'confirmed' ? 'bg-[#0f2c5c]' : 'bg-amber-500'
          }`}>
            <div className="flex items-center gap-2">
              {checkedIn || allCheckedIn
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : result.status === 'confirmed'
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : <XCircle className="w-5 h-5 text-white" />
              }
              <span className="text-white font-black text-sm">
                {checkedIn || allCheckedIn ? 'ABORDAJE REGISTRADO' : result.status === 'confirmed' ? 'BOLETO VÁLIDO' : 'BOLETO PENDIENTE'}
              </span>
            </div>
            <span className="text-white/70 font-mono text-xs">{result.booking_number}</span>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">

            {/* Passengers */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pasajeros</p>
              <div className="space-y-2">
                {result.passengers.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        p.checked_in ? 'bg-emerald-100' : 'bg-slate-200'
                      }`}>
                        <User className={`w-4 h-4 ${p.checked_in ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.full_name}</p>
                        <p className="text-slate-400 text-xs capitalize">{p.passenger_type === 'adult' ? 'Adulto' : 'Menor'} · ${p.price}</p>
                      </div>
                    </div>
                    {p.checked_in && (
                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Abordó
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
                  {result.payment_method === 'cash'
                    ? <Banknote className="w-3 h-3" />
                    : <CreditCard className="w-3 h-3" />
                  }
                  Pago
                </p>
                <p className={`font-black text-sm ${result.payment_method === 'cash' ? 'text-amber-600' : 'text-slate-800'}`}>
                  {result.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                <p className="text-slate-400 text-xs mb-1">Correo</p>
                <p className="font-semibold text-slate-700 text-xs truncate">{result.guest_email}</p>
              </div>
            </div>

            {/* Cash payment warning */}
            {result.payment_method === 'cash' && !checkedIn && !allCheckedIn && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-800 text-xs font-bold">⚠️ Pago en efectivo pendiente</p>
                <p className="text-amber-700 text-xs mt-0.5">Cobra ${result.total_amount} antes de confirmar el abordaje.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setResult(null); setQuery(''); setCheckedIn(false); setError('') }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors">
                <RotateCcw className="w-4 h-4" />
                Nuevo
              </button>
              {!checkedIn && !allCheckedIn && result.status === 'confirmed' && (
                <button onClick={handleCheckIn} disabled={checkingIn}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-colors disabled:opacity-50">
                  {checkingIn
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />
                  }
                  Confirmar abordaje
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
