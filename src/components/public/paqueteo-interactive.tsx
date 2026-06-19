'use client'

import { useState } from 'react'
import { Search, Package, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { PACKAGE_SIZES, STATUS_META, type PackageSize, type PackageStatus } from '@/lib/packages'

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

export function PaqueteoInteractive() {
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

  const [selectedSize, setSelectedSize] = useState<PackageSize | null>(null)

  return (
    <div className="space-y-12">

      {/* Tracking widget */}
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

            {/* Progress bar */}
            <div>
              <div className="flex items-center gap-0">
                {(['label_created','received','in_transit','arrived','delivered'] as PackageStatus[]).map((s, i, arr) => {
                  const m     = STATUS_META[s]
                  const done  = result.status !== 'returned' && m.step <= STATUS_META[result.status].step
                  const curr  = s === result.status
                  return (
                    <div key={s} className="flex-1 flex items-center">
                      <div className={`flex flex-col items-center gap-1 flex-1`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          done ? `${m.bg.replace('bg-','bg-')} border-current ${m.color}` : 'bg-white border-slate-200'
                        } ${curr ? 'ring-2 ring-offset-1 ring-current scale-110' : ''}`}>
                          {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <p className={`text-[10px] font-bold text-center leading-tight ${done ? m.color : 'text-slate-300'} ${curr ? 'font-black' : ''}`}>
                          {m.label}
                        </p>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 ${done && STATUS_META[arr[i+1]].step <= STATUS_META[result.status].step ? 'bg-current' : 'bg-slate-200'} ${m.color}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timeline */}
            {events.length > 0 && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Historial de eventos</p>
                <div className="space-y-2">
                  {events.map((ev, i) => {
                    const m = STATUS_META[ev.status]
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${m.bg} border border-current/10`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${m.bg.replace('50','400').replace('100','500')}`} />
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

      {/* Price calculator */}
      <div id="calcular">
        <div className="text-center mb-6">
          <h2 className="font-black text-[#0f2c5c] text-3xl tracking-tight mb-2">Calcula el costo de tu envío</h2>
          <p className="text-slate-500 text-sm">Selecciona el tamaño de tu paquete para ver el precio</p>
        </div>

        <div className="space-y-3">
          {(Object.entries(PACKAGE_SIZES) as [PackageSize, typeof PACKAGE_SIZES[PackageSize]][]).map(([key, info]) => (
            <button key={key} onClick={() => setSelectedSize(selectedSize === key ? null : key)}
              className={`w-full text-left relative bg-white border rounded-2xl p-5 flex items-center gap-5 transition-all hover:shadow-md ${
                selectedSize === key ? 'border-[#c01515] shadow-sm ring-2 ring-[#c01515]/20' : 'border-slate-200 hover:border-[#c01515]/30'
              }`}>
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                <Package className={`${
                  info.price >= 45 ? 'w-9 h-9' : info.price >= 35 ? 'w-7 h-7' : info.price >= 25 ? 'w-6 h-6' : info.price >= 15 ? 'w-5 h-5' : 'w-4 h-4'
                } text-[#0f2c5c]`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-black text-[#0f2c5c] text-base">{info.label}</p>
                  <span className="text-slate-400 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{info.dims}</span>
                </div>
                <p className="text-slate-500 text-sm">{info.desc}</p>
                {selectedSize === key && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Precio fijo, sin sorpresas
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                      Máx. {info.maxLbs} lbs
                    </span>
                    <a href="/auth/registro" className="inline-flex items-center gap-1 text-xs font-bold text-[#c01515] hover:underline">
                      Crear cuenta para rastrear <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-[#c01515] text-3xl leading-none">${info.price}</p>
                <p className="text-slate-400 text-xs mt-0.5">por envío</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
