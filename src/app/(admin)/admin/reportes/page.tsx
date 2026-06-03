'use client'

import { useState } from 'react'
import { BarChart3, DollarSign, Ticket, Users, TrendingUp, TrendingDown, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MONTHLY_DATA = [
  { month: 'Ene', revenue: 14200, bookings: 312, passengers: 428 },
  { month: 'Feb', revenue: 16800, bookings: 389, passengers: 521 },
  { month: 'Mar', revenue: 18200, bookings: 420, passengers: 580 },
  { month: 'Abr', revenue: 15600, bookings: 361, passengers: 490 },
  { month: 'May', revenue: 21400, bookings: 498, passengers: 672 },
  { month: 'Jun', revenue: 18420, bookings: 421, passengers: 577 },
]

const ROUTE_STATS = [
  { route: 'LA → LTI', bookings: 1240, revenue: 43400,  pct: 45 },
  { route: 'LA → ATI', bookings: 890,  revenue: 33820,  pct: 32 },
  { route: 'LA → CAT', bookings: 631,  revenue: 25240,  pct: 23 },
]

const PAYMENT_STATS = [
  { method: 'Stripe (en línea)', pct: 72, color: 'bg-blue-500' },
  { method: 'Square (taquilla)', pct: 20, color: 'bg-emerald-500' },
  { method: 'Efectivo',          pct: 8,  color: 'bg-amber-400' },
]

const maxRevenue = Math.max(...MONTHLY_DATA.map(d => d.revenue))

export default function ReportesPage() {
  const [period, setPeriod] = useState('6m')

  const totalRevenue  = MONTHLY_DATA.reduce((s, d) => s + d.revenue, 0)
  const totalBookings = MONTHLY_DATA.reduce((s, d) => s + d.bookings, 0)
  const avgRevenue    = Math.round(totalRevenue / MONTHLY_DATA.length)

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#d97706]" />
            Reportes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Resumen de ventas e ingresos</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {['1m','3m','6m','1a'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-white shadow text-[#0a1628]' : 'text-slate-500'}`}>
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ingresos totales',    value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, trend: '+12%', up: true,  color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Reservaciones',       value: totalBookings.toLocaleString(),       icon: Ticket,     trend: '+8%',  up: true,  color: 'bg-blue-50 text-blue-600' },
          { label: 'Promedio mensual',    value: `$${avgRevenue.toLocaleString()}`,    icon: BarChart3,  trend: '+5%',  up: true,  color: 'bg-purple-50 text-purple-600' },
          { label: 'Cancelaciones',       value: '3.2%',                              icon: Users,      trend: '-0.5%',up: false, color: 'bg-[rgba(240,180,41,0.1)] text-[#d97706]' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
              </span>
            </div>
            <p className="font-black text-2xl text-[#0a1628]">{kpi.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-6">Ingresos mensuales</h2>
          <div className="flex items-end gap-3 h-48">
            {MONTHLY_DATA.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-600">${(d.revenue/1000).toFixed(0)}k</span>
                <div className="w-full relative group">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#f0b429] to-[#fcd34d] hover:from-[#d97706] hover:to-[#f0b429] transition-all cursor-default"
                    style={{ height: `${(d.revenue / maxRevenue) * 160}px` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0a1628] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                    {d.bookings} reservaciones
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-6">Métodos de pago</h2>
          <div className="space-y-4">
            {PAYMENT_STATS.map(p => (
              <div key={p.method}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-medium">{p.method}</span>
                  <span className="font-bold text-slate-800">{p.pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-3">Ingresos por ruta</p>
            {ROUTE_STATS.map(r => (
              <div key={r.route} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium text-[11px]">{r.route}</span>
                  <span className="font-bold text-slate-800">${(r.revenue/1000).toFixed(1)}k</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#f0b429] rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla detalle de rutas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Rendimiento por ruta</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</th>
              <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Reservaciones</th>
              <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
              <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Participación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ROUTE_STATS.map(r => (
              <tr key={r.route} className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-semibold text-slate-800">{r.route}</td>
                <td className="px-5 py-4 text-right text-slate-600">{r.bookings.toLocaleString()}</td>
                <td className="px-5 py-4 text-right font-bold text-emerald-600">${r.revenue.toLocaleString()}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#f0b429] rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-slate-500 text-xs font-bold">{r.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
