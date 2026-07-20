'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen, TrendingUp, TrendingDown, Loader2, CheckCircle2,
  RefreshCw, XCircle, Banknote, CreditCard, Building2,
  Globe, Wallet, Scale, ArrowUpRight, ArrowDownRight,
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

type Tab = 'qb' | 'gastos'
type TxFilter = 'all' | 'online' | 'efectivo' | 'tarjeta' | 'gasto'

function getTxSubtype(t: QBTransaction): 'online' | 'efectivo' | 'tarjeta' | 'gasto' {
  if (t.reference_type === 'booking_online') return 'online'
  if (t.type === 'purchase')                 return 'gasto'
  if (t.doc_number?.endsWith('-TC'))         return 'tarjeta'
  return 'efectivo'
}

function getSucursalCode(t: QBTransaction): string | null {
  // Parse from description: "[HP] ..." or "[WEB] ..."
  const match = t.description?.match(/^\[([A-Z]+)\]/)
  return match?.[1] ?? null
}

const SUBTYPE_CONFIG = {
  online:   { label: 'Online',            color: 'bg-purple-100 text-purple-700',  icon: Globe },
  efectivo: { label: 'Efectivo Sucursal', color: 'bg-emerald-100 text-emerald-700', icon: Banknote },
  tarjeta:  { label: 'Tarjeta Sucursal',  color: 'bg-blue-100 text-blue-700',      icon: CreditCard },
  gasto:    { label: 'Gasto',             color: 'bg-red-100 text-red-700',         icon: ArrowDownRight },
} as const

export default function ContabilidadPage() {
  const [tab,          setTab]          = useState<Tab>('qb')
  const [transactions, setTransactions] = useState<QBTransaction[]>([])
  const [gastos,       setGastos]       = useState<Gasto[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<TxFilter>('all')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [qbRes, gastosRes] = await Promise.all([
        fetch('/api/admin/qb-transactions?limit=500'),
        fetch('/api/staff/gastos?limit=500'),
      ])
      const qbData     = await qbRes.json()
      const gastosData = await gastosRes.json()
      setTransactions(qbData.transactions ?? [])
      setGastos(gastosData.gastos ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  // Totals by subtype
  const online      = transactions.filter(t => getTxSubtype(t) === 'online').reduce((s, t) => s + Number(t.amount), 0)
  const efectivo    = transactions.filter(t => getTxSubtype(t) === 'efectivo').reduce((s, t) => s + Number(t.amount), 0)
  const tarjeta     = transactions.filter(t => getTxSubtype(t) === 'tarjeta').reduce((s, t) => s + Number(t.amount), 0)
  const gastosQB    = transactions.filter(t => getTxSubtype(t) === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
  const totalIngresos = online + efectivo + tarjeta
  const balance       = totalIngresos - gastosQB
  const gastosPend    = gastos.filter(g => !g.qb_synced).reduce((s, g) => s + Number(g.amount), 0)

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(t => getTxSubtype(t) === filter)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#c01515]" />
            Contabilidad
          </h1>
          <p className="text-slate-500 text-sm mt-1">Espejo exacto de lo que llega a QuickBooks</p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Summary cards — row 1: income breakdown */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ingresos registrados en QB</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-purple-600" />
              <p className="text-purple-700 text-xs font-bold uppercase tracking-wider">Ventas Online</p>
            </div>
            <p className="text-2xl font-black text-purple-700">${online.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-purple-400 text-xs mt-0.5">{transactions.filter(t => getTxSubtype(t) === 'online').length} boletos</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Efectivo Sucursales</p>
            </div>
            <p className="text-2xl font-black text-emerald-700">${efectivo.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-emerald-400 text-xs mt-0.5">{transactions.filter(t => getTxSubtype(t) === 'efectivo').length} cierres</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <p className="text-blue-700 text-xs font-bold uppercase tracking-wider">Tarjeta Sucursales</p>
            </div>
            <p className="text-2xl font-black text-blue-700">${tarjeta.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-blue-400 text-xs mt-0.5">{transactions.filter(t => getTxSubtype(t) === 'tarjeta').length} cierres</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">Total Ingresos QB</p>
            </div>
            <p className="text-2xl font-black text-slate-700">${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-slate-400 text-xs mt-0.5">online + efectivo + tarjeta</p>
          </div>
        </div>
      </div>

      {/* Row 2: expenses + balance */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider">Gastos en QB</p>
          </div>
          <p className="text-2xl font-black text-red-700">${gastosQB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-red-400 text-xs mt-0.5">{transactions.filter(t => getTxSubtype(t) === 'gasto').length} registros</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-amber-600" />
            <p className="text-amber-700 text-xs font-bold uppercase tracking-wider">Gastos pendientes QB</p>
          </div>
          <p className="text-2xl font-black text-amber-700">${gastosPend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-amber-500 text-xs mt-0.5">{gastos.filter(g => !g.qb_synced).length} sin sincronizar</p>
        </div>

        <div className={`col-span-2 lg:col-span-1 rounded-2xl p-4 border ${balance >= 0 ? 'bg-teal-50 border-teal-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Scale className={`w-4 h-4 ${balance >= 0 ? 'text-teal-600' : 'text-orange-600'}`} />
            <p className={`text-xs font-bold uppercase tracking-wider ${balance >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>Balance en QB</p>
          </div>
          <p className={`text-2xl font-black ${balance >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>
            {balance >= 0 ? '+' : ''}${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-0.5 ${balance >= 0 ? 'text-teal-400' : 'text-orange-400'}`}>ingresos − gastos en QB</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
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
          {/* Subtype filters */}
          <div className="flex flex-wrap gap-2">
            {([
              ['all',      'Todos'],
              ['online',   'Online'],
              ['efectivo', 'Efectivo Sucursal'],
              ['tarjeta',  'Tarjeta Sucursal'],
              ['gasto',    'Gastos'],
            ] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === val ? 'bg-[#0f2c5c] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {label}
                {val !== 'all' && (
                  <span className="ml-1.5 opacity-60">
                    {transactions.filter(t => getTxSubtype(t) === val).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
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
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Documento QB</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">QB</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(t => {
                    const sub = getTxSubtype(t)
                    const cfg = SUBTYPE_CONFIG[sub]
                    const Icon = cfg.icon
                    const suc = getSucursalCode(t)
                    const isIncome = sub !== 'gasto'
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {suc && suc !== 'WEB' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              <Building2 className="w-3 h-3" />{suc}
                            </span>
                          ) : suc === 'WEB' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md">
                              <Globe className="w-3 h-3" />WEB
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.doc_number ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-xs">{t.description ?? '—'}</td>
                        <td className={`px-4 py-3 text-right font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}${Number(t.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.qb_id
                            ? <span title={`QB ID: ${t.qb_id}`}><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></span>
                            : <span title="Sin confirmar en QB"><XCircle className="w-4 h-4 text-slate-300 mx-auto" /></span>
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    )
                  })}
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
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{g.date}</td>
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
