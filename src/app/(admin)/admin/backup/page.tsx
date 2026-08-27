'use client'

import { useState, useEffect, useCallback } from 'react'
import { DatabaseBackup, RefreshCw, PlayCircle, CheckCircle2, AlertTriangle, Loader2, Clock, Server } from 'lucide-react'

interface SyncState {
  id:             string
  last_bol_id:    number
  total_synced:   number
  last_synced_at: string | null
  last_error:     string | null
}

interface SyncResult {
  synced:      number
  lastBolId:   number
  totalSynced: number
  done:        boolean
  error?:      string
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function BackupPage() {
  const [state,    setState]   = useState<SyncState | null>(null)
  const [loading,  setLoading] = useState(false)
  const [syncing,  setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [log,      setLog]     = useState<string[]>([])

  const fetchState = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/sync-legacy')
      const d = await r.json()
      setState(d.state)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchState() }, [fetchState])

  const runSync = async (runAll = false) => {
    setSyncing(true)
    setLastResult(null)
    setLog([])
    let iterations = 0
    const maxIter  = runAll ? 500 : 1

    try {
      while (iterations < maxIter) {
        const addLog = (msg: string) => setLog(prev => [...prev, msg])
        addLog(`Batch ${iterations + 1} — sincronizando...`)

        const r = await fetch('/api/admin/sync-legacy', { method: 'POST' })
        const d: SyncResult = await r.json()

        setLastResult(d)
        if (d.error) {
          addLog(`Error: ${d.error}`)
          break
        }

        addLog(`✓ ${d.synced} registros — total acumulado: ${d.totalSynced.toLocaleString()}`)

        if (d.done || d.synced === 0) {
          addLog('✓ Sincronización completa — no hay más registros nuevos.')
          break
        }

        iterations++
        if (!runAll) break
        await new Promise(r => setTimeout(r, 200)) // pequeña pausa entre batches
      }
    } finally {
      setSyncing(false)
      fetchState()
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <DatabaseBackup className="w-6 h-6 text-[#c01515]" />
            Backup sistema anterior
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Copia el historial de boletos del servidor Windows → Supabase.<br />
            Si el servidor AWS cae, los datos siguen accesibles en TEO.
          </p>
        </div>
        <button onClick={fetchState} disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado actual</p>
        </div>

        {loading && !state ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">Registros copiados</p>
              <p className="text-2xl font-black text-blue-700">{(state?.total_synced ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Último boleto</p>
              <p className="text-2xl font-black text-slate-700">#{state?.last_bol_id ?? 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Última sync</p>
              <p className="text-sm font-bold text-slate-700 flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {fmt(state?.last_synced_at ?? null)}
              </p>
            </div>
          </div>
        )}

        {state?.last_error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs font-semibold">{state.last_error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Acciones</p>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => runSync(false)} disabled={syncing}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Sync 1 batch (200)
          </button>
          <button onClick={() => runSync(true)} disabled={syncing}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
            Sync todo pendiente
          </button>
        </div>

        <p className="text-slate-400 text-xs mt-3 flex items-start gap-1">
          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          El cron automático corre cada noche a las 2am y sincroniza automáticamente los boletos nuevos del día.
        </p>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Log</p>
          <div className="space-y-1">
            {log.map((line, i) => (
              <p key={i} className={`text-xs font-mono ${line.startsWith('Error') ? 'text-red-400' : line.startsWith('✓') ? 'text-emerald-400' : 'text-slate-300'}`}>
                {line}
              </p>
            ))}
            {syncing && (
              <p className="text-slate-500 text-xs font-mono flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> procesando...
              </p>
            )}
          </div>
          {lastResult && !syncing && !lastResult.error && (
            <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              {lastResult.done
                ? `Completado — ${lastResult.totalSynced.toLocaleString()} registros en Supabase`
                : `Batch completado — ${lastResult.synced} nuevos, ${lastResult.totalSynced.toLocaleString()} total`
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
