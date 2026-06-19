'use client'

import { useState, useRef } from 'react'
import { Package, ScanLine, CheckCircle2, AlertCircle, Plus, Printer, CreditCard, Banknote, Loader2 } from 'lucide-react'
import { STATUS_META, PACKAGE_SIZES, type PackageStatus, type PackageSize } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'
import { SquareCard, type SquareCardHandle } from '@/components/public/square-card'

const SCAN_STATUSES: { value: PackageStatus; label: string; desc: string; color: string }[] = [
  { value: 'received',   label: 'Recibido en terminal', desc: 'El paquete ingresó a la terminal de origen',  color: 'bg-blue-50 border-blue-300 text-blue-700' },
  { value: 'in_transit', label: 'En tránsito',           desc: 'El paquete salió en el autobús',             color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { value: 'arrived',    label: 'Llegó a destino',       desc: 'El paquete llegó a la terminal de destino',  color: 'bg-purple-50 border-purple-300 text-purple-700' },
  { value: 'delivered',  label: 'Entregado',             desc: 'El paquete fue entregado al destinatario',   color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'returned',   label: 'Devuelto',              desc: 'No se pudo entregar, regresa al remitente',  color: 'bg-red-50 border-red-300 text-red-700' },
]

interface PkgResult {
  id: string
  tracking_number: string
  sender_name: string
  sender_phone: string
  recipient_name: string
  recipient_phone: string
  status: PackageStatus
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method: string | null
  paid_at: string | null
  price: number
  size: PackageSize
  origin: { name: string; city: string } | null
  destination: { name: string; city: string } | null
}

export default function StaffPaquetesPage() {
  const [tracking, setTracking]   = useState('')
  const [pkg, setPkg]             = useState<PkgResult | null>(null)
  const [lookupErr, setLookupErr] = useState('')
  const [loading, setLoading]     = useState(false)

  // Status update
  const [newStatus, setNewStatus] = useState<PackageStatus | ''>('')
  const [location, setLocation]   = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState('')

  // Payment
  const [payMode, setPayMode]     = useState<'card' | 'cash' | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError]   = useState('')
  const [paySuccess, setPaySuccess] = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const squareRef                 = useRef<SquareCardHandle>(null)

  const [showNew, setShowNew]     = useState(false)

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tracking.trim()) return
    setLoading(true)
    setLookupErr('')
    setPkg(null)
    setNewStatus('')
    setSuccess('')
    setPayMode(null)
    setPayError('')
    setPaySuccess('')
    const res  = await fetch(`/api/packages/track?n=${encodeURIComponent(tracking.trim().toUpperCase())}`)
    const data = await res.json()
    if (!res.ok || !data.package) { setLookupErr(data.error ?? 'Paquete no encontrado'); setLoading(false); return }
    setPkg(data.package)
    setLoading(false)
  }

  const updateStatus = async () => {
    if (!pkg || !newStatus) return
    setSaving(true)
    setSuccess('')
    const res = await fetch('/api/packages', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: pkg.id, status: newStatus, location: location || null, notes: statusNotes || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setPkg(prev => prev ? { ...prev, status: newStatus } : null)
      setSuccess(`Estado actualizado: ${STATUS_META[newStatus].label}`)
      setNewStatus('')
      setLocation('')
      setStatusNotes('')
    } else {
      setLookupErr(data.error ?? 'Error al actualizar')
    }
    setSaving(false)
  }

  const collectPayment = async (method: 'card' | 'cash') => {
    if (!pkg) return
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

    const res = await fetch('/api/packages/pay', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: pkg.id, payment_method: method, source_id }),
    })
    const data = await res.json()
    if (res.ok) {
      const label = method === 'card' ? 'tarjeta' : 'efectivo'
      setPaySuccess(`Pago recibido con ${label} — $${Number(pkg.price).toFixed(2)}`)
      setPkg(prev => prev ? { ...prev, payment_status: 'paid', payment_method: method, paid_at: new Date().toISOString() } : null)
      setPayMode(null)
    } else {
      setPayError(data.error ?? 'Error al procesar pago')
    }
    setPayLoading(false)
  }

  const printLabel = () => pkg && window.open(`/api/packages/label?n=${pkg.tracking_number}`, '_blank')

  const paymentBadge = (p: PkgResult) =>
    p.payment_status === 'paid'
      ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Pagado</span>
      : <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 animate-pulse">Pendiente de cobro</span>

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-[#c01515]" />
            Paquetes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Escanear, cobrar y actualizar estado de envíos</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo envío
        </button>
      </div>

      {/* Lookup */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Buscar paquete por número de rastreo</p>
        <form onSubmit={lookup} className="flex gap-2">
          <input value={tracking} onChange={e => setTracking(e.target.value.toUpperCase())}
            placeholder="Número de rastreo · ej. TEO12345678"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm font-bold focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 uppercase" />
          <button type="submit" disabled={loading || !tracking.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors disabled:opacity-50">
            {loading ? '...' : 'Buscar'}
          </button>
        </form>
        {lookupErr && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" /> {lookupErr}
          </div>
        )}
      </div>

      {/* Package card */}
      {pkg && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-mono font-black text-[#0a1628] text-xl">{pkg.tracking_number}</p>
              <p className="text-slate-500 text-sm">{pkg.origin?.city ?? '?'} → {pkg.destination?.city ?? '?'}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_META[pkg.status].bg} ${STATUS_META[pkg.status].color}`}>
                {STATUS_META[pkg.status].label}
              </span>
              {paymentBadge(pkg)}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl p-4">
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
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider">Tamaño</p>
              <p className="text-slate-700 font-semibold mt-0.5">{PACKAGE_SIZES[pkg.size]?.label ?? pkg.size}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider">Total</p>
              <p className={`font-black text-lg mt-0.5 ${pkg.payment_status === 'paid' ? 'text-emerald-600' : 'text-[#c01515]'}`}>
                ${Number(pkg.price).toFixed(2)}
              </p>
            </div>
          </div>

          {/* ── PAYMENT SECTION ── */}
          {pkg.payment_status === 'pending' && (
            <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-red-700 text-sm">Pago pendiente</p>
                  <p className="text-red-600 text-xs">Cobrar ${Number(pkg.price).toFixed(2)} USD antes de recibir el paquete</p>
                </div>
                <p className="font-black text-red-700 text-2xl">${Number(pkg.price).toFixed(2)}</p>
              </div>

              {!payMode && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setPayMode('cash'); setPayError('') }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors">
                    <Banknote className="w-4 h-4" />
                    Cobrar efectivo
                  </button>
                  <button onClick={() => { setPayMode('card'); setPayError(''); setSquareReady(false) }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white font-bold text-sm transition-colors">
                    <CreditCard className="w-4 h-4" />
                    Cobrar con tarjeta
                  </button>
                </div>
              )}

              {payMode === 'cash' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 bg-white rounded-xl px-4 py-3 border border-slate-200">
                    Confirma que recibiste <strong>${Number(pkg.price).toFixed(2)}</strong> en efectivo del cliente.
                  </p>
                  {payError && <p className="text-sm text-red-600 bg-white border border-red-200 rounded-xl px-3 py-2">{payError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setPayMode(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => collectPayment('cash')} disabled={payLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm transition-colors">
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
                    <button onClick={() => setPayMode(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => collectPayment('card')} disabled={payLoading || !squareReady}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:bg-slate-300 text-white font-bold text-sm transition-colors">
                      {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      {payLoading ? 'Procesando...' : `Cobrar $${Number(pkg.price).toFixed(2)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment confirmed */}
          {pkg.payment_status === 'paid' && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-black text-emerald-700">Pago confirmado</p>
                <p className="text-xs text-emerald-600">
                  {pkg.payment_method === 'card' ? 'Tarjeta (Square)' : pkg.payment_method === 'cash' ? 'Efectivo' : 'Terminal'}
                  {pkg.paid_at && ` · ${new Date(pkg.paid_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </div>
          )}

          {paySuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {paySuccess}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
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
            <Printer className="w-4 h-4" />
            Imprimir etiqueta
          </button>
        </div>
      )}

      {showNew && (
        <NewPackageModal onClose={() => setShowNew(false)} onCreated={() => setShowNew(false)} />
      )}
    </div>
  )
}
