'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Package, ScanLine, CheckCircle2, AlertCircle, Plus, Printer,
  CreditCard, Banknote, Loader2, Search, Clock, ChevronRight, X, Wifi,
  Ban, History, MapPin, AlertTriangle, ChevronDown, ChevronUp, Phone, User, RefreshCw,
} from 'lucide-react'
import { STATUS_META, PACKAGE_SIZES, type PackageStatus, type PackageSize } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'
import { SquareCard, type SquareCardHandle } from '@/components/public/square-card'

interface PackageEvent {
  status:     string
  location:   string | null
  notes:      string | null
  created_at: string
}

const SCAN_STATUSES: { value: PackageStatus; label: string; desc: string; color: string }[] = [
  { value: 'received',   label: 'Recibido en terminal', desc: 'El paquete ingresó a la terminal de origen',  color: 'bg-blue-50 border-blue-300 text-blue-700' },
  { value: 'in_transit', label: 'En tránsito',          desc: 'El paquete salió en el autobús',              color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { value: 'arrived',    label: 'Llegó a destino',      desc: 'El paquete llegó a la terminal de destino',   color: 'bg-purple-50 border-purple-300 text-purple-700' },
  { value: 'delivered',  label: 'Entregado',            desc: 'El paquete fue entregado al destinatario',    color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'returned',   label: 'Devuelto',             desc: 'No se pudo entregar, regresa al remitente',   color: 'bg-red-50 border-red-300 text-red-700' },
]

interface Pkg {
  id: string
  tracking_number: string
  sender_name: string
  sender_phone: string
  sender_email?: string
  recipient_name: string
  recipient_phone: string
  recipient_email?: string
  status: PackageStatus
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method: string | null
  paid_at: string | null
  price: number
  size: PackageSize
  notes?: string
  created_at: string
  origin: { name: string; city: string } | null
  destination: { name: string; city: string } | null
}

// ── Legacy packages component ─────────────────────────────────────────────────

interface LegacyPkg {
  id: number; codigo: string; tipo: string | null; precio: number | null; peso: number | null
  remitente: string | null; receptor: string | null; origen: string | null; destino: string | null
  fecha_envio: string | null; descripcion: string | null; direccion: string | null
  contacto: string | null; entregado: boolean; nombre_recibe: string | null; fecha_recepcion: string | null
}

function LegacyPackages() {
  const [paquetes, setPaquetes] = useState<LegacyPkg[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
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

  const doSearch = (e: React.FormEvent) => { e.preventDefault(); setOffset(0); load(search, 0) }
  const fmtDate  = (d: string | null) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-slate-400 text-sm">{total > 0 ? `${total.toLocaleString('es-MX')} paquetes (2016–2025)` : 'Busca un paquete del sistema anterior'}</p>
        {total > 0 && (
          <button onClick={() => load(search, offset)} disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <form onSubmit={doSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Código, remitente, receptor, origen o destino..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 bg-white" />
        </div>
        <button type="submit" disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
        </button>
      </form>

      {!loading && paquetes.length === 0 && search && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-500 font-semibold text-sm">Sin resultados para "{search}"</p>
        </div>
      )}

      {!loading && paquetes.length === 0 && !search && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Historial de paquetes 2016–2025</p>
          <p className="text-slate-400 text-sm mt-1">Escribe el nombre del remitente, receptor o código para buscar</p>
        </div>
      )}

      <div className="space-y-2">
        {paquetes.map(pkg => {
          const isOpen = expanded === pkg.id
          return (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3.5 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : pkg.id)}>
                <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono font-black text-[#0a1628] text-sm">{pkg.codigo}</p>
                    {pkg.tipo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{pkg.tipo}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.entregado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {pkg.entregado ? 'Entregado' : 'Sin confirmar'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{pkg.remitente ?? '—'} → {pkg.receptor ?? '—'}</p>
                  {(pkg.origen || pkg.destino) && (
                    <p className="text-slate-400 text-[10px]">{pkg.origen} → {pkg.destino}{pkg.fecha_envio && ` · ${fmtDate(pkg.fecha_envio)}`}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {pkg.precio != null && <span className="font-black text-slate-700 text-sm">${Number(pkg.precio).toFixed(2)}</span>}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
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
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Fechas</p>
                      <p className="text-slate-700 font-semibold mt-0.5">Envío: {fmtDate(pkg.fecha_envio)}</p>
                      {pkg.fecha_recepcion && <p className="text-slate-400">Recepción: {fmtDate(pkg.fecha_recepcion)}</p>}
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider">Detalles</p>
                      {pkg.peso != null && <p className="text-slate-700 font-semibold mt-0.5">{pkg.peso} lbs · ${Number(pkg.precio ?? 0).toFixed(2)}</p>}
                      {pkg.descripcion && <p className="text-slate-400 mt-0.5">{pkg.descripcion}</p>}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">SISTEMA LEGACY — Solo lectura</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between">
          <button onClick={() => { const o = Math.max(0, offset - PAGE); setOffset(o); load(search, o) }}
            disabled={offset === 0 || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
            ← Anterior
          </button>
          <span className="text-xs text-slate-400 font-semibold">
            {offset + 1}–{Math.min(offset + PAGE, total)} de {total.toLocaleString('es-MX')}
          </span>
          <button onClick={() => { const o = offset + PAGE; setOffset(o); load(search, o) }}
            disabled={offset + PAGE >= total || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffPaquetesPage() {
  const [tab, setTab] = useState<'current' | 'legacy'>('current')
  const [turnoActivo, setTurnoActivo] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/staff/turno')
      .then(r => r.json())
      .then(d => setTurnoActivo(!!d.turno))
      .catch(() => setTurnoActivo(false))
  }, [])

  // Scanner input
  const [scanValue, setScanValue]   = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError]   = useState('')
  const scanRef                     = useRef<HTMLInputElement>(null)

  // List + search
  const [packages, setPackages]   = useState<Pkg[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [search, setSearch]       = useState('')
  const [searching, setSearching] = useState(false)

  // Selected package detail
  const [selected, setSelected]   = useState<Pkg | null>(null)
  const [lookupErr, setLookupErr] = useState('')

  // Status update
  const [newStatus, setNewStatus]   = useState<PackageStatus | ''>('')
  const [location, setLocation]     = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [saving, setSaving]         = useState(false)
  const [statusSuccess, setStatusSuccess] = useState('')

  // Payment
  const [payMode, setPayMode]       = useState<'card' | 'cash' | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError]     = useState('')
  const [paySuccess, setPaySuccess] = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const squareRef                   = useRef<SquareCardHandle>(null)

  const [showNew, setShowNew]       = useState(false)

  // Cancel
  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [cancelRazon,   setCancelRazon]   = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelMsg,     setCancelMsg]     = useState('')
  const [cancelError,   setCancelError]   = useState('')

  // Events timeline
  const [events,        setEvents]        = useState<PackageEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [showEvents,    setShowEvents]    = useState(false)

  // ── Fetch list ────────────────────────────────────────────────────────
  const fetchPackages = useCallback(async (q = '') => {
    q ? setSearching(true) : setListLoading(true)
    const url = q ? `/api/packages?q=${encodeURIComponent(q)}&limit=50` : '/api/packages?limit=30'
    const res  = await fetch(url)
    const data = await res.json()
    setPackages(data.packages ?? [])
    q ? setSearching(false) : setListLoading(false)
  }, [])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  // Auto-focus scanner on load
  useEffect(() => { scanRef.current?.focus() }, [])

  // ── Scanner lookup (exact tracking number, fires on Enter) ────────────
  const handleScan = useCallback(async () => {
    const tracking = scanValue.trim().toUpperCase()
    if (!tracking) return
    setScanLoading(true)
    setScanError('')
    try {
      const res  = await fetch(`/api/packages/track?n=${encodeURIComponent(tracking)}`)
      const data = await res.json()
      if (!res.ok || !data.package) {
        setScanError(`No se encontró el paquete "${tracking}"`)
        setScanValue('')
        setTimeout(() => scanRef.current?.focus(), 50)
        return
      }
      selectPkg(data.package as Pkg)
      setScanValue('')
      setScanError('')
      setTimeout(() => scanRef.current?.focus(), 50)
    } catch {
      setScanError('Error de conexión')
    } finally {
      setScanLoading(false)
    }
  }, [scanValue]) // selectPkg defined below, safe via closure

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchPackages(search), 350)
    return () => clearTimeout(t)
  }, [search, fetchPackages])

  // ── Select package from list ──────────────────────────────────────────
  const selectPkg = (pkg: Pkg) => {
    setSelected(pkg)
    setLookupErr('')
    setNewStatus('')
    setStatusSuccess('')
    setPayMode(null)
    setPayError('')
    setPaySuccess('')
    setCancelOpen(false)
    setCancelMsg('')
    setCancelError('')
    setEvents([])
    setShowEvents(false)
    // Auto-fetch events
    fetchEvents(pkg.tracking_number)
  }

  const clearSelected = () => {
    setSelected(null)
    setNewStatus('')
    setStatusSuccess('')
    setPayMode(null)
    setPayError('')
    setPaySuccess('')
    setEvents([])
    setShowEvents(false)
  }

  // ── Fetch event timeline ──────────────────────────────────────────────
  const fetchEvents = async (tracking: string) => {
    setEventsLoading(true)
    try {
      const res  = await fetch(`/api/packages/track?n=${encodeURIComponent(tracking)}`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch { /* silently ignore */ }
    finally { setEventsLoading(false) }
  }

  // ── Cancel package ────────────────────────────────────────────────────
  const openCancel = () => {
    setCancelRazon('')
    setCancelMsg('')
    setCancelError('')
    setCancelOpen(true)
  }

  const handleCancel = async () => {
    if (!selected) return
    setCancelLoading(true)
    setCancelError('')
    setCancelMsg('')
    try {
      const res  = await fetch('/api/packages/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: selected.id, razon: cancelRazon || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setCancelError(data.error || 'Error al cancelar'); return }
      setCancelMsg(data.message)
      const updated = { ...selected, status: 'cancelled' as PackageStatus, payment_status: data.payment_status }
      setSelected(updated)
      setPackages(prev => prev.map(p => p.id === selected.id ? updated : p))
      fetchEvents(selected.tracking_number)
      setTimeout(() => setCancelOpen(false), 3500)
    } catch {
      setCancelError('Error de conexión')
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Status update ─────────────────────────────────────────────────────
  const updateStatus = async () => {
    if (!selected || !newStatus) return
    setSaving(true)
    setStatusSuccess('')
    const res  = await fetch('/api/packages', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selected.id, status: newStatus, location: location || null, notes: statusNotes || null }),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = { ...selected, status: newStatus }
      setSelected(updated)
      setPackages(prev => prev.map(p => p.id === selected.id ? updated : p))
      setStatusSuccess(`Estado actualizado: ${STATUS_META[newStatus].label}`)
      setNewStatus('')
      setLocation('')
      setStatusNotes('')
    } else {
      setLookupErr(data.error ?? 'Error al actualizar')
    }
    setSaving(false)
  }

  // ── Collect payment ───────────────────────────────────────────────────
  const collectPayment = async (method: 'card' | 'cash') => {
    if (!selected) return
    setPayLoading(true)
    setPayError('')

    let source_id: string | undefined
    if (method === 'card') {
      try {
        source_id = await squareRef.current?.tokenize()
      } catch (err: any) {
        setPayError(err.message ?? 'Error al procesar tarjeta')
        setPayLoading(false)
        return
      }
    }

    const res  = await fetch('/api/packages/pay', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selected.id, payment_method: method, source_id }),
    })
    const data = await res.json()
    if (res.ok) {
      const label   = method === 'card' ? 'tarjeta' : 'efectivo'
      const updated = { ...selected, payment_status: 'paid' as const, payment_method: method, paid_at: new Date().toISOString() }
      setSelected(updated)
      setPackages(prev => prev.map(p => p.id === selected.id ? updated : p))
      setPaySuccess(`Pago recibido con ${label} — $${Number(selected.price).toFixed(2)}`)
      setPayMode(null)
    } else {
      setPayError(data.error ?? 'Error al procesar pago')
    }
    setPayLoading(false)
  }

  const printLabel = () => selected && window.open(`/api/packages/label?n=${selected.tracking_number}`, '_blank')

  // ── Helpers ───────────────────────────────────────────────────────────
  const paymentBadge = (p: Pkg) =>
    p.payment_status === 'paid'
      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Pagado</span>
      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">Pago pendiente</span>

  const statusBadge = (p: Pkg) => (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[p.status].bg} ${STATUS_META[p.status].color}`}>
      {STATUS_META[p.status].label}
    </span>
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-[#c01515]" />
            Paquetes
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {tab === 'current' ? 'Escanea la etiqueta QR o busca por nombre, teléfono o correo' : 'Historial del sistema anterior (2016–2025)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'current' && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Wifi className="w-3.5 h-3.5" />
                Escáner listo
              </div>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
                <Plus className="w-4 h-4" /> Nuevo envío
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        <button onClick={() => setTab('current')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'current' ? 'bg-white shadow-sm text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
          <Package className="w-4 h-4" /> Actuales
        </button>
        <button onClick={() => setTab('legacy')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'legacy' ? 'bg-white shadow-sm text-[#0a1628]' : 'text-slate-500 hover:text-slate-700'}`}>
          <History className="w-4 h-4" /> Histórico
        </button>
      </div>

      {turnoActivo === false && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sin turno activo</h2>
          <p className="text-slate-500 text-sm mb-6">
            Debes iniciar tu turno antes de gestionar paquetes.<br />
            Ve a "Mi turno" para comenzar.
          </p>
          <a href="/personal/turno"
            className="inline-flex items-center gap-2 bg-[#0a1e42] hover:bg-[#0f2c5c] text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-sm">
            <Clock className="w-4 h-4" />
            Ir a Mi turno
          </a>
        </div>
      )}

      {turnoActivo !== false && <>
      {tab === 'legacy' && <LegacyPackages />}

      {tab === 'current' && <>
      {/* ── SCANNER SECTION ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-[#c01515]/20 focus-within:border-[#c01515] p-4 shadow-sm mb-4 transition-colors">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-[#c01515]" />
          Escanear etiqueta de paquete
        </p>
        <div className="flex gap-2">
          <input
            ref={scanRef}
            value={scanValue}
            onChange={e => setScanValue(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder="TEO12345678 · Apunta el escáner QR aquí"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button onClick={handleScan} disabled={scanLoading || !scanValue.trim()}
            className="px-5 py-3 bg-[#c01515] hover:bg-[#a01010] text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-colors flex items-center gap-2">
            {scanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-slate-400 text-xs flex items-center gap-1">
            <ScanLine className="w-3 h-3" />
            El escáner enviará Enter automáticamente — solo apunta y dispara
          </p>
          <p className="text-slate-300 text-xs">o escribe el # manualmente</p>
        </div>
        {scanError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {scanError}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── LEFT: search + list ── */}
        <div className="lg:w-96 shrink-0 space-y-3">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nombre, teléfono, correo o # TEO..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 bg-white"
            />
            {(searching || (search && listLoading)) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
            {search && !searching && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {listLoading && !search ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Cargando...
              </div>
            ) : packages.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  {search ? 'Sin resultados para esa búsqueda' : 'No hay paquetes registrados'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {packages.map(pkg => (
                  <li key={pkg.id}>
                    <button
                      onClick={() => selectPkg(pkg)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                        selected?.id === pkg.id ? 'bg-[#c01515]/5 border-l-2 border-[#c01515]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-mono font-bold text-xs text-[#0a1628]">{pkg.tracking_number}</p>
                          {statusBadge(pkg)}
                          {paymentBadge(pkg)}
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {pkg.sender_name} → {pkg.recipient_name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(pkg.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {pkg.origin?.city ?? '?'} → {pkg.destination?.city ?? '?'}
                          {' · '}
                          <span className="font-bold text-[#c01515]">${Number(pkg.price).toFixed(0)}</span>
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── RIGHT: detail panel ── */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <ScanLine className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-semibold">Selecciona un paquete de la lista</p>
              <p className="text-slate-300 text-xs mt-1">o crea uno nuevo con el botón de arriba</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-mono font-black text-[#0a1628] text-xl">{selected.tracking_number}</p>
                  <p className="text-slate-500 text-sm">{selected.origin?.city ?? '?'} → {selected.destination?.city ?? '?'}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_META[selected.status].bg} ${STATUS_META[selected.status].color}`}>
                    {STATUS_META[selected.status].label}
                  </span>
                  {selected.payment_status === 'paid'
                    ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Pagado</span>
                    : <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 animate-pulse">Pendiente de cobro</span>
                  }
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Remitente</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{selected.sender_name}</p>
                  <p className="text-slate-400">{selected.sender_phone}</p>
                  {selected.sender_email && <p className="text-slate-400">{selected.sender_email}</p>}
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Destinatario</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{selected.recipient_name}</p>
                  <p className="text-slate-400">{selected.recipient_phone}</p>
                  {selected.recipient_email && <p className="text-slate-400">{selected.recipient_email}</p>}
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Tamaño</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{PACKAGE_SIZES[selected.size]?.label ?? selected.size}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Total</p>
                  <p className={`font-black text-lg mt-0.5 ${selected.payment_status === 'paid' ? 'text-emerald-600' : 'text-[#c01515]'}`}>
                    ${Number(selected.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* ── PAYMENT ── */}
              {selected.payment_status === 'pending' && (
                <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-red-700 text-sm">Pago pendiente</p>
                      <p className="text-red-600 text-xs">Cobrar antes de recibir el paquete</p>
                    </div>
                    <p className="font-black text-red-700 text-2xl">${Number(selected.price).toFixed(2)}</p>
                  </div>

                  {!payMode && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setPayMode('cash'); setPayError('') }}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors">
                        <Banknote className="w-4 h-4" /> Cobrar efectivo
                      </button>
                      <button onClick={() => { setPayMode('card'); setPayError(''); setSquareReady(false) }}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white font-bold text-sm transition-colors">
                        <CreditCard className="w-4 h-4" /> Cobrar con tarjeta
                      </button>
                    </div>
                  )}

                  {payMode === 'cash' && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 bg-white rounded-xl px-4 py-3 border border-slate-200">
                        Confirma que recibiste <strong>${Number(selected.price).toFixed(2)}</strong> en efectivo.
                      </p>
                      {payError && <p className="text-sm text-red-600 bg-white border border-red-200 rounded-xl px-3 py-2">{payError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setPayMode(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                          Cancelar
                        </button>
                        <button onClick={() => collectPayment('cash')} disabled={payLoading}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm">
                          {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Confirmar cobro
                        </button>
                      </div>
                    </div>
                  )}

                  {payMode === 'card' && (
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" /> Introduce o acerca la tarjeta
                        </p>
                        <SquareCard ref={squareRef} onReady={() => setSquareReady(true)} />
                      </div>
                      {payError && <p className="text-sm text-red-600 bg-white border border-red-200 rounded-xl px-3 py-2">{payError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setPayMode(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                          Cancelar
                        </button>
                        <button onClick={() => collectPayment('card')} disabled={payLoading || !squareReady}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:bg-slate-300 text-white font-bold text-sm">
                          {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          {payLoading ? 'Procesando...' : `Cobrar $${Number(selected.price).toFixed(2)}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selected.payment_status === 'paid' && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-emerald-700">Pago confirmado</p>
                    <p className="text-xs text-emerald-600">
                      {selected.payment_method === 'card' ? 'Tarjeta (Square)' : selected.payment_method === 'cash' ? 'Efectivo' : 'Terminal'}
                      {selected.paid_at && ` · ${new Date(selected.paid_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>
              )}

              {paySuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {paySuccess}
                </div>
              )}

              {statusSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {statusSuccess}
                </div>
              )}

              {lookupErr && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {lookupErr}
                </div>
              )}

              {/* ── STATUS UPDATE ── */}
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Actualizar estado del envío</p>
                <div className="space-y-2">
                  {SCAN_STATUSES.map(s => (
                    <label key={s.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      newStatus === s.value ? s.color : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="newStatus" value={s.value} checked={newStatus === s.value}
                        onChange={() => setNewStatus(s.value)} className="accent-[#c01515] mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{s.label}</p>
                        <p className="text-xs text-slate-500">{s.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {newStatus && (
                <div className="space-y-2">
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ubicación (opcional)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
                  <textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} placeholder="Notas del evento (opcional)" rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 resize-none" />
                  <button onClick={updateStatus} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-300 text-white font-bold text-sm transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {saving ? 'Guardando...' : 'Confirmar estado'}
                  </button>
                </div>
              )}

              <button onClick={printLabel}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors">
                <Printer className="w-4 h-4" /> Imprimir etiqueta
              </button>

              {/* ── HISTORIAL DE EVENTOS ── */}
              <div>
                <button
                  onClick={() => setShowEvents(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historial del envío
                    {events.length > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                        {events.length}
                      </span>
                    )}
                  </span>
                  {eventsLoading
                    ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    : <span className="text-slate-400 text-xs">{showEvents ? '▲' : '▼'}</span>
                  }
                </button>

                {showEvents && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                    {events.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6">Sin eventos registrados</p>
                    ) : (
                      <ol className="divide-y divide-slate-100">
                        {events.map((ev, i) => {
                          const meta = STATUS_META[ev.status as PackageStatus] ?? { label: ev.status, color: 'text-slate-600', bg: 'bg-slate-100' }
                          return (
                            <li key={i} className="px-4 py-3 flex items-start gap-3">
                              <span className={`mt-0.5 inline-block w-2 h-2 rounded-full shrink-0 ${meta.bg.replace('bg-', 'bg-').replace('-100', '-400')}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                                  {ev.location && (
                                    <span className="text-xs text-slate-500 flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3" />{ev.location}
                                    </span>
                                  )}
                                </div>
                                {ev.notes && <p className="text-xs text-slate-500 mt-0.5 italic">"{ev.notes}"</p>}
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(ev.created_at).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>
                )}
              </div>

              {/* ── CANCELAR ENVÍO ── */}
              {!['delivered', 'returned', 'cancelled'].includes(selected.status) && (
                <div>
                  {!cancelOpen ? (
                    <button
                      onClick={openCancel}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
                    >
                      <Ban className="w-4 h-4" /> Cancelar envío
                    </button>
                  ) : (
                    <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <p className="font-black text-red-700 text-sm">Cancelar envío</p>
                      </div>

                      {/* Aviso de reembolso */}
                      {selected.payment_status === 'paid' && selected.payment_method === 'card' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
                          <p className="font-bold text-blue-800">💳 Reembolso automático</p>
                          <p className="text-blue-700 mt-0.5">Se emitirá un reembolso de <strong>${Number(selected.price).toFixed(2)}</strong> a la tarjeta original (3–5 días hábiles).</p>
                        </div>
                      )}
                      {selected.payment_status === 'paid' && selected.payment_method === 'cash' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                          <p className="font-bold text-amber-800">💵 Reembolso en efectivo</p>
                          <p className="text-amber-700 mt-0.5">Devuelve <strong>${Number(selected.price).toFixed(2)}</strong> en efectivo al remitente en este momento.</p>
                        </div>
                      )}
                      {selected.payment_status === 'pending' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                          <p className="text-slate-600">Sin cargo previo — no hay nada que reembolsar.</p>
                        </div>
                      )}
                      {['in_transit', 'arrived'].includes(selected.status) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs">
                          <p className="font-bold text-orange-800">⚠️ Paquete en ruta</p>
                          <p className="text-orange-700 mt-0.5">El paquete ya salió. Coordina con la terminal de destino para recuperarlo.</p>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Motivo (opcional)
                        </label>
                        <textarea
                          value={cancelRazon}
                          onChange={e => setCancelRazon(e.target.value)}
                          placeholder="Ej: Error en dirección, cliente solicitó cancelación..."
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-red-300 bg-white"
                        />
                      </div>

                      {cancelError && (
                        <div className="flex items-center gap-2 text-xs text-red-700 bg-white border border-red-200 rounded-xl px-3 py-2">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {cancelError}
                        </div>
                      )}
                      {cancelMsg && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-white border border-emerald-200 rounded-xl px-3 py-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> {cancelMsg}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setCancelOpen(false)}
                          disabled={cancelLoading}
                          className="flex-1 border border-slate-200 text-slate-600 hover:bg-white font-semibold py-2 rounded-xl text-sm transition-colors"
                        >
                          Volver
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={cancelLoading || !!cancelMsg}
                          className="flex-1 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          {cancelLoading
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelando...</>
                            : <><Ban className="w-3.5 h-3.5" /> Confirmar</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={clearSelected}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">
                <X className="w-3.5 h-3.5" /> Cerrar detalle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New package modal */}
      {showNew && (
        <NewPackageModal
          onClose={() => setShowNew(false)}
          onCreated={(pkg) => {
            setShowNew(false)
            fetchPackages(search)
            selectPkg(pkg as unknown as Pkg)
          }}
        />
      )}
      </>}
      </>}
    </div>
  )
}
