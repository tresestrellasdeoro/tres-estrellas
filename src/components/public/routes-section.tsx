import Link from 'next/link'
import { ArrowRight, Clock, MapPin, ChevronRight } from 'lucide-react'
import { BUS_ROUTES, ALL_STOPS, type BusRoute } from '@/lib/data/bus-config'

const LA_TO_TJ = BUS_ROUTES.filter(b => b.direction === 'LA_TO_TJ')
const TJ_TO_LA = BUS_ROUTES.filter(b => b.direction === 'TJ_TO_LA')

function BusCard({ bus }: { bus: BusRoute }) {
  const boardingStops = bus.stops.filter(s => s.type === 'boarding' || s.type === 'both')
  const droppingStops = bus.stops.filter(s => s.type === 'dropping' || s.type === 'both')
  const firstStop = bus.stops[0]
  const lastStop  = bus.stops[bus.stops.length - 1]

  const originParam = firstStop.code
  const destParam   = lastStop.code

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-red-200 transition-all duration-300 group">
      {/* Header */}
      <div className="bg-[#0f2c5c] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#c01515] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none">{bus.departs}</p>
            <p className="text-white/45 text-[10px] uppercase tracking-wider">
              {bus.direction === 'LA_TO_TJ' ? 'LA → Tijuana' : 'Tijuana → LA'}
            </p>
          </div>
        </div>
        <Link
          href={`/buscar?origin=${originParam}&destination=${destParam}`}
          className="flex items-center gap-1 text-[#c8a951] text-xs font-bold hover:gap-2 transition-all"
        >
          Comprar <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stop timeline */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-200" />
          <div className="space-y-2.5">
            {bus.stops.map((stop, i) => {
              const isFirst = i === 0
              const isLast  = i === bus.stops.length - 1
              const isBoarding = stop.type === 'boarding'
              const isDropping = stop.type === 'dropping'
              return (
                <div key={`${stop.code}-${i}`} className="flex items-center gap-3 relative">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 z-10 ${
                    isBoarding ? 'bg-[#c01515] border-[#c01515]' :
                    isDropping ? 'bg-[#0f2c5c] border-[#0f2c5c]' :
                                 'bg-amber-500 border-amber-500'
                  }`} />
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <div className="min-w-0">
                      <span className={`text-xs truncate block ${
                        isFirst || isLast ? 'font-bold text-slate-800' : 'text-slate-500'
                      }`}>
                        {ALL_STOPS[stop.code]?.name || stop.code}
                      </span>
                      <span className={`text-[10px] ${
                        isBoarding ? 'text-[#c01515]' : isDropping ? 'text-[#0f2c5c]/60' : 'text-amber-600'
                      }`}>
                        {isBoarding ? 'Abordaje' : isDropping ? 'Bajada' : 'Abordaje y bajada'}
                      </span>
                    </div>
                    <span className={`text-xs font-mono shrink-0 ml-2 font-bold ${
                      isFirst ? 'text-[#c01515]' :
                      isLast  ? 'text-[#0f2c5c]' :
                      'text-slate-400'
                    }`}>
                      {stop.time}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RoutesSection() {
  return (
    <section id="rutas" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 mb-4">
            <MapPin className="w-3 h-3 text-[#c01515]" />
            <span className="text-[#c01515] text-xs font-bold tracking-wider uppercase">Nuestras rutas</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-[#0f2c5c] tracking-tight">
            Los Angeles ↔ Tijuana
          </h2>
          <p className="text-slate-500 text-base mt-3 max-w-xl mx-auto">
            {BUS_ROUTES.length} salidas diarias • Todos los días del año • Wi-Fi • 56 pasajeros
          </p>
        </div>

        {/* LA → Tijuana */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="flex items-center gap-2 px-4 py-2 bg-[#0f2c5c] rounded-full">
              <span className="text-white font-bold text-sm">Los Angeles</span>
              <ArrowRight className="w-4 h-4 text-[#c8a951]" />
              <span className="text-white font-bold text-sm">Tijuana</span>
            </div>
            <div className="text-white/60 text-xs font-bold bg-[#c01515] rounded-full px-3 py-1 shrink-0">
              {LA_TO_TJ.length} salidas
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {LA_TO_TJ.map(bus => (
              <BusCard key={bus.id} bus={bus} />
            ))}
          </div>
        </div>

        {/* TJ → LA */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="flex items-center gap-2 px-4 py-2 bg-[#c01515] rounded-full">
              <span className="text-white font-bold text-sm">Tijuana</span>
              <ArrowRight className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">Los Angeles</span>
            </div>
            <div className="text-white/60 text-xs font-bold bg-[#0f2c5c] rounded-full px-3 py-1 shrink-0">
              {TJ_TO_LA.length} salidas
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TJ_TO_LA.map(bus => (
              <BusCard key={bus.id} bus={bus} />
            ))}
          </div>
        </div>

        {/* Quick schedule bar */}
        <div className="bg-[#0f2c5c] rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#c8a951]" />
                Salidas desde Los Angeles
              </h3>
              <div className="flex flex-wrap gap-2">
                {LA_TO_TJ.map(bus => (
                  <Link
                    key={bus.id}
                    href={`/buscar?origin=LA&destination=OTY`}
                    className="px-3 py-1.5 rounded-xl bg-white/8 border border-white/15 text-white/80 text-sm font-semibold hover:bg-[#c01515] hover:border-[#c01515] hover:text-white transition-all"
                  >
                    {bus.departs}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#c8a951]" />
                Salidas desde Tijuana
              </h3>
              <div className="flex flex-wrap gap-2">
                {TJ_TO_LA.map(bus => (
                  <Link
                    key={bus.id}
                    href={`/buscar?origin=OTY&destination=LA`}
                    className="px-3 py-1.5 rounded-xl bg-white/8 border border-white/15 text-white/80 text-sm font-semibold hover:bg-[#c8a951]/80 hover:border-[#c8a951] hover:text-[#0f2c5c] transition-all"
                  >
                    {bus.departs}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
