'use client'

import { useState } from 'react'
import { Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { STATUS_META, type PackageStatus } from '@/lib/packages'

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
  origin: { name: string; city: string } | null
  destination: { name: string; city: string } | null
}

export function HeroTracker() {
  const [tracking, setTracking]   = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult]       = useState<TrackResult | null>(null)
  const [events, setEvents]       = useState<PkgEvent[]>([])
  const [error, setError]         = useState('')

  const doTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tracking.trim()) return
    setSearching(true)
    setResult(null)
    setError('')
    setEvents([])
    const res  = await fetch(`/api/packages/track?n=${encodeURIComponent(tracking.trim().toUpperCase())}`)
    const data = await res.json()
    setSearching(false)
    if (!res.ok || !data.package) { setError(data.error ?? 'Paquete no encontrado'); return }
    setResult(data.package)
    setEvents(data.events ?? [])
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-8">
      <form onSubmit={doTrack} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={tracking}
            onChange={e => setTracking(e.target.value.toUpperCase())}
            placeholder="Número de rastreo · ej. TEO12345678"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white text-slate-800 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515] placeholder:text-slate-400 placeholder:font-normal uppercase"
          />
        </div>
        <button type="submit" disabled={searching || !tracking.trim()}
          className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-400 text-white font-bold text-sm transition-colors shrink-0">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Rastrear
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-white bg-red-600/80 backdrop-blur-sm border border-red-400/40 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="mt-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-mono font-black text-base">{result.tracking_number}</p>
              <p className="text-white/60 text-xs">{result.origin?.city ?? '?'} → {result.destination?.city ?? '?'}</p>
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-full ${STATUS_META[result.status].bg} ${STATUS_META[result.status].color}`}>
              {STATUS_META[result.status].label}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {(['label_created','received','in_transit','arrived','delivered'] as PackageStatus[]).map((s, i, arr) => {
              const m    = STATUS_META[s]
              const done = result.status !== 'returned' && m.step <= STATUS_META[result.status].step
              const curr = s === result.status
              return (
                <div key={s} className="flex-1 flex items-center">
                  <div className={`flex flex-col items-center gap-0.5 flex-1`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      done ? `${m.bg} border-transparent` : 'bg-white/10 border-white/30'
                    } ${curr ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : ''}`}>
                      {done && <CheckCircle2 className={`w-3 h-3 ${m.color}`} />}
                    </div>
                    <p className={`text-[9px] font-bold text-center leading-tight hidden sm:block ${done ? 'text-white' : 'text-white/30'}`}>
                      {m.label.split(' ')[0]}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`h-px flex-1 mx-0.5 ${done && STATUS_META[arr[i+1]].step <= STATUS_META[result.status].step ? 'bg-white/60' : 'bg-white/20'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Latest event */}
          {events[0] && (
            <p className="text-xs text-white/60 border-t border-white/10 pt-2">
              Último evento: <span className="text-white font-semibold">{events[0].location ?? STATUS_META[events[0].status].label}</span>
              {' · '}{new Date(events[0].created_at).toLocaleDateString('es-MX', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
