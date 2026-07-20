'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ShoppingCart, Plus, Minus, CheckCircle2, AlertCircle,
  Loader2, RotateCcw, Ticket, Clock, CreditCard, Banknote,
  ArrowRight, Printer,
} from 'lucide-react'
import { SquareCard, type SquareCardHandle } from '@/components/public/square-card'
import {
  ALL_STOPS, getPrice,
  type StopCode,
} from '@/lib/data/bus-config'

// Stops available as origin (boarding)
const ORIGINS: StopCode[]      = ['LA', 'HP', 'SYS', 'OTY', 'TIJ']
const DESTINATIONS: StopCode[] = ['LA', 'HP', 'SYS', 'OTY', 'TIJ']

const DEPARTURE_TIMES = [
  '3:20 AM','4:30 AM','5:00 AM','6:00 AM','7:00 AM','7:30 AM','8:00 AM',
  '9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM',
  '4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM','11:00 PM',
]

type PassengerType = 'adult' | 'senior' | 'child'
const PASS_LABELS: Record<PassengerType, string> = { adult: 'Adulto', senior: 'Senior', child: 'Menor' }

const PROMO_LABELS = ['Promoción', 'Maestro', 'Estudiante', '3ra Edad', 'Cortesía']

interface PassengerRow {
  id:           number
  full_name:    string
  passenger_type: PassengerType
  is_promo:     boolean
  promo_label:  string
  promo_price:  string  // string for input control; empty = not set
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function VentaPage() {
  const [origin, setOrigin]           = useState<StopCode>('LA')
  const [destination, setDestination] = useState<StopCode>('OTY')
  const [ticketType, setTicketType]   = useState<'one_way' | 'round_trip'>('one_way')
  const [date, setDate]               = useState(today())
  const [departureTime, setDepartureTime] = useState('8:00 AM')
  const [returnDate, setReturnDate]   = useState('')
  const [email, setEmail]             = useState('')
  const [passengers, setPassengers]   = useState<PassengerRow[]>([
    { id: 1, full_name: '', passenger_type: 'adult', is_promo: false, promo_label: 'Promoción', promo_price: '' },
  ])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [squareReady, setSquareReady] = useState(false)
  const squareRef = useRef<SquareCardHandle>(null)

  const [sucursalId, setSucursalId]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setSucursalId(d.sucursal_id ?? null))
      .catch(() => {})
  }, [])

  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState<{ booking_number: string; qr: string; total: number } | null>(null)
  const [error, setError]             = useState('')

  const pricing   = getPrice(origin, destination)
  const mult      = ticketType === 'round_trip' ? 1.5 : 1
  const basePrice = (type: PassengerType) =>
    Math.round((type === 'child' ? pricing.child : pricing.adult) * mult)

  const passengerPrice = (p: PassengerRow): number => {
    if (p.is_promo && p.promo_price !== '') {
      const v = parseFloat(p.promo_price)
      return isNaN(v) || v <= 0 ? 0 : v
    }
    return basePrice(p.passenger_type)
  }

  const total = passengers.reduce((sum, p) => sum + passengerPrice(p), 0)

  const addPassenger = () => {
    if (passengers.length >= 8) return
    const nextId = Math.max(...passengers.map(p => p.id)) + 1
    setPassengers(prev => [...prev, { id: nextId, full_name: '', passenger_type: 'adult', is_promo: false, promo_label: 'Promoción', promo_price: '' }])
  }
  const removePassenger  = (id: number) => passengers.length > 1 && setPassengers(p => p.filter(x => x.id !== id))
  const updatePassenger  = (id: number, field: keyof PassengerRow, value: string) =>
    setPassengers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))

  const canSubmit = passengers.every(p =>
    p.full_name.trim().length >= 2 &&
    (!p.is_promo || (p.promo_price !== '' && parseFloat(p.promo_price) > 0))
  ) && date && origin !== destination && (ticketType !== 'round_trip' || returnDate !== '')

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    let source_id: string | undefined
    if (paymentMethod === 'card') {
      try {
        source_id = await squareRef.current?.tokenize()
      } catch (err: any) {
        setError(err.message ?? 'Error al procesar la tarjeta')
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_type:        ticketType,
          total_amount:       total,
          guest_email:        email || undefined,
          payment_method:     paymentMethod,
          source_id,
          origin_name:        ALL_STOPS[origin].name,
          destination_name:   ALL_STOPS[destination].name,
          boarding_stop_code: origin,
          boarding_stop_name: ALL_STOPS[origin].name,
          sucursal_id:        sucursalId ?? undefined,
          date,
          departure_time:     departureTime,
          return_date:        ticketType === 'round_trip' ? returnDate : undefined,
          passengers: (() => {
            const mapped = passengers.map(p => ({
              full_name:      p.full_name.trim(),
              passenger_type: p.passenger_type,
              price:          passengerPrice(p),
              is_promo:       p.is_promo,
              promo_label:    p.is_promo ? p.promo_label : undefined,
            }))
            // Adjust last passenger so sum equals total_amount exactly
            const sumSoFar = mapped.slice(0, -1).reduce((s, p) => s + p.price, 0)
            mapped[mapped.length - 1].price = total - sumSoFar
            return mapped
          })(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al registrar la venta'); return }
      setSuccess({ booking_number: data.booking_number, qr: data.qr_data_url, total })
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSuccess(null)
    setEmail('')
    setDate(today())
    setDepartureTime('8:00 AM')
    setReturnDate('')
    setTicketType('one_way')
    setPassengers([{ id: 1, full_name: '', passenger_type: 'adult', is_promo: false, promo_label: 'Promoción', promo_price: '' }])
    setError('')
    setPaymentMethod('cash')
    setSquareReady(false)
  }

  /* ── SUCCESS SCREEN ── */
  if (success) {
    return (
      <div className="p-4 sm:p-8 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 px-6 py-5 text-center">
            <CheckCircle2 className="w-10 h-10 text-white mx-auto mb-2" />
            <h2 className="font-black text-xl text-white">¡Venta registrada!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              {paymentMethod === 'card' ? 'Pago con tarjeta procesado' : 'Cobrar en efectivo al cliente'}
            </p>
          </div>

          {/* Booking number */}
          <div className="px-6 py-5 text-center border-b border-slate-100">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Número de reservación</p>
            <p className="font-mono font-black text-3xl text-[#0a1628] tracking-widest">{success.booking_number}</p>
            {paymentMethod === 'cash' && (
              <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                <Banknote className="w-4 h-4 text-amber-600" />
                <p className="text-amber-700 text-sm font-bold">Cobrar ${success.total} en efectivo</p>
              </div>
            )}
          </div>

          {/* QR code */}
          {success.qr && (
            <div className="px-6 py-5 text-center border-b border-slate-100">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">QR del boleto — mostrar al cliente</p>
              <div className="bg-slate-50 rounded-2xl p-4 inline-block border border-slate-200">
                <img src={success.qr} alt="QR" className="w-40 h-40 mx-auto" />
              </div>
              <p className="text-slate-400 text-xs mt-2">El cliente lo presenta al abordar</p>
            </div>
          )}

          {/* Email note */}
          {email ? (
            <div className="px-6 py-4 flex items-center gap-2 bg-blue-50 border-b border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-blue-700 text-sm">Boleto enviado a <strong>{email}</strong></p>
            </div>
          ) : (
            <div className="px-6 py-4 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-slate-500 text-sm">Sin correo — mostrar el QR de arriba al cliente</p>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 flex gap-3">
            <button onClick={() => {
              const win = window.open('', '_blank', 'width=380,height=560')
              if (!win) return
              win.document.write(`<!DOCTYPE html><html><head><title>Boleto ${success.booking_number}</title>
<style>body{font-family:monospace;text-align:center;padding:24px;margin:0}h1{font-size:14px;margin:0 0 4px}p{margin:4px 0;font-size:12px}strong{font-size:18px}img{width:180px;height:180px;margin:12px auto;display:block}hr{margin:12px 0;border:none;border-top:1px dashed #ccc}.big{font-size:28px;font-weight:900;letter-spacing:4px}</style>
</head><body>
<h1>Tres Estrellas de Oro Inc.</h1>
<hr/>
<p>Reservación</p>
<p class="big">${success.booking_number}</p>
<hr/>
${success.qr ? `<img src="${success.qr}" alt="QR"/>` : ''}
<p>Total cobrado: <strong>$${success.total} USD</strong></p>
<hr/>
<p style="font-size:10px">Presenta este código al abordar</p>
</body></html>`)
              win.document.close()
              win.focus()
              win.print()
            }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-colors">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0f2c5c] hover:bg-[#0a1e42] text-white font-bold text-sm transition-colors">
              <RotateCcw className="w-4 h-4" />
              Nueva venta
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── FORM ── */
  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-[#c01515]" />
          Nueva venta
        </h1>
        <p className="text-slate-500 text-sm mt-1">Registro de boleto en caja</p>
      </div>

      <div className="space-y-4">

        {/* Route */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ruta</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Origen</label>
              <select value={origin} onChange={e => setOrigin(e.target.value as StopCode)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50">
                {ORIGINS.map(c => (
                  <option key={c} value={c}>{ALL_STOPS[c].name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Destino</label>
              <select value={destination} onChange={e => setDestination(e.target.value as StopCode)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50">
                {DESTINATIONS.filter(c => c !== origin).map(c => (
                  <option key={c} value={c}>{ALL_STOPS[c].name}</option>
                ))}
              </select>
            </div>
          </div>
          {origin !== destination && (
            <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">{ALL_STOPS[origin].name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#c01515]" />
              <span className="text-xs text-slate-500 font-semibold">{ALL_STOPS[destination].name}</span>
              <span className="ml-auto text-xs font-black text-[#0a1628]">
                Adulto: ${basePrice('adult')} · Menor: ${basePrice('child')}
              </span>
            </div>
          )}
          {origin === destination && (
            <p className="mt-2 text-xs text-red-500 font-semibold">El origen y destino no pueden ser iguales</p>
          )}
        </div>

        {/* Ticket type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tipo de boleto</p>
          <div className="grid grid-cols-2 gap-3">
            {([['one_way', 'Sólo ida'], ['round_trip', 'Ida y vuelta']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setTicketType(val)}
                className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  ticketType === val ? 'border-[#c01515] bg-[#c01515]/5 text-[#c01515]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {label}
                {val === 'round_trip' && <span className="block text-[10px] font-normal opacity-60">25% desc. en regreso</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Date & time */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Fecha y hora de salida</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Hora</label>
              <select value={departureTime} onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50">
                {DEPARTURE_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {ticketType === 'round_trip' && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="text-xs text-blue-600 font-bold uppercase tracking-wider block mb-1">Fecha de regreso</label>
              <input type="date" value={returnDate}
                min={date ? (() => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })() : ''}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50" />
              {returnDate && (
                <div className="mt-2 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-blue-700 text-xs font-semibold">Regreso: {returnDate} · Hora abierta</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passengers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pasajeros</p>
            <button onClick={addPassenger} disabled={passengers.length >= 8}
              className="flex items-center gap-1 text-xs font-bold text-[#c01515] hover:text-[#a01010] disabled:opacity-40 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          <div className="space-y-3">
            {passengers.map((p, idx) => (
              <div key={p.id} className={`rounded-xl p-4 border-2 transition-colors ${p.is_promo ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-transparent'}`}>
                {/* Row header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#0f2c5c] text-white rounded-full flex items-center justify-center text-xs font-black">{idx + 1}</div>
                    <span className="text-sm font-bold text-slate-600">Pasajero {idx + 1}</span>
                    {p.is_promo && (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">P</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Promo toggle */}
                    <button
                      onClick={() => setPassengers(prev => prev.map(x => x.id === p.id ? { ...x, is_promo: !x.is_promo, promo_price: '' } : x))}
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border-2 transition-all ${
                        p.is_promo ? 'border-amber-400 bg-amber-400 text-white' : 'border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-600'
                      }`}>
                      P
                    </button>
                    {passengers.length > 1 && (
                      <button onClick={() => removePassenger(p.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Name */}
                  <input value={p.full_name} onChange={e => updatePassenger(p.id, 'full_name', e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-white" />

                  {/* Passenger type buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['adult', 'senior', 'child'] as PassengerType[]).map(type => (
                      <button key={type} onClick={() => updatePassenger(p.id, 'passenger_type', type)}
                        disabled={p.is_promo}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          p.is_promo
                            ? 'border-slate-100 text-slate-300 bg-white cursor-not-allowed'
                            : p.passenger_type === type
                              ? 'border-[#c01515] bg-[#c01515]/10 text-[#c01515]'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {PASS_LABELS[type]}
                        <span className="block font-black text-[10px]">${basePrice(type)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Promo section */}
                  {p.is_promo && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Tipo de promo</label>
                        <select
                          value={p.promo_label}
                          onChange={e => setPassengers(prev => prev.map(x => x.id === p.id ? { ...x, promo_label: e.target.value } : x))}
                          className="w-full px-2 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/30">
                          {PROMO_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Precio especial *</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-xs">$</span>
                          <input
                            type="number" min="0.01" step="0.01"
                            value={p.promo_price}
                            onChange={e => setPassengers(prev => prev.map(x => x.id === p.id ? { ...x, promo_price: e.target.value } : x))}
                            placeholder="0.00"
                            className="w-full pl-6 pr-2 py-2 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price summary per passenger */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {p.is_promo ? `${p.promo_label} · precio especial` : `${PASS_LABELS[p.passenger_type]} · ${ticketType === 'round_trip' ? 'I+V' : 'Ida'}`}
                    </span>
                    <span className={`text-sm font-black ${p.is_promo ? 'text-amber-600' : 'text-[#0a1628]'}`}>
                      ${passengerPrice(p) > 0 ? passengerPrice(p).toFixed(2) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email (optional) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Correo del cliente <span className="font-normal normal-case text-slate-400">(opcional)</span>
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="cliente@correo.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50" />
          <p className="text-slate-400 text-xs mt-2">
            {email ? 'El boleto con QR se enviará a este correo' : 'Sin correo — muestra el QR en pantalla al finalizar'}
          </p>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Forma de pago</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPaymentMethod('cash')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === 'cash' ? 'border-[#c01515] bg-[#c01515]/5 text-[#c01515]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              <Banknote className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Efectivo</p>
                <p className="text-[10px] opacity-60">Cobrar al cliente</p>
              </div>
            </button>
            <button onClick={() => { setPaymentMethod('card'); setSquareReady(false) }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === 'card' ? 'border-[#c01515] bg-[#c01515]/5 text-[#c01515]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              <CreditCard className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Tarjeta</p>
                <p className="text-[10px] opacity-60">Square / terminal</p>
              </div>
            </button>
          </div>

          {paymentMethod === 'card' && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Datos de tarjeta
              </p>
              <SquareCard ref={squareRef} onReady={() => setSquareReady(true)} />
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-[#0f2c5c] rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Total a cobrar</p>
            <p className="text-3xl font-black mt-0.5">${total} <span className="text-base font-semibold text-white/60">USD</span></p>
            <p className="text-white/50 text-xs mt-1">
              {passengers.length} pasajero{passengers.length > 1 ? 's' : ''} ·{' '}
              {ticketType === 'round_trip' ? 'Ida y vuelta' : 'Solo ida'} ·{' '}
              {ALL_STOPS[origin]?.name} → {ALL_STOPS[destination]?.name} ·{' '}
              {paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}
            </p>
          </div>
          <Ticket className="w-10 h-10 text-white/20" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm font-semibold">{error}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || loading || (paymentMethod === 'card' && !squareReady)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#c01515] hover:bg-[#a01010] text-white font-black text-base transition-colors disabled:opacity-40">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
          {loading
            ? (paymentMethod === 'card' ? 'Procesando pago...' : 'Registrando...')
            : `Registrar venta · $${total} ${paymentMethod === 'card' ? 'tarjeta' : 'efectivo'}`
          }
        </button>

      </div>
    </div>
  )
}
