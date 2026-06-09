import { Map, ArrowRight, Clock, Bus } from 'lucide-react'
import { BUS_ROUTES, ALL_STOPS } from '@/lib/data/bus-config'

export const metadata = { title: 'Rutas — Admin' }

export default function RutasPage() {
  const laToTj = BUS_ROUTES.filter(r => r.direction === 'LA_TO_TJ')
  const tjToLa = BUS_ROUTES.filter(r => r.direction === 'TJ_TO_LA')

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <Map className="w-6 h-6 text-[#d97706]" />
          Rutas y horarios
        </h1>
        <p className="text-slate-500 text-sm mt-1">{BUS_ROUTES.length} servicios configurados — {laToTj.length} LA→TJ · {tjToLa.length} TJ→LA</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total servicios',   value: BUS_ROUTES.length },
          { label: 'LA → Tijuana',      value: laToTj.length },
          { label: 'Tijuana → LA',      value: tjToLa.length },
          { label: 'Capacidad por bus', value: '56 asientos' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <p className="font-black text-2xl text-[#0a1628]">{s.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">

        {/* LA → Tijuana */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <div className="w-2 h-2 rounded-full bg-[#c01515]" />
            <h2 className="font-bold text-slate-800 text-sm">Los Angeles → Tijuana ({laToTj.length} servicios)</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {laToTj.map(bus => (
              <div key={bus.id} className="px-5 py-4 flex items-start gap-4 flex-wrap">
                <div className="min-w-[70px] text-center shrink-0">
                  <p className="font-black text-[#0a1628] text-base">{bus.departs}</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wide">LA</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm mb-2">{bus.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {bus.stops.map((stop, i) => (
                      <div key={stop.code} className="flex items-center gap-1.5">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          stop.type === 'boarding'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-[rgba(240,180,41,0.1)] text-[#d97706]'
                        }`}>
                          {ALL_STOPS[stop.code]?.name}
                          <span className="opacity-60 ml-1">{stop.time}</span>
                        </div>
                        {i < bus.stops.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Bus className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-xs text-slate-400">{bus.capacity} asientos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tijuana → LA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <div className="w-2 h-2 rounded-full bg-[#d97706]" />
            <h2 className="font-bold text-slate-800 text-sm">Tijuana → Los Angeles ({tjToLa.length} servicios)</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {tjToLa.map(bus => (
              <div key={bus.id} className="px-5 py-4 flex items-start gap-4 flex-wrap">
                <div className="min-w-[70px] text-center shrink-0">
                  <p className="font-black text-[#0a1628] text-base">{bus.departs}</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wide">OTY/TIJ</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm mb-2">{bus.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {bus.stops.map((stop, i) => (
                      <div key={stop.code} className="flex items-center gap-1.5">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          stop.type === 'boarding'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-[rgba(240,180,41,0.1)] text-[#d97706]'
                        }`}>
                          {ALL_STOPS[stop.code]?.name}
                          <span className="opacity-60 ml-1">{stop.time}</span>
                        </div>
                        {i < bus.stops.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Bus className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-xs text-slate-400">{bus.capacity} asientos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <p className="text-slate-400 text-xs mt-6 text-center">
        Los horarios se actualizan en el archivo de configuración del sistema. Contacta al administrador técnico para modificarlos.
      </p>
    </div>
  )
}
