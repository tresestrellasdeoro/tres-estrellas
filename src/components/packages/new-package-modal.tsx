'use client'

import { useState, useEffect } from 'react'
import { X, Package, Loader2 } from 'lucide-react'
import { PACKAGE_SIZES, type PackageSize } from '@/lib/packages'

interface Stop { id: string; name: string; city: string }

interface Props {
  onClose: () => void
  onCreated: (pkg: object) => void
  defaultSenderName?: string
  defaultSenderPhone?: string
  defaultOriginId?: string
}

export function NewPackageModal({ onClose, onCreated, defaultSenderName = '', defaultSenderPhone = '', defaultOriginId = '' }: Props) {
  const [stops, setStops]   = useState<Stop[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    sender_name:         defaultSenderName,
    sender_phone:        defaultSenderPhone,
    sender_email:        '',
    recipient_name:      '',
    recipient_phone:     '',
    recipient_email:     '',
    origin_stop_id:      defaultOriginId,
    destination_stop_id: '',
    size:                'mediano' as PackageSize,
    weight_lbs:          '',
    declared_value:      '',
    notes:               '',
  })

  useEffect(() => {
    fetch('/api/stops?limit=50')
      .then(r => r.json())
      .then(d => setStops(d.stops ?? d ?? []))
      .catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res  = await fetch('/api/packages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear'); setSaving(false); return }
      onCreated(data.package)
    } catch {
      setError('Error de red')
      setSaving(false)
    }
  }

  const selectedSize = PACKAGE_SIZES[form.size]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#c01515]" />
            <h2 className="font-black text-[#0a1628] text-lg">Nuevo envío</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5">
          {/* Sender */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Remitente</p>
            <div className="space-y-2">
              <input required value={form.sender_name} onChange={e => set('sender_name', e.target.value)}
                placeholder="Nombre completo *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
              <div className="grid grid-cols-2 gap-2">
                <input required value={form.sender_phone} onChange={e => set('sender_phone', e.target.value)}
                  placeholder="Teléfono *" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
                <input value={form.sender_email} onChange={e => set('sender_email', e.target.value)}
                  placeholder="Email (opcional)" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Destinatario</p>
            <div className="space-y-2">
              <input required value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)}
                placeholder="Nombre completo *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
              <div className="grid grid-cols-2 gap-2">
                <input required value={form.recipient_phone} onChange={e => set('recipient_phone', e.target.value)}
                  placeholder="Teléfono *" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
                <input value={form.recipient_email} onChange={e => set('recipient_email', e.target.value)}
                  placeholder="Email (opcional)" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
              </div>
            </div>
          </div>

          {/* Route */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Ruta</p>
            <div className="grid grid-cols-2 gap-2">
              <select required value={form.origin_stop_id} onChange={e => set('origin_stop_id', e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 bg-white">
                <option value="">Origen *</option>
                {stops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
              <select required value={form.destination_stop_id} onChange={e => set('destination_stop_id', e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 bg-white">
                <option value="">Destino *</option>
                {stops.filter(s => s.id !== form.origin_stop_id).map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
            </div>
          </div>

          {/* Size selector */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tamaño del paquete</p>
            <div className="space-y-2">
              {(Object.entries(PACKAGE_SIZES) as [PackageSize, typeof PACKAGE_SIZES[PackageSize]][]).map(([key, info]) => (
                <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.size === key ? 'border-[#c01515] bg-red-50 ring-1 ring-[#c01515]/20' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="size" value={key} checked={form.size === key} onChange={() => set('size', key)} className="accent-[#c01515]" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{info.label} <span className="text-slate-400 font-normal text-xs">· {info.dims}</span></p>
                    <p className="text-xs text-slate-500">{info.desc}</p>
                  </div>
                  <p className="font-black text-[#c01515] text-lg">${info.price}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Extra details */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Detalles adicionales</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)}
                type="number" min="0" step="0.1" placeholder="Peso (lbs)"
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
              <input value={form.declared_value} onChange={e => set('declared_value', e.target.value)}
                type="number" min="0" step="0.01" placeholder="Valor declarado ($)"
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30" />
            </div>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Notas (contenido, instrucciones especiales...)" rows={2}
              className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}

          {/* Summary + submit */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total a cobrar</p>
              <p className="text-2xl font-black text-[#c01515]">${selectedSize?.price ?? 0}.00</p>
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {saving ? 'Creando...' : 'Crear envío'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
