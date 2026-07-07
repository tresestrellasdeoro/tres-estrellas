'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, RefreshCw, Plug, PlugZap, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QBStatus {
  connected: boolean
  settings: { realm_id: string; expires_at: string; updated_at: string } | null
}

function ConfiguracionContent() {
  const params = useSearchParams()
  const [status, setStatus]   = useState<QBStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/quickbooks/status')
      const data = await res.json()
      setStatus(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const qb = params.get('qb')
    if (qb === 'connected') setToast({ type: 'success', msg: 'QuickBooks conectado exitosamente' })
    if (qb === 'error')     setToast({ type: 'error',   msg: 'Error al conectar QuickBooks. Intenta de nuevo.' })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar QuickBooks? Las ventas nuevas no se sincronizarán.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/admin/quickbooks/status', { method: 'DELETE' })
      setToast({ type: 'success', msg: 'QuickBooks desconectado' })
      fetchStatus()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Integraciones y ajustes del sistema</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />
          }
          {toast.msg}
        </div>
      )}

      {/* QuickBooks Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2CA01C]/10 border border-[#2CA01C]/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-[#2CA01C]" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 text-lg">QuickBooks Online</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Sincroniza automáticamente cada venta de boletos y paquetes a tu contabilidad.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verificando conexión...
            </div>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-semibold text-sm">Conectado</span>
                <span className="text-slate-400 text-xs ml-1">· Company ID: {status.settings?.realm_id}</span>
              </div>
              <p className="text-slate-400 text-xs">
                Última sincronización: {status.settings?.updated_at
                  ? new Date(status.settings.updated_at).toLocaleString('es-MX')
                  : '—'
                }
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={fetchStatus}
                  className="rounded-xl text-xs border-slate-200">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Verificar
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-xl text-xs border-red-200 text-red-600 hover:bg-red-50">
                  <PlugZap className="w-3.5 h-3.5 mr-1.5" />
                  {disconnecting ? 'Desconectando...' : 'Desconectar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-500 font-semibold text-sm">No conectado</span>
              </div>
              <p className="text-slate-400 text-sm">
                Conecta tu cuenta de QuickBooks Online para que cada venta se registre automáticamente en tu contabilidad.
              </p>
              <Button
                onClick={() => window.location.href = '/api/admin/quickbooks/connect'}
                className="bg-[#2CA01C] hover:bg-[#258418] text-white font-bold rounded-xl text-sm"
              >
                <Plug className="w-4 h-4 mr-2" />
                Conectar QuickBooks
              </Button>
            </div>
          )}
        </div>

        {/* What syncs */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Qué se sincroniza</p>
          <ul className="space-y-2 text-sm text-slate-500">
            {[
              'Venta de boleto → Sales Receipt',
              'Envío de paquete → Sales Receipt',
              'Pago con tarjeta o efectivo registrado',
              'Nombre del pasajero y ruta en la descripción',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center gap-2 text-slate-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Cargando...
      </div>
    }>
      <ConfiguracionContent />
    </Suspense>
  )
}
