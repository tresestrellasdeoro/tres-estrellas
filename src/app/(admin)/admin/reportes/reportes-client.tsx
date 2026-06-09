'use client'

import { useState } from 'react'
import { BarChart3, DollarSign, Ticket, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReportesData, MonthData } from './page'

// Cuántos meses mostrar según el período seleccionado
const PERIOD_MONTHS: Record<string, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1a': 6, // solo tenemos 6 meses de datos
}

export default function ReportesClient({ data }: { data: ReportesData }) {
  const [period, setPeriod] = useState('6m')

  const monthsToShow = PERIOD_MONTHS[period] ?? 6
  const visibleMonths: MonthData[] = data.monthlyData.slice(-monthsToShow)

  const periodRevenue  = visibleMonths.reduce((s, d) => s + d.revenue, 0)
  const periodBookings = visibleMonths.reduce((s, d) => s + d.bookings, 0)
  const periodAvg      = visibleMonths.length > 0 ? Math.round(periodRevenue / visibleMonths.length) : 0

  const maxRevenue = Math.max(...visibleMonths.map(d => d.revenue), 1)

  // Comparar con período anterior para el trend (simplificado)
  const prevMonths: MonthData[] = data.monthlyData.slice(-(monthsToShow * 2), -monthsToShow)
  const prevRevenue = prevMonths.reduce((s, d) => s + d.revenue, 0)
  const revTrendPct = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : 0
  const revTrendUp  = revTrendPct >= 0

  const prevBookings = prevMonths.reduce((s, d) => s + d.bookings, 0)
  const bkTrendPct  = prevBookings > 0 ? Math.round(((periodBookings - prevBookings) / prevBookings) * 100) : 0
  const bkTrendUp   = bkTrendPct >= 0

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
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
            {(['1m','3m','6m','1a'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p ? 'bg-white shadow text-[#0a1628]' : 'text-slate-500'
                }`}
              >
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
          {
            label: 'Ingresos totales',
            value: `$${periodRevenue.toLocaleString('es-MX')}`,
            icon: DollarSign,
            trend: revTrendPct !== 0 ? `${revTrendPct > 0 ? '+' : ''}${revTrendPct}%` : '—',
            up: revTrendUp,
            color: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Reservaciones',
            value: periodBookings.toLocaleString('es-MX'),
            icon: Ticket,
            trend: bkTrendPct !== 0 ? `${bkTrendPct > 0 ? '+' : ''}${bkTrendPct}%` : '—',
            up: bkTrendUp,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Promedio mensual',
            value: `$${periodAvg.toLocaleString('es-MX')}`,
            icon: BarChart3,
            trend: '—',
            up: true,
            color: 'bg-purple-50 text-purple-600',
          },
          {
            label: 'Meses analizados',
            value: String(visibleMonths.length),
            icon: BarChart3,
            trend: period,
            up: true,
            color: 'bg-[rgba(240,180,41,0.1)] text-[#d97706]',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.trend !== '—' && (kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                {kpi.trend}
              </span>
            </div>
            <p className="font-black text-2xl text-[#0a1628]">{kpi.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gráfica de barras */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-6">Ingresos mensuales</h2>
          {visibleMonths.every(d => d.revenue === 0) ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-300">
              <BarChart3 className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">Sin datos para este período</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-48">
              {visibleMonths.map(d => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    {d.revenue >= 1000 ? `$${(d.revenue / 1000).toFixed(0)}k` : `$${d.revenue}`}
                  </span>
                  <div className="w-full relative group">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#f0b429] to-[#fcd34d] hover:from-[#d97706] hover:to-[#f0b429] transition-all cursor-default"
                      style={{ height: `${Math.max((d.revenue / maxRevenue) * 160, d.revenue > 0 ? 4 : 0)}px` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0a1628] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                      {d.bookings} reservaciones
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{d.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Métodos de pago */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-6">Métodos de pago</h2>
          {data.paymentStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
              <p className="text-sm font-medium">Sin datos de pagos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.paymentStats.map(p => (
                <div key={p.method}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">{p.method}</span>
                    <span className="font-bold text-slate-800">{p.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.count.toLocaleString('es-MX')} reservaciones</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-3">Resumen del período</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total reservaciones</span>
                <span className="font-bold text-slate-800">{periodBookings.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Ingresos totales</span>
                <span className="font-bold text-emerald-600">${periodRevenue.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Ticket promedio</span>
                <span className="font-bold text-slate-800">
                  ${periodBookings > 0 ? Math.round(periodRevenue / periodBookings).toLocaleString('es-MX') : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de detalle mensual */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Detalle mensual</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Mes</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Reservaciones</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket promedio</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleMonths.length === 0 || visibleMonths.every(d => d.bookings === 0) ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No hay datos de ventas para este período
                  </td>
                </tr>
              ) : (
                [...visibleMonths].reverse().map(d => {
                  const pct = periodRevenue > 0 ? Math.round((d.revenue / periodRevenue) * 100) : 0
                  const avg = d.bookings > 0 ? Math.round(d.revenue / d.bookings) : 0
                  return (
                    <tr key={d.month} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-semibold text-slate-800">{d.month}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{d.bookings.toLocaleString('es-MX')}</td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">${d.revenue.toLocaleString('es-MX')}</td>
                      <td className="px-5 py-4 text-right text-slate-500">${avg.toLocaleString('es-MX')}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#f0b429] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-500 text-xs font-bold">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
