'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, Plus, Printer, Search, RefreshCw,
  ChevronDown, ChevronUp, Settings, Check, X,
  History, Clock, MapPin, User, Phone,
} from 'lucide-react'
import { PACKAGE_SIZES, STATUS_META, type PackageSize, type PackageStatus } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'

// ─── Pricing config ───────────────────────────────────────────────────────────
interface PricingRow { id: string; label: string; price: number; max_lbs: number | null; dims: string | null }

function PricingConfig() {
  const [rows, setRows]       = useState<PricingRow[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft]     = useState<Partial<PricingRow>>({})
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/admin/package-pricing').then(r => r.json()).then(d => { if (d.pricing) setRows(d.pricing) })
  }, [])

  const startEdit = (row: PricingRow) => { setEditing(row.id); setDraft({ price: row.price, max_lbs: row.max_lbs ?? undefined, dims: row.dims ?? undefined }); setError('') }

  const save = async (id: string) => {
    if (!draft.price || Number(draft.price) <= 0) { setError('El precio debe ser mayor a 0'); return }
    setSaving(true)
    const res  = await fetch('/api/admin/package-pricing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, price: draft.price, max_lbs: draft.max_lbs, dims: draft.dims }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al guardar'); setSaving(false); return }
    setRows(prev => prev.map(r => r.id === id ? data.pricing : r))
    setEditing(null); setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-[#c01515]" />
        <h2 className="font-black text-lg text-[#0a1628]">Configuración de precios</h2>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-700 text-sm">{row.label}</p>
              {editing !== row.id && <p className="text-slate-400 text-xs">{row.dims || ''}</p>}
            </div>
            {editing === row.id ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={draft.price ?? ''} onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value) }))}
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-[#c01515]" autoFocus />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">lbs:</span>
                  <input type="number" min="0" step="0.1" value={draft.max_lbs ?? ''} onChange={e => setDraft(d => ({ ...d, max_lbs: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[#c01515]" />
                </div>
                <button onClick={() => save(row.id)} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(null)} disabled={saving} className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-black text-[#0a1628]">${Number(row.price).toFixed(2)}</span>
                {row.max_lbs && <span className="text-xs text-slate-400">{row.max_lbs} lbs</span>}
                <button onClick={() => startEdit(row)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-[#c01515] hover:text-[#c01515] transition-colors">Editar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Current packages tab ────────────────────────────────────────────────────
interface Pkg {
  id: string; tracking_number: string; sender_name: string; sender_phone: string
  recipient_name: string; recipient_phone: string; size: PackageSize; weight_lbs: number
  price: number; status: PackageStatus; created_at: string; notes: string | null
  origin: { name: string; city: string } | null; destination: { name: string; city: string } | null
}

const ALL_STATUSES: PackageStatus[] = ['label_created','received','in_transit','arrived','delivered','returned']

function CurrentPackages() {
  const [packages, setPackages] = useState<Pkg[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew]   = useState(false)
  const [search, setSearch]     = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

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
    await fetch('/api/packages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pkg.id, status }) })
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status } : p))
    setUpdating(null)
  }

  const printLabel = (tracking: string) => window.open(`/api/packages/label?n=${tracking}`, '_blank')

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <p className="text-slate-400 text-sm">{packages.length} envíos activos en el sistema nuevo</p>
        <div className="flex gap-2">
          <button onClick={() => load(search)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Nuevo envío
          </button>
        </div>
      </div>

      <form onSubmit={doSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tracking, remitente o destinatario..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors">Buscar</button>
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
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider">Tamaño</p><p className="text-slate-700 font-semibold mt-0.5">{sizeInfo?.label}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider">Peso</p><p className="text-slate-700 font-semibold mt-0.5">{pkg.weight_lbs > 0 ? `${pkg.weight_lbs} lbs` : '—'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider">Remitente</p><p className="text-slate-700 font-semibold mt-0.5">{pkg.sender_name}</p><p className="text-slate-400">{pkg.sender_phone}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider">Destinatario</p><p className="text-slate-700 font-semibold mt-0.5">{pkg.recipient_name}</p><p className="text-slate-400">{pkg.recipient_phone}</p></div>
                  </div>
                  {pkg.notes && <p className="text-xs text-slate-500 italic bg-white rounded-lg px-3 py-2 border border-slate-100">"{pkg.notes}"</p>}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cambiar estado</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_STATUSES.map(s => {
                        const m = STATUS_META[s]
                        return (
                          <button key={s} onClick={() => changeStatus(pkg, s)} disabled={updating === pkg.id || pkg.status === s}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${pkg.status === s ? `${m.bg} ${m.color} border-current opacity-80` : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'} disabled:cursor-not-allowed`}>
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <button onClick={() => printLabel(pkg.tracking_number)}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors">
                    <Printer className="w-4 h-4" /> Imprimir etiqueta
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNew && (
        <NewPackageModal onClose={() => setShowNew(false)} onCreated={(pkg) => { setPackages(prev => [pkg as Pkg, ...prev]); setShowNew(false) }} />
      )}
    </>
  )
}

// ─── Legacy packages tab ──────────────────────────────────────────────────────
interface LegacyPkg {
  id: number; codigo: string; tipo: string | null; precio: number | null; peso: number | null
  remitente: string | null; receptor: string | null; origen: string | null; destino: string | null
  fecha_envio: string | null; descripcion: string | null; direccion: string | null
  contacto: string | null; entregado: boolean; nombre_recibe: string | null; fecha_recepcion: string | null
}

function LegacyPackages() {
  const [paquetes, setPaquetes] = useState<LegacyPkg[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [offset, setOffset]     = useState(0)
  const PAGE = 60

  const load = useCallback(async (q = '', off = 0) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(off) })
    if (q) params.set('q', q)
    const res  = await fetch(`/api/admin/legacy-paquetes?${params}`)
    const data = await res.json()
    setPaquetes(data.paquetes ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const doSearch = (e: React.FormEvent) => { e.preventDefault(); setOffset(0); load(search, 0) }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-slate-400 text-sm">{total.toLocaleString('es-MX')} paquetes del sistema anterior (2016–2025)</p>
        <button onClick={() => load(search, offset)} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <form onSubmit={doSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Código, remitente, receptor, origen o destino..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors">Buscar</button>
      </form>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando...</div>}

      {!loading && paquetes.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Sin resultados</p>
        </div>
      )}

      <div className="space-y-2">
        {paquetes.map(pkg => {
          const isOpen = expanded === pkg.id
          return (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : pkg.id)}>
                <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-black text-[#0a1628] text-sm">{pkg.codigo}</p>
                    {pkg.tipo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{pkg.tipo}</span>}
                  </div>
                  <p className="text-slate-500 text-xs truncate">{pkg.remitente ?? '—'} → {pkg.receptor ?? '—'}</p>
                </div>
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  {pkg.origen && pkg.destino && <span className="text-xs text-slate-400">{pkg.origen} → {pkg.destino}</span>}
                  {pkg.precio != null && <span className="font-black text-slate-700 text-sm">${Number(pkg.precio).toFixed(2)}</span>}
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.entregado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {pkg.entregado ? 'Entregado' : 'Sin confirmar'}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div className="flex items-start gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Remitente</p>
                        <p className="text-slate-700 font-semibold mt-0.5">{pkg.remitente ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Receptor</p>
                        <p className="text-slate-700 font-semibold mt-0.5">{pkg.receptor ?? '—'}</p>
                        {pkg.nombre_recibe && pkg.nombre_recibe !== pkg.receptor && (
                          <p className="text-slate-400">Recibió: {pkg.nombre_recibe}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Contacto</p>
                        <p className="text-slate-700 font-semibold mt-0.5">{pkg.contacto ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Ruta</p>
                        <p className="text-slate-700 font-semibold mt-0.5">{pkg.origen ?? '—'} → {pkg.destino ?? '—'}</p>
                        {pkg.direccion && <p className="text-slate-400 mt-0.5">{pkg.direccion}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Fechas</p>
                        <p className="text-slate-700 font-semibold mt-0.5">Envío: {fmtDate(pkg.fecha_envio)}</p>
                        {pkg.fecha_recepcion && <p className="text-slate-400">Recepción: {fmtDate(pkg.fecha_recepcion)}</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Detalles</p>
                      {pkg.peso != null && <p className="text-slate-700 font-semibold mt-0.5">{pkg.peso} lbs · ${Number(pkg.precio ?? 0).toFixed(2)}</p>}
                      {pkg.descripcion && <p className="text-slate-400 mt-0.5">{pkg.descripcion}</p>}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">SISTEMA LEGACY — Solo lectura</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Paginación */}
      {total > PAGE && (
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => { const o = Math.max(0, offset - PAGE); setOffset(o); load(search, o) }}
            disabled={offset === 0 || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Anterior
          </button>
          <span className="text-xs text-slate-400 font-semibold">
            {offset + 1}–{Math.min(offset + PAGE, total)} de {total.toLocaleString('es-MX')}
          </span>
          <button onClick={() => { const o = offset + PAGE; setOffset(o); load(search, o) }}
            disabled={offset + PAGE >= total || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Siguiente →
          </button>
        </div>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Tab = 'current' | 'legacy'

export default function AdminPaquetesPage() {
  const [tab, setTab] = useState<Tab>('current')

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PricingConfig />

      {/* Header + tabs */}
      <div className="mb-6">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2 mb-4">
          <Package className="w-6 h-6 text-[#c01515]" />
          Paquetes
        </h1>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('current')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'current' ? 'bg-white shadow-sm text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
            <Package className="w-4 h-4" /> Actuales
          </button>
          <button
            onClick={() => setTab('legacy')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'legacy' ? 'bg-white shadow-sm text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
            <History className="w-4 h-4" /> Histórico
          </button>
        </div>
      </div>

      {tab === 'current' ? <CurrentPackages /> : <LegacyPackages />}
    </div>
  )
}
