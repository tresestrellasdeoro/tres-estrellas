'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import {
  TrendingUp, TrendingDown, BarChart3, Loader2, RefreshCw,
  Bus, DollarSign, MapPin, Building2, ShoppingCart,
} from 'lucide-react'

const COLORS = ['#7c3aed', '#059669', '#2563eb', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#9333ea']

type Analytics = {
  monthly:     { mes: string; ingresos: number; gastos: number; utilidad: number }[]
  channels:    { name: string; value: number; color: string }[]
  bySucursal:  { name: string; value: number }[]
  byCategory:  { name: string; value: number }[]
  topRoutes:   { name: string; bookings: number; revenue: number }[]
  byBranch:    { name: string; bookings: number; revenue: number }[]
  summary:     { totalIngresos: number; totalGastos: number; utilidad: number; totalBookings: number }
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString('en-US')}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      {label && <p className="font-bold text-slate-700 mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }} className="font-semibold">
          {p.name}: {p.name?.toLowerCase().includes('booking') || p.name === 'Reservaciones'
            ? p.value
            : `$${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
        </p>
      ))}
    </div>
  )
}

const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function AnaliticaPage() {
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchData = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/analytics')
      if (r.ok) setData(await r.json())
      else setError('Error cargando analítica')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#c01515]" /> Analítica
          </h1>
          <p className="text-slate-500 text-sm mt-1">Últimos 12 meses · actualización en tiempo real</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          <p className="text-slate-400 text-sm">Cargando analítica…</p>
        </div>
      ) : data && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Ingresos totales',  value: fmt(data.summary.totalIngresos), sub: '12 meses', icon: TrendingUp,   color: 'from-emerald-500 to-teal-600' },
              { label: 'Gastos totales',    value: fmt(data.summary.totalGastos),   sub: '12 meses', icon: TrendingDown,  color: 'from-red-500 to-rose-600' },
              { label: 'Utilidad neta',     value: fmt(data.summary.utilidad),      sub: 'ingresos − gastos', icon: DollarSign, color: data.summary.utilidad >= 0 ? 'from-blue-500 to-violet-600' : 'from-orange-500 to-red-600' },
              { label: 'Reservaciones',     value: data.summary.totalBookings.toLocaleString(), sub: 'confirmadas', icon: Bus, color: 'from-amber-500 to-orange-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-br ${card.color} p-4`}>
                  <card.icon className="w-5 h-5 text-white/70 mb-2" />
                  <p className="text-white font-black text-2xl">{card.value}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-bold text-slate-700 text-sm">{card.label}</p>
                  <p className="text-slate-400 text-xs">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Monthly Revenue vs Expenses ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Ingresos vs Gastos por mes
            </h2>
            <p className="text-slate-400 text-xs mb-5">Últimos 12 meses</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="gastos"   name="Gastos"   fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Utilidad Line ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" /> Utilidad mensual
            </h2>
            <p className="text-slate-400 text-xs mb-5">Ingresos menos gastos por mes</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.monthly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="utilidad" name="Utilidad" stroke="#3b82f6" strokeWidth={2} fill="url(#gradUtil)" dot={{ r: 3, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Channel + Category row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Canal de venta */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-violet-500" /> Canal de venta
              </h2>
              <p className="text-slate-400 text-xs mb-4">Distribución de ingresos por canal</p>
              {data.channels.every(c => c.value === 0) ? (
                <p className="text-slate-300 text-sm text-center py-8">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.channels} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} labelLine={false} label={PieLabel}>
                      {data.channels.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString('en-US')}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v, e: any) => `${v} — $${e.payload.value.toLocaleString('en-US')}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Gastos por categoría */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Gastos por categoría
              </h2>
              <p className="text-slate-400 text-xs mb-4">Top categorías de gasto</p>
              {data.byCategory.length === 0 ? (
                <p className="text-slate-300 text-sm text-center py-8">Sin gastos registrados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart layout="vertical" data={data.byCategory} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Sucursal revenue ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" /> Ingresos por sucursal
            </h2>
            <p className="text-slate-400 text-xs mb-5">Ventas registradas en QB por código de sucursal</p>
            {data.bySucursal.length === 0 ? (
              <p className="text-slate-300 text-sm text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.bySucursal} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Ingresos" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {data.bySucursal.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Top routes + Branches row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top rutas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Top rutas
              </h2>
              <p className="text-slate-400 text-xs mb-4">Por ingresos generados (reservaciones confirmadas)</p>
              {data.topRoutes.length === 0 ? (
                <p className="text-slate-300 text-sm text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.topRoutes.map((r, i) => {
                    const max = data.topRoutes[0].revenue || 1
                    const pct = Math.round((r.revenue / max) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white shrink-0"
                              style={{ background: COLORS[i % COLORS.length] }}>
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{r.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-slate-700">${r.revenue.toLocaleString('en-US')}</p>
                            <p className="text-[10px] text-slate-400">{r.bookings} boletos</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Reservaciones por sucursal */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Bus className="w-4 h-4 text-blue-500" /> Reservaciones por sucursal
              </h2>
              <p className="text-slate-400 text-xs mb-4">Volumen de ventas por punto de venta</p>
              {data.byBranch.length === 0 ? (
                <p className="text-slate-300 text-sm text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.byBranch.map((b, i) => {
                    const max = data.byBranch[0].bookings || 1
                    const pct = Math.round((b.bookings / max) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white shrink-0"
                              style={{ background: COLORS[i % COLORS.length] }}>
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{b.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-slate-700">{b.bookings} boletos</p>
                            <p className="text-[10px] text-slate-400">${b.revenue.toLocaleString('en-US')}</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
