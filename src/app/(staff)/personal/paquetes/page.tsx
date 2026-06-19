'use client'

import { useState } from 'react'
import { Package, ScanLine, CheckCircle2, AlertCircle, Plus, Printer } from 'lucide-react'
import { STATUS_META, type PackageStatus } from '@/lib/packages'
import { NewPackageModal } from '@/components/packages/new-package-modal'

const SCAN_STATUSES: { value: PackageStatus; label: string; desc: string; color: string }[] = [
  { value: 'received',   label: 'Recibido en terminal', desc: 'El paquete ingresó a la terminal de origen',   color: 'bg-blue-50 border-blue-300 text-blue-700' },
  { value: 'in_transit', label: 'En tránsito',           desc: 'El paquete salió en el autobús',              color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { value: 'arrived',    label: 'Llegó a destino',       desc: 'El paquete llegó a la terminal de destino',   color: 'bg-purple-50 border-purple-300 text-purple-700' },
  { value: 'delivered',  label: 'Entregado',             desc: 'El paquete fue entregado al destinatario',    color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'returned',   label: 'Devuelto',              desc: 'No se pudo entregar, regresa al remitente',   color: 'bg-red-50 border-red-300 text-red-700' },
]

interface PkgResult {
  id: string
  tracking_number: string
  sender_name: string
  recipient_name: string
  status: PackageStatus
  origin: { name: string; city: string } | null
  destination: { name: string; city: string } | null
}

export default function StaffPaquetesPage() {
  const [tracking, setTracking]   = useState('')
  const [pkg, setPkg]             = useState<PkgResult | null>(null)
  const [lookupErr, setLookupErr] = useState('')
  const [loading, setLoading]     = useState(false)
  const [newStatus, setNewStatus] = useState<PackageStatus | ''>('')
  const [location, setLocation]   = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState('')
  const [showNew, setShowNew]     = useState(false)

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tracking.trim()) return
    setLoading(true)
    setLookupErr('')
    setPkg(null)
    setNewStatus('')
    setSuccess('')
    const res  = await fetch(`/api/packages/track?n=${encodeURIComponent(tracking.trim().toUpperCase())}`)
    const data = await res.json()
    if (!res.ok || !data.package) { setLookupErr(data.error ?? 'Paquete no encontrado'); setLoading(false); return }
    setPkg(data.package)
    setLoading(false)
  }

  const update = async () => {
    if (!pkg || !newStatus) return
    setSaving(true)
    setSuccess('')
    const res = await fetch('/api/packages', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: pkg.id, status: newStatus, location: location || null, notes: notes || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setPkg(prev => prev ? { ...prev, status: newStatus } : null)
      setSuccess(`Estado actualizado: ${STATUS_META[newStatus].label}`)
      setNewStatus('')
      setLocation('')
      setNotes('')
    } else {
      setLookupErr(data.error ?? 'Error al actualizar')
    }
    setSaving(false)
  }

  const printLabel = () => pkg && window.open(`/api/packages/label?n=${pkg.tracking_number}`, '_blank')

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-[#c01515]" />
            Paquetes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Escanear y actualizar estado de envíos</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo envío
        </button>
      </div>

      {/* Tracking lookup */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Buscar paquete</p>
        <form onSubmit={lookup} className="flex gap-2">
          <input
            value={tracking}
            onChange={e => setTracking(e.target.value.toUpperCase())}
            placeholder="Número de rastreo (ej. TEO12345678)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm font-bold focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 uppercase"
          />
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

      {/* Package info */}
      {pkg && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-mono font-black text-[#0a1628] text-lg">{pkg.tracking_number}</p>
              <p className="text-slate-500 text-sm">{pkg.origin?.city ?? '?'} → {pkg.destination?.city ?? '?'}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_META[pkg.status].bg} ${STATUS_META[pkg.status].color}`}>
              {STATUS_META[pkg.status].label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider">Remitente</p>
              <p className="text-slate-700 font-semibold mt-0.5">{pkg.sender_name}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider">Destinatario</p>
              <p className="text-slate-700 font-semibold mt-0.5">{pkg.recipient_name}</p>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          {/* Status update */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Actualizar estado</p>
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
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Ubicación (opcional: nombre terminal...)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notas del evento (opcional)" rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 resize-none" />
              <button onClick={update} disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-300 text-white font-bold text-sm transition-colors">
                {saving ? 'Guardando...' : 'Confirmar actualización'}
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
