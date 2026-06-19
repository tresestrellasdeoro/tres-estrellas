'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Printer, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { PACKAGE_SIZES, STATUS_META, type PackageSize, type PackageStatus } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'

interface Pkg {
  id: string
  tracking_number: string
  sender_name: string
  recipient_name: string
  recipient_phone: string
  size: PackageSize
  weight_lbs: number
  price: number
  status: PackageStatus
  created_at: string
  notes: string | null
  origin: { name: string; city: string } | null
  destination: { name: string; city: string } | null
}

export default function MisPaquetesPage() {
  const [packages, setPackages]   = useState<Pkg[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [showNew, setShowNew]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/packages')
    const data = await res.json()
    if (data.packages) setPackages(data.packages)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const printLabel = (tracking: string) => {
    window.open(`/api/packages/label?n=${tracking}`, '_blank')
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Package className="w-6 h-6 text-[#c01515]" />
            Mis paquetes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Rastrea y gestiona tus envíos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo envío
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando...</div>}

      {!loading && packages.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Sin envíos registrados</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Crea tu primer envío y rastréalo aquí.</p>
          <button onClick={() => setShowNew(true)}
            className="px-5 py-2.5 bg-[#c01515] text-white rounded-xl font-bold text-sm">
            Crear envío
          </button>
        </div>
      )}

      <div className="space-y-3">
        {packages.map(pkg => {
          const meta     = STATUS_META[pkg.status]
          const sizeInfo = PACKAGE_SIZES[pkg.size]
          const isOpen   = expanded === pkg.id

          return (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : pkg.id)}>
                <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-black text-[#0a1628] text-sm">{pkg.tracking_number}</p>
                  <p className="text-slate-500 text-xs truncate">Para: {pkg.recipient_name}</p>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                  {meta.label}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
                  {/* Status steps */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estado del envío</p>
                    <div className="space-y-2">
                      {(['label_created','received','in_transit','arrived','delivered'] as PackageStatus[]).map(s => {
                        const m       = STATUS_META[s]
                        const isDone  = m.step <= STATUS_META[pkg.status].step && pkg.status !== 'returned'
                        const isCurr  = s === pkg.status
                        return (
                          <div key={s} className={`flex items-center gap-2 text-xs ${isDone ? m.color : 'text-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full shrink-0 ${isDone ? m.bg.replace('bg-','bg-') : 'bg-slate-200'} ${isCurr ? 'ring-2 ring-offset-1 ring-current' : ''}`} />
                            <span className={`font-semibold ${isCurr ? 'font-black' : ''}`}>{m.label}</span>
                          </div>
                        )
                      })}
                      {pkg.status === 'returned' && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                          <div className="w-3 h-3 rounded-full bg-red-100 ring-2 ring-offset-1 ring-red-500" />
                          <span className="font-black">Devuelto al remitente</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Tamaño</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{sizeInfo?.label}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Precio</p>
                      <p className="text-slate-700 font-semibold mt-0.5">${Number(pkg.price).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Origen</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{pkg.origin?.city ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Destino</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{pkg.destination?.city ?? '—'}</p>
                    </div>
                  </div>
                  {pkg.notes && <p className="text-xs text-slate-500 italic">"{pkg.notes}"</p>}

                  <button onClick={() => printLabel(pkg.tracking_number)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors">
                    <Printer className="w-4 h-4" />
                    Imprimir etiqueta
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNew && (
        <NewPackageModal onClose={() => setShowNew(false)} onCreated={(pkg) => {
          setPackages(prev => [pkg as Pkg, ...prev])
          setShowNew(false)
          printLabel((pkg as Pkg).tracking_number)
        }} />
      )}
    </div>
  )
}
