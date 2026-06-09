'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Clock, Wifi, Wind, Bath, Usb, ChevronRight, Star, AlertCircle, MapPin, ArrowRight, Users, Info, Bus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BUS_ROUTES, ALL_STOPS, getPrice, DEMO_SEATS_AVAILABLE,
  type StopCode, type BusRoute,
} from '@/lib/data/bus-config'

const AmenityIcon = ({ code }: { code: string }) => {
  const map: Record<string, { icon: React.ReactNode; label: string }> = {
    wifi:     { icon: <Wifi className="w-3.5 h-3.5" />,  label: 'Wi-Fi' },
    ac:       { icon: <Wind className="w-3.5 h-3.5" />,  label: 'A/C' },
    restroom: { icon: <Bath className="w-3.5 h-3.5" />,  label: 'Baño' },
    usb:      { icon: <Usb className="w-3.5 h-3.5" />,   label: 'USB' },
  }
  const item = map[code]
  if (!item) return null
  return (
    <span className="flex items-center gap-1 text-slate-500 text-xs">
      {item.icon}{item.label}
    </span>
  )
}

// Determine if origin stop can board on this bus (regardless of destination)
function canBoard(bus: BusRoute, origin: StopCode): boolean {
  const stop = bus.stops.find(s => s.code === origin)
  return !!stop && (stop.type === 'boarding' || stop.type === 'both')
}

// Find actual best destination for this bus given the searched destination
function resolveDestination(bus: BusRoute, wantedDest: StopCode): {
  code: StopCode
  time: string
  exact: boolean   // true = bus reaches the exact searched destination
} {
  const stopCodes = bus.stops.map(s => s.code)
  const wantedIdx = stopCodes.indexOf(wantedDest)

  if (wantedIdx !== -1) {
    const stop = bus.stops[wantedIdx]
    if (stop.type === 'dropping' || stop.type === 'both') {
      return { code: wantedDest, time: stop.time, exact: true }
    }
  }

  // Bus doesn't serve wanted destination — return its actual last stop
  const droppingStops = bus.stops.filter(s => s.type === 'dropping' || s.type === 'both')
  const lastDrop = droppingStops[droppingStops.length - 1]
  return { code: lastDrop.code as StopCode, time: lastDrop.time, exact: false }
}

