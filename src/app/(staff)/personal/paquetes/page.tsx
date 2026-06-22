'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Package, ScanLine, CheckCircle2, AlertCircle, Plus, Printer,
  CreditCard, Banknote, Loader2, Search, Clock, ChevronRight, X, Wifi,
} from 'lucide-react'
import { STATUS_META, PACKAGE_SIZES, type PackageStatus, type PackageSize } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'
import { SquareCard, type SquareCardHandle } from '@/components/public/square-card'

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

export default function StaffPaquetesPage() {
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
  }

  const clearSelected = () => {
    setSelected(null)
    setNewStatus('')
    setStatusSuccess('')
    setPayMode(null)
    setPayError('')
    setPaySuccess('')
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
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-[#c01515]" />
            Paquetes
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Escanea la etiqueta QR o busca por nombre, teléfono o correo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
            <Wifi className="w-3.5 h-3.5" />
            Escáner listo
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Nuevo envío
          </button>
        </div>
      </div>

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
            fetchPackages(search)          // refresh list
            selectPkg(pkg as unknown as Pkg) // auto-select new package
          }}
        />
      )}
    </div>
  )
}
