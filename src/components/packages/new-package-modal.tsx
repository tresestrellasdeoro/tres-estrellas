'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Package, Loader2, CreditCard, Banknote, CheckCircle2 } from 'lucide-react'
import { PACKAGE_SIZES, type PackageSize } from '@/lib/packages'
import { SquareCard, type SquareCardHandle } from '@/components/public/square-card'

interface Stop { id: string; name: string; city: string }

interface Props {
  onClose: () => void
  onCreated: (pkg: object) => void
  defaultSenderName?: string
  defaultSenderPhone?: string
  defaultOriginId?: string
}

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30'

export function NewPackageModal({ onClose, onCreated, defaultSenderName = '', defaultSenderPhone = '', defaultOriginId = '' }: Props) {
  const [stops, setStops]         = useState<Stop[]>([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [squareReady, setSquareReady] = useState(false)
  const squareRef                 = useRef<SquareCardHandle>(null)
  const [dbPrices, setDbPrices]   = useState<Record<string, number>>({})

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

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('cash')

  useEffect(() => {
    fetch('/api/stops?limit=50')
      .then(r => r.json())
      .then(d => setStops(d.stops ?? d ?? []))
      .catch(() => {})
    fetch('/api/admin/package-pricing')
      .then(r => r.json())
      .then(d => {
        if (d.pricing) {
          const map: Record<string, number> = {}
          d.pricing.forEach((p: { id: string; price: number }) => { map[p.id] = p.price })
          setDbPrices(map)
        }
      })
      .catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const getPrice = (key: string) => dbPrices[key] ?? PACKAGE_SIZES[key as PackageSize]?.price ?? 0
  const selectedSize = PACKAGE_SIZES[form.size]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    let source_id: string | undefined

    if (paymentMethod === 'card') {
      try {
        source_id = await squareRef.current?.tokenize()
      } catch (err: any) {
        setError(err.message ?? 'Error al procesar la tarjeta')
        setSaving(false)
        return
      }
    }

    try {
      const res  = await fetch('/api/packages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, payment_method: paymentMethod, source_id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear'); setSaving(false); return }
      onCreated(data.package)
    } catch {
      setError('Error de red')
      setSaving(false)
    }
  }

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
              <input required value={form.sender_name} onChange={e => set('sender_name', e.target.value)} placeholder="Nombre completo *" className={INPUT} />
              <div className="grid grid-cols-2 gap-2">
                <input required value={form.sender_phone} onChange={e => set('sender_phone', e.target.value)} placeholder="Teléfono *" className={INPUT} />
                <input value={form.sender_email} onChange={e => set('sender_email', e.target.value)} placeholder="Email (opcional)" className={INPUT} />
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Destinatario</p>
            <div className="space-y-2">
              <input required value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Nombre completo *" className={INPUT} />
              <div className="grid grid-cols-2 gap-2">
                <input required value={form.recipient_phone} onChange={e => set('recipient_phone', e.target.value)} placeholder="Teléfono *" className={INPUT} />
                <input value={form.recipient_email} onChange={e => set('recipient_email', e.target.value)} placeholder="Email (opcional)" className={INPUT} />
              </div>
            </div>
          </div>

          {/* Route */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Ruta</p>
            <div className="grid grid-cols-2 gap-2">
              <select required value={form.origin_stop_id} onChange={e => set('origin_stop_id', e.target.value)} className={`${INPUT} bg-white`}>
                <option value="">Origen *</option>
                {stops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
              <select required value={form.destination_stop_id} onChange={e => set('destination_stop_id', e.target.value)} className={`${INPUT} bg-white`}>
                <option value="">Destino *</option>
                {stops.filter(s => s.id !== form.origin_stop_id).map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
            </div>
          </div>

          {/* Size */}
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
                  <p className="font-black text-[#c01515] text-lg">${getPrice(key)}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Extra details */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Detalles adicionales</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)} type="number" min="0" step="0.1" placeholder="Peso (lbs)" className={INPUT} />
              <input value={form.declared_value} onChange={e => set('declared_value', e.target.value)} type="number" min="0" step="0.01" placeholder="Valor declarado ($)" className={INPUT} />
            </div>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas (contenido, instrucciones especiales...)" rows={2}
              className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515] focus:ring-1 focus:ring-[#c01515]/30 resize-none" />
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPaymentMethod('cash')}
                className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all ${
                  paymentMethod === 'cash' ? 'border-[#c01515] bg-red-50 text-[#c01515] ring-1 ring-[#c01515]/20' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <Banknote className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Pagar en caja</p>
                  <p className="text-[10px] text-slate-400 font-normal">Cobra el cajero al recibirlo</p>
                </div>
              </button>
              <button type="button" onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all ${
                  paymentMethod === 'card' ? 'border-[#c01515] bg-red-50 text-[#c01515] ring-1 ring-[#c01515]/20' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <CreditCard className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Tarjeta ahora</p>
                  <p className="text-[10px] text-slate-400 font-normal">Se cobra al crear la etiqueta</p>
                </div>
              </button>
            </div>

            {paymentMethod === 'card' && (
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Datos de tarjeta
                </p>
                <SquareCard ref={squareRef} onReady={() => setSquareReady(true)} />
                {!squareReady && (
                  <p className="text-[10px] text-slate-400 mt-2">Cargando formulario seguro...</p>
                )}
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">El cajero cobrará <strong>${getPrice(form.size)}</strong> cuando el cliente llegue a la terminal con el paquete.</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}

          {/* Summary + submit */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {paymentMethod === 'card' ? 'Total a cobrar ahora' : 'Total a cobrar en caja'}
              </p>
              <p className="text-2xl font-black text-[#c01515]">${getPrice(form.size).toFixed(2)}</p>
            </div>
            <button type="submit" disabled={saving || (paymentMethod === 'card' && !squareReady)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : paymentMethod === 'card' ? <CreditCard className="w-4 h-4" /> : <Package className="w-4 h-4" />}
              {saving ? (paymentMethod === 'card' ? 'Procesando pago...' : 'Creando...') : (paymentMethod === 'card' ? 'Pagar y crear envío' : 'Crear envío')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
