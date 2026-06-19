'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Printer, Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { PACKAGE_SIZES, STATUS_META, type PackageSize, type PackageStatus } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'

interface Pkg {
  id: string
  tracking_number: string
  sender_name: string
  sender_phone: string
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

const ALL_STATUSES: PackageStatus[] = ['label_created','received','in_transit','arrived','delivered','returned']

export default function AdminPaquetesPage() {
  const [packages, setPackages]   = useState<Pkg[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [search, setSearch]       = useState('')
  const [updating, setUpdating]   = useState<string | null>(null)

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const res  = await fetch(`/api/packages?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`)
    const data = await res.json()
    if (data.packages) setPackages(data.packages)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const doSearch = (e: React.FormEvent) => { e.preventDefault(); load(search) }

  const changeStatus = async (pkg: Pkg, status: PackageStatus) => {
    setUpdating(pkg.id)
    await fetch('/api/packages', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: pkg.id, status }),
    })
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status } : p))
    setUpdating(null)
  }

  const printLabel = (tracking: string) => window.open(`/api/packages/label?n=${tracking}`, '_blank')

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Package className="w-6 h-6 text-[#c01515]" />
            Paquetes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de envíos y encomiendas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(search)} disabled={loading}
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

      {/* Search */}
      <form onSubmit={doSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por tracking, remitente o destinatario..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors">
          Buscar
        </button>
      </form>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando...</div>}

      {!loading && packages.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Sin envíos registrados</p>
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
                  <p className="text-slate-500 text-xs">{pkg.sender_name} → {pkg.recipient_name}</p>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-xs text-slate-400">{pkg.origin?.city ?? '?'} → {pkg.destination?.city ?? '?'}</span>
                  <span className="font-black text-slate-700 text-sm">${Number(pkg.price).toFixed(2)}</span>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                  {meta.label}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Tamaño</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{sizeInfo?.label}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Peso</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{pkg.weight_lbs > 0 ? `${pkg.weight_lbs} lbs` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Remitente</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{pkg.sender_name}</p>
                      <p className="text-slate-400">{pkg.sender_phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Destinatario</p>
                      <p className="text-slate-700 font-semibold mt-0.5">{pkg.recipient_name}</p>
                      <p className="text-slate-400">{pkg.recipient_phone}</p>
                    </div>
                  </div>

                  {pkg.notes && <p className="text-xs text-slate-500 italic bg-white rounded-lg px-3 py-2 border border-slate-100">"{pkg.notes}"</p>}

                  {/* Status update */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cambiar estado</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_STATUSES.map(s => {
                        const m = STATUS_META[s]
                        return (
                          <button key={s} onClick={() => changeStatus(pkg, s)} disabled={updating === pkg.id || pkg.status === s}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${
                              pkg.status === s ? `${m.bg} ${m.color} border-current opacity-80` : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                            } disabled:cursor-not-allowed`}>
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button onClick={() => printLabel(pkg.tracking_number)}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors">
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
        }} />
      )}
    </div>
  )
}
