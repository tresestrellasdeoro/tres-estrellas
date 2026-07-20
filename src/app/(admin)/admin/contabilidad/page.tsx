'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen, TrendingUp, TrendingDown, Loader2, CheckCircle2,
  ArrowUpRight, ArrowDownRight, RefreshCw, XCircle,
  Banknote, CreditCard, Building2,
} from 'lucide-react'

interface QBTransaction {
  id:             string
  created_at:     string
  type:           'sales_receipt' | 'purchase'
  doc_number:     string | null
  qb_id:          string | null
  amount:         number
  description:    string | null
  reference_type: 'cierre' | 'gasto' | 'booking_online' | null
}

interface Gasto {
  id:             string
  created_at:     string
  amount:         number
  category:       string
  description:    string | null
  date:           string
  payment_method: 'cash' | 'card'
  qb_synced:      boolean
  qb_purchase_id: string | null
  profiles:       { full_name: string } | null
  sucursales:     { name: string; code: string } | null
}

const REF_LABELS: Record<string, string> = {
  cierre:         'Cierre de caja',
  gasto:          'Gasto',
  booking_online: 'Venta online',
}

type Tab = 'qb' | 'gastos'

export default function ContabilidadPage() {
  const [tab,          setTab]          = useState<Tab>('qb')
  const [transactions, setTransactions] = useState<QBTransaction[]>([])
  const [gastos,       setGastos]       = useState<Gasto[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<'all' | 'sales_receipt' | 'purchase'>('all')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [qbRes, gastosRes] = await Promise.all([
        fetch('/api/admin/qb-transactions?limit=200'),
        fetch('/api/staff/gastos?limit=200'),
      ])
      const qbData     = await qbRes.json()
      const gastosData = await gastosRes.json()
      setTransactions(qbData.transactions ?? [])
      setGastos(gastosData.gastos ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const ingresos       = transactions.filter(t => t.type === 'sales_receipt').reduce((s, t) => s + Number(t.amount), 0)
  const gastosQB       = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0)
  const gastosTotal    = gastos.reduce((s, g) => s + Number(g.amount), 0)
  const gastosPendQB   = gastos.filter(g => !g.qb_synced).reduce((s, g) => s + Number(g.amount), 0)
  const balance        = ingresos - gastosQB

  const filteredTx = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#c01515]" />
            Contabilidad
          </h1>
          <p className="text-slate-500 text-sm mt-1">Ingresos, gastos y sincronización con QuickBooks</p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Ingresos QB</p>
          </div>
          <p className="text-2xl font-black text-emerald-700">${ingresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-emerald-500 text-xs mt-0.5">{transactions.filter(t => t.type === 'sales_receipt').length} registros</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider">Gastos totales</p>
          </div>
          <p className="text-2xl font-black text-red-700">${gastosTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-red-400 text-xs mt-0.5">{gastos.length} registros</p>
        </div>

        <div className={`rounded-2xl p-4 border ${balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className={`w-4 h-4 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            <p className={`text-xs font-bold uppercase tracking-wider ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balance QB</p>
          </div>
          <p className={`text-2xl font-black ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {balance >= 0 ? '+' : ''}${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-0.5 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>ingresos − gastos en QB</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-amber-600" />
            <p className="text-amber-700 text-xs font-bold uppercase tracking-wider">Gastos pendientes QB</p>
          </div>
          <p className="text-2xl font-black text-amber-700">${gastosPendQB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-amber-500 text-xs mt-0.5">{gastos.filter(g => !g.qb_synced).length} sin sincronizar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {([['qb', 'Registro QuickBooks'], ['gastos', 'Todos los gastos']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-5 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px ${
              tab === val
                ? 'border-[#c01515] text-[#c01515]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : tab === 'qb' ? (

        /* ── QB TRANSACTIONS TAB ── */
        <div className="space-y-4">
          <div className="flex gap-2">
            {([['all', 'Todos'], ['sales_receipt', 'Ingresos'], ['purchase', 'Gastos']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === val ? 'bg-[#0f2c5c] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {filteredTx.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay transacciones registradas</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Origen</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">QB</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTx.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                          t.type === 'sales_receipt' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type === 'sales_receipt' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {t.type === 'sales_receipt' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.doc_number ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate text-xs">{t.description ?? '—'}</td>
                      <td className="px-4 py-3">
                        {t.reference_type && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
                            {REF_LABELS[t.reference_type]}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-black text-sm ${
                        t.type === 'sales_receipt' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {t.type === 'sales_receipt' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.qb_id
                          ? <span title="Confirmado en QB"><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></span>
                          : <span title="Sin confirmar"><XCircle className="w-4 h-4 text-slate-300 mx-auto" /></span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(t.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : (

        /* ── GASTOS TAB ── */
        gastos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay gastos registrados</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">QB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gastos.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{g.date}</td>
                    <td className="px-4 py-3">
                      {g.sucursales ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          <Building2 className="w-3 h-3" />{g.sucursales.code}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{g.category}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{g.description ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{g.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {g.payment_method === 'cash'
                        ? <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Banknote className="w-3 h-3" /> Efectivo</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-slate-500"><CreditCard className="w-3 h-3" /> Tarjeta</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-600">${Number(g.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {g.qb_synced
                        ? <span title={`QB: ${g.qb_purchase_id}`}><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></span>
                        : <span title="No enviado a QB"><XCircle className="w-4 h-4 text-amber-400 mx-auto" /></span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
