'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, Search, Loader2, ArrowRight, ArrowLeftRight, Filter } from 'lucide-react'

interface Precio {
  id: number
  id_viaje: number
  tipo_viaje: string
  origen: string
  destino: string
  precio_adulto: number
  precio_nino: number | null
  precio_senior: number | null
  precio_estu: number | null
  precio_mestr: number | null
}

const STOP_NAMES: Record<string, string> = {
  HUN: 'Huntington Park', LAX: 'Los Angeles', SYC: 'San Ysidro',
  ATI: 'Aerop. Internacional TIJ', OTY: 'Garita de Otay', CAT: 'Central Camionera TIJ',
  LTI: 'Las Tijeras', ELP: 'El Paso', FAT: 'Fresno', AHM: 'Anaheim',
  SAC: 'Sacramento', PHX: 'Phoenix', SNA: 'Santa Ana', CBX: 'Cross Border Xpress',
}

function stopLabel(code: string) {
  return STOP_NAMES[code] ? `${code} — ${STOP_NAMES[code]}` : code
}

export default function PreciosHistoricosPage() {
  const [precios,   setPrecios]   = useState<Precio[]>([])
  const [origenes,  setOrigenes]  = useState<string[]>([])
  const [destinos,  setDestinos]  = useState<string[]>([])
  const [origen,    setOrigen]    = useState('')
  const [destino,   setDestino]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [searched,  setSearched]  = useState(false)

  // Cargar códigos para filtros al inicio
  useEffect(() => {
    fetch('/api/admin/precios-historicos')
      .then(r => r.json())
      .then(d => { setOrigenes(d.origenes ?? []); setDestinos(d.destinos ?? []) })
  }, [])

  const buscar = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams()
    if (origen)  params.set('origen', origen)
    if (destino) params.set('destino', destino)
    const res  = await fetch(`/api/admin/precios-historicos?${params}`)
    const data = await res.json()
    setPrecios(data.precios ?? [])
    setLoading(false)
  }, [origen, destino])

  const oneway    = precios.filter(p => p.tipo_viaje === 'one_way')
  const roundtrip = precios.filter(p => p.tipo_viaje === 'round_trip')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#c01515]" />
          Tarifas históricas
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          1,695 tarifas del sistema anterior · adulto, niño, senior, estudiante, maestro
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtrar por ruta
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-bold text-slate-500 block mb-1">Origen</label>
            <select value={origen} onChange={e => setOrigen(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515]">
              <option value="">— Todos —</option>
              {origenes.map(o => <option key={o} value={o}>{stopLabel(o)}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-bold text-slate-500 block mb-1">Destino</label>
            <select value={destino} onChange={e => setDestino(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#c01515]">
              <option value="">— Todos —</option>
              {destinos.map(d => <option key={d} value={d}>{stopLabel(d)}</option>)}
            </select>
          </div>
          <button onClick={buscar} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c01515] hover:bg-[#a01010] text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando tarifas...
        </div>
      )}

      {!loading && searched && precios.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No se encontraron tarifas para esa ruta.</div>
      )}

      {!loading && precios.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {precios.length} tarifa{precios.length > 1 ? 's' : ''} encontrada{precios.length > 1 ? 's' : ''}
          </p>

          {/* Solo ida */}
          {oneway.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="font-black text-slate-700 text-sm">SOLO IDA</span>
                <span className="ml-auto text-xs text-slate-400">{oneway.length} rutas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      {['Origen','Destino','Adulto','Niño','Senior','Estudiante','Maestro'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {oneway.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#0a1628]">{p.origen}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[#0a1628]">{p.destino}</td>
                        <td className="px-4 py-3 font-black text-emerald-600">${p.precio_adulto}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_nino != null ? `$${p.precio_nino}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_senior != null ? `$${p.precio_senior}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_estu != null ? `$${p.precio_estu}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_mestr != null ? `$${p.precio_mestr}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ida y vuelta */}
          {roundtrip.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                <span className="font-black text-blue-700 text-sm">IDA Y VUELTA</span>
                <span className="ml-auto text-xs text-blue-400">{roundtrip.length} rutas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      {['Origen','Destino','Adulto','Niño','Senior','Estudiante','Maestro'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roundtrip.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#0a1628]">{p.origen}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[#0a1628]">{p.destino}</td>
                        <td className="px-4 py-3 font-black text-blue-600">${p.precio_adulto}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_nino != null ? `$${p.precio_nino}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_senior != null ? `$${p.precio_senior}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_estu != null ? `$${p.precio_estu}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.precio_mestr != null ? `$${p.precio_mestr}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-16 text-slate-300">
          <DollarSign className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">Selecciona origen o destino para ver las tarifas</p>
          <p className="text-xs text-slate-300 mt-1">33 orígenes · 56 destinos · precios por tipo de pasajero</p>
        </div>
      )}
    </div>
  )
}
