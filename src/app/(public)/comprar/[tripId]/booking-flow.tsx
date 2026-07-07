'use client'

import { useState, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  User, Armchair, CreditCard, CheckCircle2, ChevronLeft, Bus,
  MapPin, Clock, Star, ArrowRight, Luggage, Package, AlertCircle, Banknote, Download, CalendarDays,
} from 'lucide-react'
import { generateTicketPdf } from '@/lib/pdf/ticket-pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SeatMap, type SeatId } from '@/components/public/seat-map'
import { SquareCard, type SquareCardHandle } from '@/components/public/square-card'
import {
  getBusById, getBoardingStops, getDroppingStops,
  getPrice, LUGGAGE_OPTIONS, ALL_STOPS,
  type StopCode, type LuggageOption,
} from '@/lib/data/bus-config'

const STEPS = [
  { label: 'Pasajeros',  icon: User },
  { label: 'Asientos',   icon: Armchair },
  { label: 'Pago',       icon: CreditCard },
  { label: 'Listo',      icon: CheckCircle2 },
]

interface Passenger {
  name: string
  type: 'adult' | 'child'
}

export function BookingFlow({ tripId }: { tripId: string }) {
  const params      = useSearchParams()
  const router      = useRouter()
  const squareRef   = useRef<SquareCardHandle>(null)

  const origin      = (params.get('origin')      || 'LA')  as StopCode
  const destination = (params.get('destination') || 'OTY') as StopCode
  const date        = params.get('date')      || ''
  const passCount   = Number(params.get('passengers')) || 1
  const tripType    = params.get('tripType')  || 'one_way'

  const bus         = getBusById(tripId)
  const boardingStops = bus ? getBoardingStops(bus) : []

  const [step, setStep]   = useState(0)
  const [passengers, setPassengers] = useState<Passenger[]>(
    Array.from({ length: passCount }, () => ({ name: '', type: 'adult' }))
  )
  const [boardingStop, setBoardingStop] = useState<StopCode>(origin)
  const [luggage, setLuggage]           = useState<LuggageOption>(LUGGAGE_OPTIONS[0])
  const [selectedSeats, setSelectedSeats] = useState<Record<number, SeatId>>({})

  const [returnDate, setReturnDate]  = useState('')
  const [email, setEmail]           = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [loading, setLoading]         = useState(false)
  const [bookingRef, setBookingRef]   = useState('')
  const [bookingError, setBookingError] = useState('')
  const [squareReady, setSquareReady] = useState(false)

  const updatePassenger = (i: number, field: keyof Passenger, value: string) => {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  // Dynamic pricing
  const pricing = useMemo(() => getPrice(boardingStop, destination), [boardingStop, destination])
  const adultPrice = Math.round(pricing.adult * (tripType === 'round_trip' ? 1.5 : 1))
  const childPrice = Math.round(pricing.child * (tripType === 'round_trip' ? 1.5 : 1))

  const passengersTotal = passengers.reduce((sum, p) => sum + (p.type === 'adult' ? adultPrice : childPrice), 0)
  const luggageTotal    = luggage.price * passCount
  const grandTotal      = passengersTotal + luggageTotal

  const boardingStopInfo = bus?.stops.find(s => s.code === boardingStop)
  const destStopInfo     = bus?.stops.find(s => s.code === destination)

  const canStep0 = passengers.every(p => p.name.trim().length >= 2) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && (tripType !== 'round_trip' || returnDate !== '')
  const canStep1 = Object.keys(selectedSeats).length === passCount
  const canStep2 = paymentMethod === 'cash' || squareReady

  const handlePay = async () => {
    setLoading(true)
    setBookingError('')
    try {
      // Tokenize card with Square before hitting our API
      let sourceId: string | undefined
      if (paymentMethod === 'card') {
        if (!squareRef.current) throw new Error('El formulario de pago no está listo. Espera un momento y vuelve a intentar.')
        sourceId = await squareRef.current.tokenize()
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_type:        tripType,
          total_amount:       grandTotal,
          guest_email:        email,
          payment_method:     paymentMethod,
          source_id:          sourceId,
          origin_name:        ALL_STOPS[boardingStop]?.name || boardingStop,
          destination_name:   ALL_STOPS[destination]?.name || destination,
          boarding_stop_code: boardingStop,
          boarding_stop_name: ALL_STOPS[boardingStop]?.name || boardingStop,
          date,
          departure_time:     bus?.departs || '',
          return_date:        tripType === 'round_trip' ? returnDate : undefined,
          passengers: passengers.map((p, i) => ({
            full_name:      p.name,
            passenger_type: p.type,
            price:          p.type === 'adult' ? adultPrice : childPrice,
            seat_number:    selectedSeats[i] ?? undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')
      setBookingRef(data.booking_number)
      if (data.email_error) setBookingError(`Reservación creada, pero el email falló: ${data.email_error}`)
      setStep(3)
    } catch (err: any) {
      setBookingError(err.message || 'Error al procesar la reservación')
    } finally {
      setLoading(false)
    }
  }

  const TripBar = () => (
    <div className="bg-[#0f2c5c] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#c01515]/20 flex items-center justify-center shrink-0">
        <Bus className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <MapPin className="w-3.5 h-3.5 text-[#c01515]" />
          {ALL_STOPS[boardingStop]?.name} → {ALL_STOPS[destination]?.name}
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-white/50 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {date} · {bus?.departs || ''} · {tripType === 'round_trip' ? 'Ida y vuelta' : 'Solo ida'}
          </span>
          <span>{passCount} pasajero{passCount > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white font-black text-2xl">${grandTotal}</div>
        <div className="flex items-center gap-1 text-white/40 text-xs justify-end mt-0.5">
          <Star className="w-3 h-3 fill-[#c8a951] text-[#c8a951]" />
          {grandTotal} pts
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

      {/* Steps */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                i < step   ? 'bg-[#c01515] text-white' :
                i === step ? 'bg-[#0f2c5c] text-white ring-2 ring-[#c01515]/60 ring-offset-2' :
                             'bg-slate-200 text-slate-400'
              }`}>
                {i < step ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-[#0f2c5c]' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 transition-all ${i < step ? 'bg-[#c01515]' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <TripBar />

      {/* ── STEP 0: Passengers + Boarding stop + Luggage ── */}
      {step === 0 && (
        <div className="space-y-4">

          {/* Boarding stop selection */}
          {boardingStops.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#c01515]" />
                ¿En qué parada abordas?
              </h2>
              <p className="text-slate-400 text-sm mb-4">El precio varía según la parada de abordaje.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boardingStops.map(stop => {
                  const p = getPrice(stop.code as StopCode, destination)
                  const price = Math.round(p.adult * (tripType === 'round_trip' ? 1.5 : 1))
                  const selected = boardingStop === stop.code
                  return (
                    <button
                      key={stop.code}
                      onClick={() => setBoardingStop(stop.code as StopCode)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? 'border-[#c01515] bg-red-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`flex items-center gap-2 font-bold text-sm ${selected ? 'text-[#c01515]' : 'text-slate-700'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-[#c01515] bg-[#c01515]' : 'border-slate-300'}`}>
                              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            {ALL_STOPS[stop.code as StopCode]?.name}
                          </div>
                          <p className="text-slate-400 text-xs mt-1 ml-6 font-mono">{stop.time}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-black text-lg ${selected ? 'text-[#c01515]' : 'text-slate-700'}`}>${price}</p>
                          <p className="text-slate-400 text-[10px]">
                            {tripType === 'round_trip' ? 'adulto I+V (−25%)' : 'adulto solo ida'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Passengers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
              <User className="w-5 h-5 text-[#c01515]" />
              Datos de los pasajeros
            </h2>
            <p className="text-slate-400 text-sm mb-6">Ingresa el nombre como aparece en la identificación.</p>
            <div className="space-y-4">
              {passengers.map((p, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#c01515]/10 border border-[#c01515]/20 flex items-center justify-center text-[#c01515] text-xs font-black">{i + 1}</div>
                      <span className="text-slate-600 text-sm font-semibold">Pasajero {i + 1}</span>
                    </div>
                    <span className="font-bold text-[#c01515] text-sm">
                      ${p.type === 'adult' ? adultPrice : childPrice}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre completo</Label>
                      <Input value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)}
                        placeholder="Nombre Apellido"
                        className="mt-1.5 rounded-xl border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de pasajero</Label>
                      <select value={p.type} onChange={e => updatePassenger(i, 'type', e.target.value)}
                        className="w-full mt-1.5 appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]">
                        <option value="adult">Adulto — ${adultPrice}</option>
                        <option value="child">Menor (0–11 años) — ${childPrice}</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email for ticket delivery */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#c01515]" />
              ¿A dónde enviamos tu boleto?
            </h2>
            <p className="text-slate-400 text-sm mb-4">Recibirás tu boleto digital con código QR en este correo.</p>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo electrónico</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="mt-1.5 rounded-xl border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20"
              />
              {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <p className="text-red-500 text-xs mt-1.5">Ingresa un correo electrónico válido</p>
              )}
            </div>
          </div>

          {/* Return date (round-trip only) */}
          {tripType === 'round_trip' && (
            <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                Fecha de regreso
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Elige el día en que planeas regresar. <span className="font-semibold text-blue-600">La hora es abierta</span> — puedes abordar cualquier autobús disponible ese día.
              </p>
              <input
                type="date"
                value={returnDate}
                min={date ? (() => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })() : ''}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
              />
              {returnDate && (
                <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-blue-700 text-sm font-semibold">
                    Regreso el <span className="font-black">{returnDate}</span> · Hora abierta — aborda el bus que más te convenga
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Luggage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
              <Luggage className="w-5 h-5 text-[#c01515]" />
              Equipaje
            </h2>
            <p className="text-slate-400 text-sm mb-4">El equipaje de mano siempre es gratuito. Agrega maletas si necesitas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LUGGAGE_OPTIONS.map(opt => {
                const selected = luggage.id === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLuggage(opt)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected ? 'border-[#c01515] bg-red-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className={`font-bold text-sm ${selected ? 'text-[#c01515]' : 'text-slate-700'}`}>{opt.label}</p>
                          <p className="text-slate-400 text-xs">{opt.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {opt.price === 0
                          ? <span className="text-emerald-600 font-bold text-sm">Gratis</span>
                          : <span className={`font-black text-lg ${selected ? 'text-[#c01515]' : 'text-slate-700'}`}>+${opt.price}</span>
                        }
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {luggage.price > 0 && (
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                +${luggage.price} × {passCount} pasajero{passCount > 1 ? 's' : ''} = ${luggageTotal} de equipaje
              </p>
            )}
          </div>

          {/* Price summary */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resumen de precio</p>
            <div className="space-y-1.5 text-sm">
              {tripType === 'round_trip' && (
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Precio por pasajero (ida y vuelta con 25% desc.)</span>
                  <span className="text-emerald-600 font-bold">−25%</span>
                </div>
              )}
              {passengers.map((p, i) => {
                const basePrice   = p.type === 'adult' ? pricing.adult : pricing.child
                const finalPrice  = p.type === 'adult' ? adultPrice    : childPrice
                const savings     = tripType === 'round_trip' ? Math.round(basePrice * 2 - finalPrice) : 0
                return (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>
                      {p.name || `Pasajero ${i+1}`}{' '}
                      <span className="text-slate-400">({p.type === 'adult' ? 'Adulto' : 'Menor'})</span>
                    </span>
                    <div className="text-right">
                      <span className="font-semibold">${finalPrice}</span>
                      {savings > 0 && (
                        <span className="ml-1.5 text-emerald-600 text-xs font-bold">−${savings}</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {luggage.price > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Equipaje ({luggage.label})</span>
                  <span className="font-semibold">+${luggageTotal}</span>
                </div>
              )}
              {tripType === 'round_trip' && (
                <div className="flex justify-between text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <span>Ahorro total ida y vuelta (25% desc.)</span>
                  <span>−${Math.round(passengers.reduce((s, p) => s + (p.type === 'adult' ? pricing.adult : pricing.child) * 2, 0) - passengersTotal)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-black text-slate-800 text-base">
                <span>Total{tripType === 'round_trip' ? ' (ida y vuelta)' : ''}</span>
                <span className="text-[#c01515]">${grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={!canStep0} onClick={() => setStep(1)}
              className="bg-[#c01515] hover:bg-[#a01010] text-white font-black px-6 rounded-xl disabled:opacity-40">
              Elegir asientos
              <Armchair className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Seat selection ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-[#c01515]" />
            Selecciona tus asientos
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Bus de 14 filas × 4 columnas (A B | C D). Haz click en el asiento que quieras.
          </p>

          <SeatMap
            passengers={passengers}
            onChange={seats => setSelectedSeats(seats)}
          />

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Regresar
            </button>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">
                {Object.keys(selectedSeats).length}/{passCount} asientos
              </span>
              <Button disabled={!canStep1} onClick={() => setStep(2)}
                className="bg-[#c01515] hover:bg-[#a01010] text-white font-black px-6 rounded-xl disabled:opacity-40">
                Continuar al pago
                <CreditCard className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Payment ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#c01515]" />
            Método de pago
          </h2>
          <p className="text-slate-400 text-sm mb-5">Elige cómo deseas pagar tu boleto.</p>

          {/* Payment method selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === 'card'
                  ? 'border-[#c01515] bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === 'card' ? 'bg-[#c01515]' : 'bg-slate-100'}`}>
                  <CreditCard className={`w-4 h-4 ${paymentMethod === 'card' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${paymentMethod === 'card' ? 'text-[#c01515]' : 'text-slate-700'}`}>Tarjeta</p>
                  <p className="text-slate-400 text-xs">Débito o crédito</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === 'cash'
                  ? 'border-[#c01515] bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-[#c01515]' : 'bg-slate-100'}`}>
                  <Banknote className={`w-4 h-4 ${paymentMethod === 'cash' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${paymentMethod === 'cash' ? 'text-[#c01515]' : 'text-slate-700'}`}>Efectivo</p>
                  <p className="text-slate-400 text-xs">Paga en ventanilla</p>
                </div>
              </div>
            </button>
          </div>

          {/* Square card form */}
          {paymentMethod === 'card' && (
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Datos de tarjeta
              </Label>
              <SquareCard ref={squareRef} onReady={() => setSquareReady(true)} />
              <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                🔒 Formulario cifrado por Square — tus datos nunca tocan nuestros servidores
              </p>
            </div>
          )}

          {/* Cash info */}
          {paymentMethod === 'cash' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <Banknote className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">Pago en ventanilla</p>
                <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                  Tu reservación quedará confirmada y recibirás tu boleto por correo. Deberás presentarlo y pagar <span className="font-black">${grandTotal} USD</span> en la terminal antes de abordar.
                </p>
              </div>
            </div>
          )}

          {/* Order summary */}
          <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resumen del pedido</h3>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Parada de abordaje</span>
              <span className="font-semibold text-slate-700">{ALL_STOPS[boardingStop]?.name} · {boardingStopInfo?.time}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Destino</span>
              <span className="font-semibold text-slate-700">{ALL_STOPS[destination]?.name} · {destStopInfo?.time}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-1" />
            {passengers.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {p.name || `Pasajero ${i+1}`}
                  {selectedSeats[i] && <span className="ml-1.5 font-bold text-[#c01515]">· Asiento {selectedSeats[i]}</span>}
                  <span className="ml-1 text-slate-400">({p.type === 'adult' ? 'Adulto' : 'Menor'})</span>
                </span>
                <span className="font-semibold text-slate-700">${p.type === 'adult' ? adultPrice : childPrice}</span>
              </div>
            ))}
            {luggage.price > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <Luggage className="w-3 h-3" /> {luggage.label}
                </span>
                <span className="font-semibold text-slate-700">+${luggageTotal}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-black text-slate-800">
              <span>Total a pagar</span>
              <span className="text-[#c01515]">${grandTotal}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Regresar
            </button>
            <Button onClick={handlePay} disabled={loading || !canStep2}
              className="bg-[#c01515] hover:bg-[#a01010] text-white font-black px-8 rounded-xl disabled:opacity-40">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Procesando...
                </span>
              ) : paymentMethod === 'cash'
                  ? <>Confirmar reservación <CheckCircle2 className="w-4 h-4 ml-2" /></>
                  : <>Pagar ${grandTotal} <CheckCircle2 className="w-4 h-4 ml-2" /></>
              }
            </Button>
          </div>
          {bookingError && (
            <p className="text-center text-red-600 text-sm mt-3 font-semibold">{bookingError}</p>
          )}
        </div>
      )}

      {/* ── STEP 3: Confirmation ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-6 animate-float">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>

          <h2 className="font-display font-black text-2xl text-[#0f2c5c] mb-2">¡Reservación confirmada!</h2>
          <p className="text-slate-500 text-sm mb-2">Tu boleto con código QR fue enviado a:</p>
          <p className="text-[#c01515] font-bold text-sm mb-6">{email}</p>

          <div className="inline-block bg-[#0f2c5c] rounded-2xl px-8 py-4 mb-6">
            <p className="text-white/50 text-xs mb-1 uppercase tracking-widest">Número de reservación</p>
            <p className="text-[#c8a951] font-black text-2xl tracking-widest">{bookingRef}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2 border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Bus</span>
              <span className="font-semibold">{bus?.name || tripId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Aborda en</span>
              <span className="font-semibold">{ALL_STOPS[boardingStop]?.name} · {boardingStopInfo?.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Llega a</span>
              <span className="font-semibold">{ALL_STOPS[destination]?.name} · {destStopInfo?.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Fecha</span>
              <span className="font-semibold">{date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tipo</span>
              <span className="font-semibold">{tripType === 'round_trip' ? 'Ida y vuelta' : 'Solo ida'}</span>
            </div>
            {tripType === 'round_trip' && returnDate && (
              <div className="flex justify-between text-sm bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mt-1">
                <span className="text-blue-600 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Regreso
                </span>
                <span className="font-black text-blue-700">{returnDate} · Hora abierta</span>
              </div>
            )}
            {luggage.price > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Equipaje</span>
                <span className="font-semibold">{luggage.label}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
              {passengers.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-500">{p.name}</span>
                  <span className="font-bold text-[#c01515] flex items-center gap-1">
                    <Armchair className="w-3.5 h-3.5" />
                    Asiento {selectedSeats[i] || '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500 font-bold">Total</span>
              <span className="font-black text-[#0f2c5c]">${grandTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Método de pago</span>
              <span className={`font-bold text-sm ${paymentMethod === 'cash' ? 'text-amber-600' : 'text-slate-700'}`}>
                {paymentMethod === 'cash' ? '💵 Efectivo en ventanilla' : '💳 Tarjeta'}
              </span>
            </div>
            {paymentMethod === 'cash' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
                <p className="text-amber-700 text-xs font-semibold">Recuerda pagar en la terminal antes de abordar.</p>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#c8a951]" /> Puntos ganados
              </span>
              <span className="font-bold text-[#c8a951]">+{grandTotal} pts</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => generateTicketPdf({
                bookingNumber:  bookingRef,
                passengerNames: passengers.map(p => p.name),
                selectedSeats,
                origin:         ALL_STOPS[boardingStop]?.name || boardingStop,
                destination:    ALL_STOPS[destination]?.name  || destination,
                boardingStop:   ALL_STOPS[boardingStop]?.name || boardingStop,
                boardingTime:   boardingStopInfo?.time || '',
                date,
                departureTime:  bus?.departs || '',
                tripType,
                total:          grandTotal,
                paymentMethod,
                email,
                returnDate:     tripType === 'round_trip' ? returnDate : undefined,
              })}
              className="rounded-xl border-slate-200 text-slate-600 text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
            <Button onClick={() => router.push('/')} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl text-sm">
              Volver al inicio
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
