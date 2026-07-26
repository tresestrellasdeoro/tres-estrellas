'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Receipt, Plus, Loader2, CheckCircle2, AlertCircle,
  Banknote, CreditCard, XCircle, Camera, X, ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIAS = [
  'Combustible / Gasolina',
  'Mantenimiento y Reparaciones',
  'Salarios y Nómina',
  'Arrendamiento / Renta',
  'Seguros',
  'Servicios (agua, luz, internet, teléfono)',
  'Suministros de Oficina',
  'Comida / Viáticos',
  'Publicidad y Marketing',
  'Impuestos y Cuotas',
  'Limpieza',
  'Equipo y Herramientas',
  'Otro',
]

interface Gasto {
  id:             string
  created_at:     string
  amount:         number
  category:       string
  description:    string | null
  date:           string
  payment_method: 'cash' | 'card'
  qb_synced:      boolean
  vendor:         string | null
  receipt_number: string | null
  receipt_url:    string | null
  profiles:       { full_name: string; email: string } | null
  sucursales:     { name: string; code: string } | null
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function GastosPage() {
  const [amount,         setAmount]         = useState('')
  const [category,       setCategory]       = useState(CATEGORIAS[0])
  const [otroTexto,      setOtroTexto]      = useState('')
  const [description,    setDescription]    = useState('')
  const [date,           setDate]           = useState(today())
  const [paymentMethod,  setPaymentMethod]  = useState<'cash' | 'card'>('cash')
  const [vendor,         setVendor]         = useState('')
  const [receiptNumber,  setReceiptNumber]  = useState('')
  const [receiptFile,    setReceiptFile]    = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadingImg,   setUploadingImg]   = useState(false)

  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState('')
  const [error,       setError]       = useState('')
  const [gastos,      setGastos]      = useState<Gasto[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const fetchGastos = async () => {
    setLoadingList(true)
    try {
      const res  = await fetch('/api/staff/gastos?limit=30')
      const data = await res.json()
      setGastos(data.gastos ?? [])
    } catch {}
    finally { setLoadingList(false) }
  }

  useEffect(() => { fetchGastos() }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = ev => setReceiptPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null
    setUploadingImg(true)
    try {
      const ext  = receiptFile.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('recibos')
        .upload(path, receiptFile, { upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('recibos').getPublicUrl(path)
      return urlData.publicUrl
    } catch (err: unknown) {
      console.error('Upload error:', err)
      return null
    } finally {
      setUploadingImg(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0)                              { setError('Monto inválido'); return }
    if (category === 'Otro' && !otroTexto.trim())      { setError('Especifica el tipo de gasto'); return }
    setLoading(true); setError(''); setSuccess('')

    const categoriaFinal = category === 'Otro' ? `Otro: ${otroTexto.trim()}` : category
    const receiptUrl = await uploadReceipt()

    try {
      const res = await fetch('/api/staff/gastos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:         amt,
          category:       categoriaFinal,
          description:    description || undefined,
          date,
          payment_method: paymentMethod,
          vendor:         vendor.trim() || undefined,
          receipt_number: receiptNumber.trim() || undefined,
          receipt_url:    receiptUrl ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al registrar el gasto'); return }

      setSuccess(data.qb_synced
        ? `Gasto registrado y enviado a QuickBooks (${data.doc_number})`
        : `Gasto registrado. ${data.qb_error ? 'QB: ' + data.qb_error : 'QB no conectado.'}`
      )
      setAmount(''); setDescription(''); setVendor(''); setReceiptNumber(''); setOtroTexto('')
      removeFile()
      fetchGastos()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <Receipt className="w-6 h-6 text-[#c01515]" />
          Registrar gasto
        </h1>
        <p className="text-slate-500 text-sm mt-1">El gasto se guarda en el sistema y se envía a QuickBooks</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">

        {/* Monto */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Monto *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" required
              className="w-full pl-7 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50 font-mono font-bold" />
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Categoría *</label>
          <select value={category} onChange={e => { setCategory(e.target.value); setOtroTexto('') }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]">
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {category === 'Otro' && (
            <input type="text" value={otroTexto} onChange={e => setOtroTexto(e.target.value)}
              placeholder="Especifica el tipo de gasto (ej. Seguro, Impuestos...)"
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400" />
          )}
        </div>

        {/* Proveedor + No. Recibo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Proveedor <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
              placeholder="ej. PEMEX, Home Depot..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              No. Recibo / Factura <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <input type="text" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)}
              placeholder="ej. A-00123"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]" />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Descripción <span className="font-normal normal-case text-slate-400">(opcional)</span>
          </label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="ej. Tanque lleno — camión #3"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]" />
        </div>

        {/* Fecha */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Fecha *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]" />
        </div>

        {/* Foto del comprobante */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Foto del comprobante <span className="font-normal normal-case text-slate-400">(opcional)</span>
          </label>
          {receiptPreview ? (
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-200">
              <img src={receiptPreview} alt="Comprobante" className="w-full max-h-48 object-contain bg-slate-50" />
              <button type="button" onClick={removeFile}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#c01515] hover:bg-red-50/30 text-slate-400 hover:text-[#c01515] transition-colors">
              <Camera className="w-6 h-6" />
              <span className="text-xs font-semibold">Toca para agregar foto del recibo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handleFileChange} className="hidden" />
        </div>

        {/* Forma de pago */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Forma de pago</label>
          <div className="grid grid-cols-2 gap-3">
            {([['cash', 'Efectivo', Banknote], ['card', 'Tarjeta', CreditCard]] as const).map(([val, label, Icon]) => (
              <button key={val} type="button" onClick={() => setPaymentMethod(val)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  paymentMethod === val
                    ? 'border-[#c01515] bg-[#c01515]/5 text-[#c01515]'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-bold text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {error   && (
          <div className="flex items-center gap-2 text-red-700 text-xs font-semibold bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
          </div>
        )}

        <button type="submit" disabled={loading || uploadingImg || !amount || !date}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white font-black text-sm transition-colors disabled:opacity-40">
          {(loading || uploadingImg) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {uploadingImg ? 'Subiendo foto...' : loading ? 'Registrando...' : 'Registrar gasto'}
        </button>
      </form>

      {/* Gastos recientes */}
      <div>
        <h2 className="font-bold text-slate-700 text-sm mb-3">Gastos recientes</h2>
        {loadingList ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : gastos.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No hay gastos registrados</p>
        ) : (
          <div className="space-y-2">
            {gastos.map(g => (
              <div key={g.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start gap-4 shadow-sm">
                {/* Thumbnail */}
                {g.receipt_url && (
                  <a href={g.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-0.5">
                    <img src={g.receipt_url} alt="Recibo"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                  </a>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">{g.category}</span>
                    {g.sucursales && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{g.sucursales.code}</span>
                    )}
                    {g.payment_method === 'cash'
                      ? <Banknote className="w-3.5 h-3.5 text-slate-400" />
                      : <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </div>
                  {g.vendor && <p className="text-xs text-slate-600 font-semibold mt-0.5">{g.vendor}</p>}
                  {g.description && <p className="text-xs text-slate-500 truncate">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-[11px] text-slate-400">{g.date} · {g.profiles?.full_name ?? 'Empleado'}</p>
                    {g.receipt_number && (
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                        #{g.receipt_number}
                      </span>
                    )}
                    {g.receipt_url && !g.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)/i) && (
                      <a href={g.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline">
                        <ExternalLink className="w-2.5 h-2.5" />Recibo
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-[#c01515] text-base">${Number(g.amount).toFixed(2)}</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    {g.qb_synced
                      ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span className="text-[10px] text-emerald-600 font-semibold">QB</span></>
                      : <><XCircle className="w-3 h-3 text-slate-300" /><span className="text-[10px] text-slate-400">Pendiente</span></>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
