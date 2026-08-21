'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts'
import { History, TrendingUp, Ticket, Users, AlertTriangle, ArrowLeftRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Resumen {
  total: number
  totalIngresos: number
  totalCancelados: number
  totalRoundtrip: number
  pctRoundtrip: number
  pctCancelados: number
  mejorAnio: string
  mejorAnioIngresos: number
}
interface PorAnio {
  year: string
  boletos: number
  ingresos: number
  roundtrip: number
  cancelados: number
}
interface TopRuta   { ruta: string; boletos: number; ingresos: number }
interface TopCajero { cajero: string; boletos: number }

const STOP_NAMES: Record<string, string> = {
  HUN: 'Huntington', LAX: 'Los Angeles', SYC: 'San Ysidro', ATI: 'Aerop. TIJ',
  OTY: 'Otay', CAT: 'Central TIJ', LTI: 'Las Tijeras', ELP: 'El Paso',
  FAT: 'Fresno', AHM: 'Anaheim', SAC: 'Sacramento', PHX: 'Phoenix',
  SNA: 'Santa Ana', CBX: 'CBX', ARTIC: 'ARTIC',
}
function rutaLabel(ruta: string) {
  const [o, d] = ruta.split('-')
  return `${STOP_NAMES[o] ?? o} → ${STOP_NAMES[d] ?? d}`
}

function fmt(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-black text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name.includes('ngreso') ? fmt(p.value) : p.value?.toLocaleString('es-MX')}
        </p>
      ))}
    </div>
  )
}

export default function HistoricoAnaliticaPage() {
  const [loading,   setLoading]   = useState(true)
  const [resumen,   setResumen]   = useState<Resumen | null>(null)
  const [porAnio,   setPorAnio]   = useState<PorAnio[]>([])
  const [topRutas,  setTopRutas]  = useState<TopRuta[]>([])
  const [topCajeros,setTopCajeros]= useState<TopCajero[]>([])
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetch('/api/admin/analytics/historico')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setResumen(d.resumen)
        setPorAnio(d.porAnio)
        setTopRutas(d.topRutas)
        setTopCajeros(d.topCajeros)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="font-semibold">Cargando datos históricos (723,019 boletos)…</span>
    </div>
  )

  if (error) return (
    <div className="p-8 text-red-500 font-semibold">{error}</div>
  )

  const maxBoletos = Math.max(...topRutas.map(r => r.boletos))
  const maxCajero  = Math.max(...topCajeros.map(c => c.boletos))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/analitica" className="text-slate-400 hover:text-slate-600 text-sm">← Analítica</Link>
          </div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <History className="w-6 h-6 text-[#c01515]" />
            Analítica histórica
          </h1>
          <p className="text-slate-500 text-sm mt-1">Sistema anterior · 2018 – 2025 · {resumen?.total.toLocaleString('es-MX')} boletos</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-xs font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Datos de solo lectura — sistema legacy
        </div>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Ticket className="w-3.5 h-3.5" /> Total boletos
            </div>
            <p className="font-black text-2xl text-[#0a1628]">{resumen.total.toLocaleString('es-MX')}</p>
            <p className="text-xs text-slate-400 mt-1">{resumen.pctCancelados}% cancelados</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> Ingresos totales
            </div>
            <p className="font-black text-2xl text-emerald-600">{fmt(resumen.totalIngresos)}</p>
            <p className="text-xs text-slate-400 mt-1">Mejor año: {resumen.mejorAnio} ({fmt(resumen.mejorAnioIngresos)})</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Ida y vuelta
            </div>
            <p className="font-black text-2xl text-blue-600">{resumen.pctRoundtrip}%</p>
            <p className="text-xs text-slate-400 mt-1">{resumen.totalRoundtrip.toLocaleString('es-MX')} boletos</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> Años de operación
            </div>
            <p className="font-black text-2xl text-[#0a1628]">8</p>
            <p className="text-xs text-slate-400 mt-1">2018 – 2025</p>
          </div>
        </div>
      )}

      {/* Ingresos por año */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-black text-slate-800 mb-1">Ingresos por año</h2>
        <p className="text-slate-400 text-xs mb-5">La caída de 2020 refleja el impacto del COVID-19</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={porAnio} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fontWeight: 700 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#0f2c5c" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Boletos por año */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-black text-slate-800 mb-1">Volumen de boletos por año</h2>
        <p className="text-slate-400 text-xs mb-5">Ida sola vs ida y vuelta</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={porAnio}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fontWeight: 700 }} />
            <YAxis tickFormatter={v => v.toLocaleString('es-MX')} tick={{ fontSize: 11 }} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line dataKey="boletos"   name="Total boletos"   type="monotone" stroke="#0f2c5c" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line dataKey="roundtrip" name="Ida y vuelta"    type="monotone" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top rutas + Top cajeros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top rutas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-black text-slate-800 mb-1">Top 10 rutas</h2>
          <p className="text-slate-400 text-xs mb-5">Por volumen total de boletos (2018–2025)</p>
          <div className="space-y-3">
            {topRutas.map((r, i) => (
              <div key={r.ruta}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}</span>
                    <span className="text-sm font-semibold text-slate-700">{rutaLabel(r.ruta)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800">{r.boletos.toLocaleString('es-MX')}</span>
                    <span className="text-xs text-slate-400 ml-1">boletos</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#c01515]"
                    style={{ width: `${(r.boletos / maxBoletos) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top cajeros */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-black text-slate-800 mb-1">Top 10 cajeros</h2>
          <p className="text-slate-400 text-xs mb-5">Por boletos vendidos (todos los años)</p>
          <div className="space-y-3">
            {topCajeros.map((c, i) => (
              <div key={c.cajero}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}</span>
                    <span className="text-sm font-semibold text-slate-700 font-mono">{c.cajero}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800">{c.boletos.toLocaleString('es-MX')}</span>
                    <span className="text-xs text-slate-400 ml-1">boletos</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0f2c5c]"
                    style={{ width: `${(c.boletos / maxCajero) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla por año */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">Detalle por año</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Año','Boletos','Ingresos','Ida y vuelta','% R/T','Cancelados'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {porAnio.map(r => (
                <tr key={r.year} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-black text-[#0a1628]">{r.year}</td>
                  <td className="px-5 py-3 font-semibold">{r.boletos.toLocaleString('es-MX')}</td>
                  <td className="px-5 py-3 font-bold text-emerald-600">{fmt(r.ingresos)}</td>
                  <td className="px-5 py-3">{r.roundtrip.toLocaleString('es-MX')}</td>
                  <td className="px-5 py-3 text-slate-500">{Math.round((r.roundtrip/r.boletos)*100)}%</td>
                  <td className="px-5 py-3 text-slate-500">{r.cancelados.toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