export function TripResults() {
  const params = useSearchParams()
  const router = useRouter()

  const origin      = (params.get('origin')      || 'LA')  as StopCode
  const destination = (params.get('destination') || 'OTY') as StopCode
  const date        = params.get('date') || format(new Date(), 'yyyy-MM-dd')
  const passengers  = Number(params.get('passengers')) || 1
  const tripType    = params.get('tripType') || 'one_way'

  let parsedDate: Date
  try { parsedDate = parseISO(date) } catch { parsedDate = new Date() }
  const formattedDate = format(parsedDate, "EEEE d 'de' MMMM yyyy", { locale: es })

  // Round trip = 2 viajes con 25% de descuento = × 1.5
  const priceMultiplier = tripType === 'round_trip' ? 1.5 : 1

  // Show ALL buses where the user can board at the searched origin
  const busesToShow = BUS_ROUTES.filter(bus => canBoard(bus, origin))

  const exactCount = busesToShow.filter(bus => resolveDestination(bus, destination).exact).length

  const handleSelect = (bus: BusRoute, effectiveDest: StopCode) => {
    const pricing  = getPrice(origin, effectiveDest)
    const price    = Math.round(pricing.adult * priceMultiplier * passengers)
    const p = new URLSearchParams({
      origin, destination: effectiveDest, date,
      passengers: String(passengers),
      tripType,   price: String(price),
    })
    router.push(`/comprar/${bus.id}?${p.toString()}`)
  }

  return (
    <div>
      {/* Summary header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#c01515]" />
            {ALL_STOPS[origin]?.name || origin} → {ALL_STOPS[destination]?.name || destination}
          </h2>
          <p className="text-slate-500 text-sm capitalize mt-0.5">
            {formattedDate} · {passengers} pasajero{passengers > 1 ? 's' : ''} · {tripType === 'round_trip' ? 'Ida y vuelta' : 'Solo ida'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-xl font-medium">
            {busesToShow.length} salidas disponibles
          </span>
          {exactCount < busesToShow.length && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-1">
              <Info className="w-3 h-3" />
              {exactCount} llegan a {ALL_STOPS[destination]?.name} · {busesToShow.length - exactCount} llegan a San Ysidro
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {busesToShow.map(bus => {
          const seats        = DEMO_SEATS_AVAILABLE[bus.id] ?? 40
          const isFull       = seats === 0
          const isLow        = seats > 0 && seats <= 8

          const resolved     = resolveDestination(bus, destination)
          const effectiveDest = resolved.code
          const reachesExact  = resolved.exact

          const originStop   = bus.stops.find(s => s.code === origin)!
          const pricing      = getPrice(origin, effectiveDest)
          const priceAdult   = Math.round(pricing.adult * priceMultiplier)
          const totalPrice   = priceAdult * passengers

          // Stops between origin and effective destination (intermediates)
          const stopCodes    = bus.stops.map(s => s.code)
          const oIdx         = stopCodes.indexOf(origin)
          const dIdx         = stopCodes.indexOf(effectiveDest)
          const midStops     = bus.stops.slice(oIdx + 1, dIdx)

          return (
            <div
              key={bus.id}
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                isFull
                  ? 'border-slate-200 opacity-60'
                  : reachesExact
                  ? 'border-slate-200 hover:border-[#c01515]/30 hover:shadow-lg'
                  : 'border-amber-200 hover:border-amber-400 hover:shadow-lg'
              }`}
            >
              {/* Color top bar */}
              <div className={`h-1.5 ${
                isFull       ? 'bg-slate-200' :
                reachesExact ? 'bg-gradient-to-r from-[#c01515] to-[#0f2c5c]' :
                               'bg-gradient-to-r from-amber-400 to-amber-600'
              }`} />

              {/* Not-exact-destination banner */}
              {!reachesExact && !isFull && (
                <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-amber-700 text-xs font-semibold">
                    Este bus termina en <strong>{ALL_STOPS[effectiveDest]?.name}</strong> — no continúa a {ALL_STOPS[destination]?.name}
                  </span>
                </div>
              )}

              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">

                  {/* Left: timeline */}
                  <div className="flex-1">

                    {/* Main departure → arrival */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-center min-w-[75px]">
                        <p className="font-black text-[#0f2c5c] text-2xl leading-none">{originStop.time}</p>
                        <p className="text-slate-500 text-xs mt-1 font-medium">{ALL_STOPS[origin]?.name.split(' ')[0]}</p>
                      </div>

                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        {/* Intermediate stops chips */}
                        {midStops.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {midStops.map(s => (
                              <span key={s.code} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Bus className={`w-3 h-3 shrink-0 ${s.type === 'boarding' ? 'text-[#c01515]' : 'text-[#0f2c5c]'}`} />
                                {ALL_STOPS[s.code]?.name} {s.time}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="w-full relative flex items-center">
                          <div className="flex-1 h-px bg-slate-200" />
                          <ArrowRight className={`w-4 h-4 mx-1 shrink-0 ${reachesExact ? 'text-[#c01515]' : 'text-amber-500'}`} />
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                      </div>

                      <div className="text-center min-w-[75px]">
                        <p className={`font-black text-2xl leading-none ${reachesExact ? 'text-[#0f2c5c]' : 'text-amber-600'}`}>
                          {resolved.time}
                        </p>
                        <p className="text-slate-500 text-xs mt-1 font-medium">{ALL_STOPS[effectiveDest]?.name.split(' ')[0]}</p>
                        {!reachesExact && (
                          <p className="text-amber-600 text-[10px] font-bold mt-0.5">Última parada</p>
                        )}
                      </div>
                    </div>

                    {/* All stops of this bus */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-[#c01515] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Bus className="w-3.5 h-3.5" /> Abordaje
                        </p>
                        {bus.stops.filter(s => s.type === 'boarding' || s.type === 'both').map(s => (
                          <p key={s.code} className={`text-xs mb-1 flex items-center gap-1.5 ${s.code === origin ? 'font-bold text-[#0f2c5c]' : 'text-slate-500'}`}>
                            <MapPin className={`w-3 h-3 shrink-0 ${s.code === origin ? 'text-[#c01515]' : 'text-slate-300'}`} />
                            {ALL_STOPS[s.code]?.name}
                            <span className="text-slate-400 font-mono text-[10px]">({s.time})</span>
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#0f2c5c] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Bus className="w-3.5 h-3.5" /> Bajada
                        </p>
                        {bus.stops.filter(s => s.type === 'dropping' || s.type === 'both').map(s => (
                          <p key={s.code} className={`text-xs mb-1 flex items-center gap-1.5 ${s.code === effectiveDest ? 'font-bold text-[#0f2c5c]' : 'text-slate-500'}`}>
                            <MapPin className={`w-3 h-3 shrink-0 ${s.code === effectiveDest ? 'text-[#0f2c5c]' : 'text-slate-300'}`} />
                            {ALL_STOPS[s.code]?.name}
                            <span className="text-slate-400 font-mono text-[10px]">({s.time})</span>
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Amenities + capacity */}
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {['wifi','ac','restroom','usb'].map(a => <AmenityIcon key={a} code={a} />)}
                      <span className="flex items-center gap-1 text-slate-400 text-xs ml-auto">
                        <Users className="w-3.5 h-3.5" />
                        {isFull ? 'Agotado' : `${seats} lugares`}
                      </span>
                    </div>
                  </div>

                  {/* Right: price + CTA */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 lg:min-w-[155px]">
                    <div className="text-right">
                      {isLow && !isFull && (
                        <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold mb-1 justify-end">
                          <AlertCircle className="w-3 h-3" />
                          ¡Solo {seats} lugares!
                        </div>
                      )}
                      {isFull && <div className="text-[#c01515] text-xs font-bold mb-1">Agotado</div>}

                      <div className={`font-black text-3xl ${reachesExact ? 'text-[#0f2c5c]' : 'text-amber-600'}`}>
                        ${totalPrice}
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">
                        ${priceAdult} × {passengers} {passengers > 1 ? 'pas.' : 'adulto'}
                      </div>
                      {tripType === 'round_trip' && (
                        <div className="mt-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5 inline-block">
                          −25% I+V
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 mt-1.5 justify-end">
                        <Star className="w-3.5 h-3.5 fill-[#c8a951] text-[#c8a951]" />
                        <span className="text-slate-400 text-xs">{totalPrice} pts</span>
                      </div>
                    </div>

                    <Button
                      disabled={isFull}
                      onClick={() => handleSelect(bus, effectiveDest)}
                      className={`rounded-xl font-bold text-sm px-5 ${
                        isFull
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : reachesExact
                          ? 'bg-[#c01515] hover:bg-[#a01010] text-white shadow hover:shadow-lg transition-all'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow hover:shadow-lg transition-all'
                      }`}
                    >
                      {isFull ? 'Agotado' : 'Seleccionar'}
                      {!isFull && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {busesToShow.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🚌</div>
          <h3 className="font-bold text-slate-800 text-lg mb-2">No hay salidas desde {ALL_STOPS[origin]?.name}</h3>
          <p className="text-slate-500 text-sm">Intenta con otro origen o destino.</p>
        </div>
      )}
    </div>
  )
}
