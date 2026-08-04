'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Play, Square, Banknote, CreditCard, Package, Ticket, CheckCircle2, AlertCircle, AlertTriangle, Loader2, RefreshCw, MapPin } from 'lucide-react'

interface Sucursal {
  id:   string
  name: string
  code: string
}

interface Turno {
  id:             string
  inicio:         string
  fin:            string | null
  estado:         'activo' | 'cerrado'
  total_boletos:  number
  total_efectivo: number
  total_tarjeta:  number
  total_paquetes: number
  total_general:  number
  sucursales:     { name: string; code: string } | null
}

function formatDuration(start: string) {
  const ms    = Date.now() - new Date(start).getTime()
  const h     = Math.floor(ms / 3_600_000)
  const m     = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function TurnoPage() {
  const [turno,    setTurno]    = useState<Turno | null | undefined>(undefined) // undefined = cargando
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [notas,    setNotas]    = useState('')
  const [tick,      setTick]      = useState(0)
  const [qbWarning, setQbWarning] = useState(false)
  const [cajeroNombre, setCajeroNombre] = useState('')
  const [sucursales,   setSucursales]   = useState<Sucursal[]>([])
  const [selectedSuc,  setSelectedSuc]  = useState('')

  const fetchTurno = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/turno')
      const d = await r.json()
      setTurno(d.turno ?? null)
    } catch {
      setTurno(null)
    }
  }, [])

  useEffect(() => {
    fetchTurno()
    fetch('/api/auth/me').then(r => r.json()).then(d => setCajeroNombre(d.full_name ?? '')).catch(() => {})
    fetch('/api/staff/sucursales')
      .then(r => r.json())
      .then(d => {
        setSucursales(d.sucursales ?? [])
        if (d.sucursales?.length === 1) setSelectedSuc(d.sucursales[0].id)
      })
      .catch(() => {})
  }, [fetchTurno])

  // Tick cada minuto para actualizar la duración del turno activo
  useEffect(() => {
    if (!turno) return
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [turno])

  const iniciarTurno = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/staff/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'iniciar', sucursal_id: selectedSuc || undefined }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error al iniciar turno'); return }
      setTurno(d.turno)
      setSuccess('¡Turno iniciado! Ya puedes realizar ventas.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('No se pudo conectar al servidor.')
    } finally {
      setLoading(false)
    }
  }

  const cerrarTurno = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/staff/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cerrar', notas }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error al cerrar turno'); return }
      setShowConfirm(false)
      setQbWarning(d.qb_synced === false)
      setSuccess('Turno cerrado correctamente.')
      await fetchTurno()
      setNotas('')
    } catch {
      setError('No se pudo conectar al servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (turno === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#c8a951] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Mi Turno</h1>
          {cajeroNombre && <p className="text-slate-500 text-sm">{cajeroNombre}</p>}
        </div>
        <button onClick={fetchTurno} className="text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {qbWarning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-900 font-bold text-sm">Reporte pendiente en QuickBooks</p>
            <p className="text-amber-800 text-xs mt-1">
              El turno fue cerrado correctamente, pero el envío a QuickBooks no pudo completarse.
              El administrador verá este cierre como pendiente y podrá reintentarlo desde Contabilidad.
            </p>
          </div>
        </div>
      )}

      {/* Sin turno activo */}
      {!turno && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Sin turno activo</h2>
            <p className="text-slate-500 text-sm">
              Debes iniciar tu turno antes de realizar ventas.<br />
              Se registrará tu hora de entrada y todas tus operaciones.
            </p>
          </div>

          {/* Selector de sucursal */}
          {sucursales.length > 0 && (
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <MapPin className="w-3.5 h-3.5" />
                Sucursal donde trabajas hoy
              </label>
              <select
                value={selectedSuc}
                onChange={e => setSelectedSuc(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#0a1e42]/40 focus:bg-white transition-colors"
              >
                <option value="">-- Selecciona sucursal --</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={iniciarTurno}
            disabled={loading || (sucursales.length > 0 && !selectedSuc)}
            className="w-full flex items-center justify-center gap-2 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? 'Iniciando...' : 'Iniciar turno'}
          </button>
          {sucursales.length > 0 && !selectedSuc && (
            <p className="text-center text-slate-400 text-xs mt-2">Selecciona una sucursal para continuar</p>
          )}
        </div>
      )}

      {/* Turno activo */}
      {turno && turno.estado === 'activo' && (
        <div className="space-y-4">

          {/* Estado del turno */}
          <div className="bg-[#0a1e42] text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 font-bold text-sm uppercase tracking-widest">Turno activo</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/50 text-xs mb-0.5">Inicio</p>
                <p className="text-white font-bold text-lg">{formatTime(turno.inicio)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs mb-0.5">Duración</p>
                <p className="text-white font-bold text-lg">{formatDuration(turno.inicio)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs mb-0.5">Sucursal</p>
                <p className="text-white font-semibold">{turno.sucursales?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs mb-0.5">Código</p>
                <p className="text-white font-semibold">{turno.sucursales?.code ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Resumen de ventas del turno */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Mis ventas en este turno</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                <Ticket className="w-5 h-5 text-[#0a1e42] shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Boletos</p>
                  <p className="font-bold text-slate-800">{turno.total_boletos}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                <Banknote className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Efectivo</p>
                  <p className="font-bold text-slate-800">${turno.total_efectivo.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Tarjeta</p>
                  <p className="font-bold text-slate-800">${turno.total_tarjeta.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                <Package className="w-5 h-5 text-[#c8a951] shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Paquetes</p>
                  <p className="font-bold text-slate-800">${turno.total_paquetes.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-bold text-sm">Total general</span>
              <span className="text-[#0a1e42] font-black text-lg">${turno.total_general.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#c01515] hover:bg-[#a01010] text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            <Square className="w-4 h-4" />
            Cerrar turno y enviar reporte
          </button>
        </div>
      )}

      {/* Modal de confirmación de cierre */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-slate-800 text-lg mb-1">¿Cerrar turno?</h3>
            <p className="text-slate-500 text-sm mb-4">
              Se calculará el resumen final y se enviará el reporte a QuickBooks automáticamente.
            </p>

            {turno && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Boletos vendidos</span>
                  <span className="font-bold">{turno.total_boletos}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Efectivo</span>
                  <span className="font-bold">${turno.total_efectivo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tarjeta</span>
                  <span className="font-bold">${turno.total_tarjeta.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-800 pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>${turno.total_general.toFixed(2)}</span>
                </div>
              </div>
            )}

            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas del turno (opcional)..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:border-[#0a1e42]/30"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={cerrarTurno}
                disabled={loading}
                className="flex-1 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
