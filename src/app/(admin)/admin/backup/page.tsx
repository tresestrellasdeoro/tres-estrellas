'use client'

import { useState, useEffect, useCallback } from 'react'
import { DatabaseBackup, RefreshCw, PlayCircle, CheckCircle2, AlertTriangle, Loader2, Clock, Package, Ticket } from 'lucide-react'

interface SyncState {
  id:             string
  last_bol_id:    number
  total_synced:   number
  last_synced_at: string | null
  last_error:     string | null
}

interface SyncResult {
  synced:      number
  lastId:      number
  totalSynced: number
  done:        boolean
  error?:      string
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StateCard({ label, icon: Icon, state }: { label: string; icon: React.ElementType; state: SyncState | null }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-slate-400" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        {state?.last_error && <AlertTriangle className="w-3.5 h-3.5 text-red-400 ml-auto" />}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-blue-500 text-[10px] font-bold uppercase tracking-wider mb-1">Copiados</p>
          <p className="text-xl font-black text-blue-700">{(state?.total_synced ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Último ID</p>
          <p className="text-xl font-black text-slate-700">#{state?.last_bol_id ?? 0}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Última sync</p>
          <p className="text-xs font-bold text-slate-600 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 shrink-0" />{fmt(state?.last_synced_at ?? null)}
          </p>
        </div>
      </div>
      {state?.last_error && (
        <p className="mt-3 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">{state.last_error}</p>
      )}
    </div>
  )
}

export default function BackupPage() {
  const [boletos,  setBoletos]  = useState<SyncState | null>(null)
  const [paquetes, setPaquetes] = useState<SyncState | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [syncing,  setSyncing]  = useState<string | null>(null)
  const [log,      setLog]      = useState<string[]>([])

  const fetchState = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/sync-legacy')
      const d = await r.json()
      setBoletos(d.boletos)
      setPaquetes(d.paquetes)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchState() }, [fetchState])

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  const runSync = async (type: 'boletos' | 'paquetes', runAll = false) => {
    setSyncing(type)
    setLog([])
    const maxIter = runAll ? 10000 : 1
    let i = 0

    try {
      while (i < maxIter) {
        addLog(`[${type}] Batch ${i + 1} — sincronizando...`)
        const r = await fetch('/api/admin/sync-legacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })
        const d = await r.json()
        const res: SyncResult = d.boletos ?? d.paquetes

        if (res.error) { addLog(`Error: ${res.error}`); break }
        addLog(`✓ ${res.synced} registros — total: ${res.totalSynced.toLocaleString()}`)

        if (res.done || res.synced === 0) {
          addLog(`✓ Sin más registros nuevos.`)
          break
        }
        i++
        if (!runAll) break
        await new Promise(r => setTimeout(r, 150))
      }
    } finally {
      setSyncing(null)
      fetchState()
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <DatabaseBackup className="w-6 h-6 text-[#c01515]" />
            Backup sistema anterior
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Copia boletos y paquetes del servidor Windows → Supabase.<br />
            Si AWS cae, los datos siguen accesibles en TEO.
          </p>
        </div>
        <button onClick={fetchState} disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Estado boletos */}
      <div className="mb-3">
        <StateCard label="Boletos de bus" icon={Ticket} state={boletos} />
        <div className="flex gap-2 mt-2">
          <button onClick={() => runSync('boletos', false)} disabled={!!syncing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-40 text-white font-bold text-sm rounded-xl">
            {syncing === 'boletos' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            1 batch (200)
          </button>
          <button onClick={() => runSync('boletos', true)} disabled={!!syncing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold text-sm rounded-xl">
            {syncing === 'boletos' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
            Todo pendiente
          </button>
        </div>
      </div>

      {/* Estado paquetes */}
      <div className="mb-4">
        <StateCard label="Paquetes" icon={Package} state={paquetes} />
        <div className="flex gap-2 mt-2">
          <button onClick={() => runSync('paquetes', false)} disabled={!!syncing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-40 text-white font-bold text-sm rounded-xl">
            {syncing === 'paquetes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            1 batch (200)
          </button>
          <button onClick={() => runSync('paquetes', true)} disabled={!!syncing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold text-sm rounded-xl">
            {syncing === 'paquetes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
            Todo pendiente
          </button>
        </div>
      </div>

      <p className="text-slate-400 text-xs mb-4 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        El cron automático corre cada noche a las 2am y sincroniza los registros nuevos de ambas tablas.
      </p>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Log</p>
          <div className="space-y-1">
            {log.map((line, i) => (
              <p key={i} className={`text-xs font-mono ${
                line.startsWith('Error') ? 'text-red-400' :
                line.startsWith('✓')    ? 'text-emerald-400' : 'text-slate-300'
              }`}>{line}</p>
            ))}
            {syncing && (
              <p className="text-slate-500 text-xs font-mono flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> procesando...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
