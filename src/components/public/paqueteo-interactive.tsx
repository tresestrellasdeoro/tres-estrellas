'use client'

import { useState } from 'react'
import { Search, Package, ArrowRight, CheckCircle2, AlertCircle, Loader2, MapPin, Weight, Calculator } from 'lucide-react'
import { PACKAGE_SIZES, STATUS_META, type PackageSize, type PackageStatus } from '@/lib/packages'
import Link from 'next/link'

interface PkgEvent {
  status: PackageStatus
  location: string | null
  notes: string | null
  created_at: string
}

interface TrackResult {
  tracking_number: string
  sender_name: string
  recipient_name: string
  status: PackageStatus
  size: PackageSize
  price: number
  origin: { name: string; city: string } | null
  destination: { name: string; city: string } | null
}

const TERMINALS = [
  'Los Angeles, CA',
  'Huntington Park, CA',
  'San Ysidro, CA',
  'Garita de Otay, MX',
]

function suggestSize(lbs: number): PackageSize {
  if (lbs <= 1)  return 'sobre'
  if (lbs <= 5)  return 'pequeno'
  if (lbs <= 15) return 'mediano'
  if (lbs <= 30) return 'grande'
  return 'extra_grande'
}

export function PaqueteoInteractive() {
  /* ── Cotizar state ── */
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [weight, setWeight]   = useState('')
  const [quoteSize, setQuoteSize] = useState<PackageSize | null>(null)
  const [quoted, setQuoted]   = useState(false)

  const getQuote = (e: React.FormEvent) => {
    e.preventDefault()
    const lbs  = parseFloat(weight) || 0
    const size = suggestSize(lbs)
    setQuoteSize(size)
    setQuoted(true)
  }

  const quotedInfo = quoteSize ? PACKAGE_SIZES[quoteSize] : null

  /* ── Tracking state ── */
  const [tracking, setTracking] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult]     = useState<TrackResult | null>(null)
  const [events, setEvents]     = useState<PkgEvent[]>([])
  const [trackErr, setTrackErr] = useState('')

  const doTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tracking.trim()) return
    setSearching(true)
    setResult(null)
    setTrackErr('')
    setEvents([])
    const res  = await fetch(`/api/packages/track?n=${encodeURIComponent(tracking.trim().toUpperCase())}`)
    const data = await res.json()
    setSearching(false)
    if (!res.ok || !data.package) { setTrackErr(data.error ?? 'Paquete no encontrado'); return }
    setResult(data.package)
    setEvents(data.events ?? [])
  }

  return (
    <div className="space-y-14">

      {/* ── COTIZAR ── */}
      <div id="cotizar">
        <div className="text-center mb-6">
          <h2 className="font-black text-[#0f2c5c] text-3xl tracking-tight mb-2">Cotiza tu envío</h2>
          <p className="text-slate-500 text-sm">Ingresa los datos y obtén el precio al instante</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={getQuote} className="p-6 space-y-4">
            {/* Origin / Destination */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select required value={from} onChange={e => setFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#c01515] focus:ring-2 focus:ring-[#c01515]/20 appearance-none font-semibold text-slate-700">
                  <option value="">Origen *</option>
                  {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c01515]" />
                <select required value={to} onChange={e => setTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#c01515] focus:ring-2 focus:ring-[#c01515]/20 appearance-none font-semibold text-slate-700">
                  <option value="">Destino *</option>
                  {TERMINALS.filter(t => t !== from).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Size + Weight */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['sobre','pequeno','mediano','grande','extra_grande'] as PackageSize[]).map(key => {
                const info = PACKAGE_SIZES[key]
                return (
                  <button type="button" key={key} onClick={() => { setQuoteSize(key); setQuoted(false) }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                      quoteSize === key ? 'border-[#c01515] bg-red-50 ring-2 ring-[#c01515]/20' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <Package className={`${
                      info.price >= 45 ? 'w-7 h-7' : info.price >= 35 ? 'w-6 h-6' : info.price >= 25 ? 'w-5 h-5' : info.price >= 15 ? 'w-4 h-4' : 'w-3.5 h-3.5'
                    } ${quoteSize === key ? 'text-[#c01515]' : 'text-slate-400'}`} />
                    <p className={`text-xs font-bold leading-tight ${quoteSize === key ? 'text-[#c01515]' : 'text-slate-600'}`}>{info.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{info.dims.split('·')[0].trim()}</p>
                  </button>
                )
              })}
              <div className="relative flex flex-col justify-center">
                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={weight} onChange={e => { setWeight(e.target.value); setQuoted(false) }}
                  type="number" min="0" step="0.1" placeholder="Peso (lbs)"
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-2 focus:ring-[#c01515]/20" />
                <p className="text-[10px] text-slate-400 text-center mt-1">Opcional</p>
              </div>
            </div>

            <button type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white font-bold text-sm transition-colors">
              <Calculator className="w-4 h-4" />
              Obtener precio
            </button>
          </form>

          {/* Quote result */}
          {quoted && quotedInfo && quoteSize && (
            <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-red-50/30 px-6 py-6">
              <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
                {/* Price */}
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tu cotización</p>
                  <div className="flex items-baseline gap-2">
                    <p className="font-black text-[#c01515] text-5xl leading-none">${quotedInfo.price}</p>
                    <p className="text-slate-500 text-sm font-semibold">USD</p>
                  </div>
                  <p className="text-slate-500 text-sm mt-1.5">
                    {from || 'Origen'} <span className="text-[#c01515] font-bold mx-1">→</span> {to || 'Destino'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                      {quotedInfo.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                      Máx. {quotedInfo.maxLbs} lbs · {quotedInfo.dims.split('·').pop()?.trim()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Precio fijo
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                  <Link href="/auth/login?next=/mis-paquetes"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white font-bold text-sm transition-colors whitespace-nowrap">
                    Crear envío
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/auth/registro"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-600 font-semibold text-xs transition-colors whitespace-nowrap">
                    ¿No tienes cuenta? Crear cuenta
                  </Link>
                  <p className="text-[10px] text-slate-400 text-center sm:text-right">
                    Envío disponible todos los días
                  </p>
                </div>
              </div>

              {/* Size comparison hint */}
              {weight && parseFloat(weight) > 0 && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-amber-700 text-xs">
                    Con <strong>{weight} lbs</strong> te recomendamos el tamaño <strong>{quotedInfo.label}</strong> ({quotedInfo.dims}).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RASTREAR ── */}
      <div id="rastrear" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-[#c01515]" />
          <h2 className="font-black text-[#0f2c5c] text-xl">Rastrear mi paquete</h2>
        </div>
        <form onSubmit={doTrack} className="flex gap-2">
          <input
            value={tracking}
            onChange={e => setTracking(e.target.value.toUpperCase())}
            placeholder="Número de rastreo (ej. TEO12345678)"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-sm focus:outline-none focus:border-[#c01515] focus:ring-2 focus:ring-[#c01515]/20 uppercase"
          />
          <button type="submit" disabled={searching || !tracking.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-300 text-white font-bold text-sm transition-colors">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rastrear
          </button>
        </form>

        {trackErr && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {trackErr}
          </div>
        )}

        {result && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 rounded-xl p-4">
              <div>
                <p className="font-mono font-black text-[#0a1628] text-lg">{result.tracking_number}</p>
                <p className="text-slate-500 text-sm">{result.origin?.city ?? '?'} → {result.destination?.city ?? '?'}</p>
                <p className="text-slate-400 text-xs mt-0.5">{result.sender_name} → {result.recipient_name}</p>
              </div>
              <span className={`text-sm font-black px-4 py-2 rounded-full ${STATUS_META[result.status].bg} ${STATUS_META[result.status].color}`}>
                {STATUS_META[result.status].label}
              </span>
            </div>

            {/* Progress steps */}
            <div className="flex items-start gap-0 overflow-x-auto pb-1">
              {(['label_created','received','in_transit','arrived','delivered'] as PackageStatus[]).map((s, i, arr) => {
                const m    = STATUS_META[s]
                const done = result.status !== 'returned' && m.step <= STATUS_META[result.status].step
                const curr = s === result.status
                return (
                  <div key={s} className="flex-1 flex items-center min-w-0">
                    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        done ? `${m.bg} border-current ${m.color}` : 'bg-white border-slate-200'
                      } ${curr ? 'ring-2 ring-offset-2 ring-current scale-110' : ''}`}>
                        {done && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <p className={`text-[10px] font-bold text-center leading-tight px-1 ${done ? m.color : 'text-slate-300'} ${curr ? 'font-black' : ''}`}>
                        {m.label}
                      </p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`h-0.5 w-full mx-1 shrink-0 ${done && STATUS_META[arr[i+1]].step <= STATUS_META[result.status].step ? m.bg.replace('bg-','bg-').replace('50','300').replace('100','400') : 'bg-slate-200'}`} style={{ minWidth: '12px', maxWidth: '32px' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Timeline */}
            {events.length > 0 && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Historial</p>
                <div className="space-y-2">
                  {events.map((ev, i) => {
                    const m = STATUS_META[ev.status]
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${m.bg} border-current/10`}>
                        <div className="flex-1">
                          <p className={`text-xs font-black ${m.color}`}>{m.label}</p>
                          {ev.location && <p className="text-xs text-slate-500">{ev.location}</p>}
                          {ev.notes && <p className="text-xs text-slate-400 italic">{ev.notes}</p>}
                        </div>
                        <p className="text-[10px] text-slate-400 shrink-0">
                          {new Date(ev.created_at).toLocaleDateString('es-MX', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
