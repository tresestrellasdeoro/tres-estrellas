'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Minus, User, CheckCircle2, AlertCircle, Loader2, RotateCcw, Ticket, Clock } from 'lucide-react'

// LA → Tijuana (OTY/TIJ) — must match bus-config ROUTE_PRICES
const ROUTE_PRICES = {
  adult:  55,
  senior: 50,
  child:  50,
}

const DEPARTURE_TIMES = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
]

type PassengerType = 'adult' | 'senior' | 'child'

interface PassengerRow {
  id: number
  full_name: string
  passenger_type: PassengerType
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function VentaPage() {
  const [ticketType, setTicketType]     = useState<'one_way' | 'round_trip'>('one_way')
  const [date, setDate]                 = useState(today())
  const [departureTime, setDepartureTime] = useState('8:00 AM')
  const [returnDate, setReturnDate]     = useState('')
  const [email, setEmail]               = useState('')
  const [passengers, setPassengers]     = useState<PassengerRow[]>([
    { id: 1, full_name: '', passenger_type: 'adult' },
  ])
  const [loading, setLoading]           = useState(false)
  const [success, setSuccess]           = useState<{ booking_number: string } | null>(null)
  const [error, setError]               = useState('')

  const nextId = () => Math.max(...passengers.map(p => p.id)) + 1

  const addPassenger = () => {
    if (passengers.length >= 8) return
    setPassengers(prev => [...prev, { id: nextId(), full_name: '', passenger_type: 'adult' }])
  }

  const removePassenger = (id: number) => {
    if (passengers.length <= 1) return
    setPassengers(prev => prev.filter(p => p.id !== id))
  }

  const updatePassenger = (id: number, field: keyof PassengerRow, value: string) => {
    setPassengers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  // Round-trip: 25% de descuento = precio_ida × 1.5 (igual que en la tienda online)
  const total = Math.round(
    passengers.reduce((sum, p) => sum + ROUTE_PRICES[p.passenger_type], 0)
    * (ticketType === 'round_trip' ? 1.5 : 1)
  )

  const canSubmit = email.includes('@') && passengers.every(p => p.full_name.trim().length >= 2) && date
    && (ticketType !== 'round_trip' || returnDate !== '')

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_type:        ticketType,
          total_amount:       total,
          guest_email:        email,
          payment_method:     'cash',
          origin_name:        'Los Angeles',
          destination_name:   'Tijuana',
          boarding_stop_code: 'LA',
          boarding_stop_name: 'Los Angeles',
          date,
          departure_time:     departureTime,
          return_date:        ticketType === 'round_trip' ? returnDate : undefined,
          passengers: passengers.map(p => ({
            full_name:      p.full_name.trim(),
            passenger_type: p.passenger_type,
            price:          Math.round(ROUTE_PRICES[p.passenger_type] * (ticketType === 'round_trip' ? 1.5 : 1)),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al crear la venta'); return }
      setSuccess({ booking_number: data.booking_number })
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
    setPassengers([{ id: 1, full_name: '', passenger_type: 'adult' }])
    setError('')
  }

  if (success) {
    return (
      <div className="p-4 sm:p-8 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="font-black text-xl text-slate-800 mb-1">¡Venta registrada!</h2>
          <p className="text-slate-500 text-sm mb-4">El boleto fue creado exitosamente.</p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Número de reservación</p>
            <p className="font-mono font-black text-xl text-[#0a1628]">{success.booking_number}</p>
            <p className="text-slate-400 text-xs mt-2">El boleto fue enviado al correo del cliente · Cobrar en efectivo</p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-[#0f2c5c] hover:bg-[#0a1e42] text-white font-bold text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Nueva venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-[#c01515]" />
          Nueva venta en caja
        </h1>
        <p className="text-slate-500 text-sm mt-1">Registro manual de boleto · Pago en efectivo</p>
      </div>

      <div className="space-y-5">

        {/* Ticket type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tipo de boleto</p>
          <div className="grid grid-cols-2 gap-3">
            {([['one_way', 'Sólo ida'], ['round_trip', 'Ida y vuelta']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTicketType(val)}
                className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  ticketType === val
                    ? 'border-[#c01515] bg-[#c01515]/5 text-[#c01515]'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {label}
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
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Hora</label>
              <select
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
              >
                {DEPARTURE_TIMES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Return date (round-trip only) */}
        {ticketType === 'round_trip' && (
          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Fecha de regreso</p>
            <p className="text-slate-400 text-xs mb-3">La hora queda abierta — el cliente puede abordar cualquier bus disponible ese día</p>
            <input
              type="date"
              value={returnDate}
              min={date ? (() => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })() : ''}
              onChange={e => setReturnDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
            />
            {returnDate && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-blue-700 text-xs font-semibold">Regreso: {returnDate} · Hora abierta</span>
              </div>
            )}
          </div>
        )}

        {/* Passengers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pasajeros</p>
            <button
              onClick={addPassenger}
              disabled={passengers.length >= 8}
              className="flex items-center gap-1 text-xs font-bold text-[#c01515] hover:text-[#a01010] disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          <div className="space-y-3">
            {passengers.map((p, idx) => (
              <div key={p.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#0f2c5c] text-white rounded-full flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-600">Pasajero {idx + 1}</span>
                  </div>
                  {passengers.length > 1 && (
                    <button onClick={() => removePassenger(p.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    value={p.full_name}
                    onChange={e => updatePassenger(p.id, 'full_name', e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {(['adult', 'senior', 'child'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => updatePassenger(p.id, 'passenger_type', type)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          p.passenger_type === type
                            ? 'border-[#c01515] bg-[#c01515]/10 text-[#c01515]'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {type === 'adult' ? 'Adulto' : type === 'senior' ? 'Senior' : 'Menor'}
                        <span className="block font-black text-[10px]">${ROUTE_PRICES[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Correo del cliente
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cliente@correo.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50"
          />
          <p className="text-slate-400 text-xs mt-2">El boleto con QR se enviará a este correo</p>
        </div>

        {/* Total */}
        <div className="bg-[#0f2c5c] rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Total a cobrar</p>
            <p className="text-3xl font-black mt-0.5">${total} <span className="text-base font-semibold text-white/60">USD</span></p>
            <p className="text-white/50 text-xs mt-1">
              {passengers.length} pasajero{passengers.length > 1 ? 's' : ''} · {ticketType === 'round_trip' ? 'Ida y vuelta' : 'Sólo ida'} · Efectivo
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

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#c01515] hover:bg-[#a01010] text-white font-black text-base transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
          Registrar venta · ${total} efectivo
        </button>
      </div>
    </div>
  )
}
