'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  BookOpen, TrendingUp, TrendingDown, Loader2, CheckCircle2,
  RefreshCw, XCircle, Banknote, CreditCard, Building2,
  Globe, Scale, AlertTriangle, RotateCw,
  ChevronLeft, ChevronRight, Download, BarChart2, Wallet,
  Target, Edit3, Save, Image, Link2, ShieldCheck,
} from 'lucide-react'

// ── Interfaces ────────────────────────────────────────────────────────────────

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
  vendor:         string | null
  receipt_number: string | null
  receipt_url:    string | null
  profiles:       { full_name: string } | null
  sucursales:     { name: string; code: string } | null
}

interface Presupuesto {
  category: string
  monto:    number
}

const CATEGORIAS_GASTO = [
  'Combustible / Gasolina',
  'Mantenimiento y Reparaciones',
  'Salarios y Nómina',
  'Arrendamiento / Renta',
  'Seguros',
  'Servicios (agua, luz, internet, teléfono)',
  'Suministros de Oficina',
  'Comida / Viáticos',
  'Publicidad y Marketing',
  'Impuestos y Cuotas',
  'Limpieza',
  'Equipo y Herramientas',
  'Otro',
]

interface Cierre {
  id:             string
  created_at:     string
  fecha:          string
  total_boletos:  number
  total_efectivo: number
  total_tarjeta:  number
  total_paquetes: number
  total_general:  number
  qb_synced:      boolean
  notas:          string | null
  sucursales:     { name: string; code: string } | null
  profiles:       { full_name: string; email: string } | null
}

type Tab       = 'resumen' | 'qb' | 'gastos' | 'cierres' | 'conciliacion'
type TxFilter  = 'all' | 'online' | 'efectivo' | 'tarjeta' | 'gasto'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTxSubtype(t: QBTransaction): 'online' | 'efectivo' | 'tarjeta' | 'gasto' {
  if (t.reference_type === 'booking_online') return 'online'
  if (t.type === 'purchase')                 return 'gasto'
  if (t.doc_number?.endsWith('-TC'))         return 'tarjeta'
  return 'efectivo'
}

function getSucursalCode(t: QBTransaction): string | null {
  const match = t.description?.match(/^\[([A-Z]+)\]/)
  return match?.[1] ?? null
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function monthShort(ym: string) {
  const [y, m] = ym.split('-')
  const label = new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-MX', { month: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1) + ' ' + y.slice(2)
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function last6Months(): string[] {
  return Array.from({ length: 6 }, (_, i) => shiftMonth(currentMonth(), -(5 - i)))
}

function usd(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [
    keys.join(','),
    ...rows.map(r =>
      keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const PIE_COLORS = ['#0a1e42','#c01515','#c8a951','#3b82f6','#22c55e','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16']

const SUBTYPE_CONFIG = {
  online:   { label: 'Online',            color: 'bg-purple-100 text-purple-700',  icon: Globe },
  efectivo: { label: 'Efectivo Sucursal', color: 'bg-emerald-100 text-emerald-700', icon: Banknote },
  tarjeta:  { label: 'Tarjeta Sucursal',  color: 'bg-blue-100 text-blue-700',      icon: CreditCard },
  gasto:    { label: 'Gasto',             color: 'bg-red-100 text-red-700',         icon: TrendingDown },
} as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContabilidadPage() {
  const [tab,           setTab]           = useState<Tab>('resumen')
  const [transactions,  setTransactions]  = useState<QBTransaction[]>([])
  const [gastos,        setGastos]        = useState<Gasto[]>([])
  const [cierres,       setCierres]       = useState<Cierre[]>([])
  const [loading,       setLoading]       = useState(true)
  const [txFilter,      setTxFilter]      = useState<TxFilter>('all')
  const [retrying,      setRetrying]      = useState<string | null>(null)
  const [retryMsg,      setRetryMsg]      = useState<{ id: string; ok: boolean; text: string } | null>(null)
  const [mes,           setMes]           = useState<string | 'all'>(currentMonth())
  const [presupuestos,   setPresupuestos]   = useState<Presupuesto[]>([])
  const [editBudget,     setEditBudget]     = useState(false)
  const [budgetDraft,    setBudgetDraft]    = useState<Record<string, string>>({})
  const [savingBudget,   setSavingBudget]   = useState(false)
  // Conciliación
  const [retryingGasto,  setRetryingGasto]  = useState<string | null>(null)
  const [gastoRetryMsg,  setGastoRetryMsg]  = useState<Record<string, { ok: boolean; text: string }>>({})
  const [retryingAll,    setRetryingAll]    = useState(false)
  // Mapeo de cuentas QB
  const [qbAccounts,     setQbAccounts]     = useState<{ id: string; name: string; subType: string }[]>([])
  const [catMappings,    setCatMappings]    = useState<Record<string, string>>({})
  const [catNames,       setCatNames]       = useState<Record<string, string>>({})
  const [showMapping,    setShowMapping]    = useState(false)
  const [mappingDraft,   setMappingDraft]   = useState<Record<string, string>>({})
  const [savingMapping,  setSavingMapping]  = useState(false)
  const [loadingMapping, setLoadingMapping] = useState(false)
  const [sucursalFilt,   setSucursalFilt]   = useState<string>('')
  const [sucursalOpts,   setSucursalOpts]   = useState<{ id: string; code: string; name: string }[]>([])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const mesFetch = typeof mes === 'string' && mes !== 'all' ? mes : currentMonth()
      const [qbRes, gastosRes, cierresRes, presupRes] = await Promise.all([
        fetch('/api/admin/qb-transactions?limit=1000'),
        fetch('/api/staff/gastos?limit=1000'),
        fetch('/api/admin/cierres?limit=500'),
        fetch(`/api/admin/presupuestos?mes=${mesFetch}`),
      ])
      const qbData      = await qbRes.json()
      const gastosData  = await gastosRes.json()
      const cierresData = await cierresRes.json()
      const presupData  = await presupRes.json()
      setTransactions(qbData.transactions ?? [])
      setGastos(gastosData.gastos ?? [])
      setCierres(cierresData.cierres ?? [])
      setPresupuestos(presupData.presupuestos ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  const fetchPresupuestos = async (m: string) => {
    try {
      const r = await fetch(`/api/admin/presupuestos?mes=${m}`)
      const d = await r.json()
      setPresupuestos(d.presupuestos ?? [])
    } catch {}
  }

  const retryGasto = async (gastoId: string) => {
    setRetryingGasto(gastoId)
    setGastoRetryMsg(prev => { const n = { ...prev }; delete n[gastoId]; return n })
    try {
      const r = await fetch('/api/staff/gastos/retry-qb', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ gasto_id: gastoId }),
      })
      const d = await r.json()
      setGastoRetryMsg(prev => ({ ...prev, [gastoId]: { ok: r.ok && d.ok, text: d.message ?? d.error ?? 'Error' } }))
      if (r.ok && d.ok) setGastos(prev => prev.map(g => g.id === gastoId ? { ...g, qb_synced: true } : g))
    } catch {
      setGastoRetryMsg(prev => ({ ...prev, [gastoId]: { ok: false, text: 'Error de conexión' } }))
    } finally {
      setRetryingGasto(null)
    }
  }

  const retryAllGastos = async () => {
    const pending = gastos.filter(g => !g.qb_synced)
    if (!pending.length) return
    setRetryingAll(true)
    for (const g of pending) {
      await retryGasto(g.id)
    }
    setRetryingAll(false)
  }

  const loadMapping = async () => {
    setLoadingMapping(true)
    try {
      const r = await fetch('/api/admin/quickbooks/category-mapping')
      const d = await r.json()
      const acc: Record<string, string>  = {}
      const names: Record<string, string> = {}
      ;(d.mappings ?? []).forEach((m: any) => { acc[m.category] = m.qb_account_id; names[m.category] = m.qb_account_name ?? '' })
      setCatMappings(acc)
      setCatNames(names)
      setQbAccounts(d.accounts ?? [])
      setMappingDraft({ ...acc })
    } catch {}
    finally { setLoadingMapping(false) }
  }

  const saveMapping = async () => {
    setSavingMapping(true)
    const mappings = Object.entries(mappingDraft)
      .filter(([, v]) => v)
      .map(([category, qb_account_id]) => ({
        category,
        qb_account_id,
        qb_account_name: qbAccounts.find(a => a.id === qb_account_id)?.name ?? '',
      }))
    try {
      await fetch('/api/admin/quickbooks/category-mapping', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mappings }),
      })
      await loadMapping()
      setShowMapping(false)
    } catch {}
    finally { setSavingMapping(false) }
  }

  const saveBudget = async () => {
    if (mes === 'all') return
    setSavingBudget(true)
    const budgets = CATEGORIAS_GASTO.map(cat => ({
      category: cat,
      monto: parseFloat(budgetDraft[cat] ?? '0') || 0,
    })).filter(b => b.monto > 0)
    try {
      await fetch('/api/admin/presupuestos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mes, sucursal_id: null, budgets }),
      })
      await fetchPresupuestos(mes as string)
      setEditBudget(false)
    } catch {}
    finally { setSavingBudget(false) }
  }

  const retryCierre = async (cierreId: string) => {
    setRetrying(cierreId)
    setRetryMsg(null)
    try {
      const r = await fetch('/api/admin/cierres/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cierre_id: cierreId }),
      })
      const d = await r.json()
      setRetryMsg({ id: cierreId, ok: r.ok && d.ok, text: d.message ?? d.error ?? 'Error desconocido' })
      if (r.ok && d.ok) setCierres(prev => prev.map(c => c.id === cierreId ? { ...c, qb_synced: true } : c))
    } catch {
      setRetryMsg({ id: cierreId, ok: false, text: 'No se pudo conectar al servidor.' })
    } finally { setRetrying(null) }
  }

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (!cierres.length && !gastos.length) return
    const map = new Map<string, string>()
    cierres.forEach(c => { if (c.sucursales?.code) map.set(c.sucursales.code, c.sucursales.name) })
    gastos.forEach(g => { if (g.sucursales?.code) map.set(g.sucursales.code, g.sucursales.name) })
    setSucursalOpts(
      Array.from(map.entries())
        .map(([code, name]) => ({ id: code, code, name }))
        .sort((a, b) => a.code.localeCompare(b.code))
    )
  }, [cierres, gastos])

  useEffect(() => {
    if (mes !== 'all') fetchPresupuestos(mes as string)
  }, [mes])

  // (sucursalOpts loaded directly from API in fetchAll)

  // ── Filtered data by period + sucursal ──────────────────────────────────

  const txFiltered = useMemo(() => {
    let tx = mes === 'all' ? transactions : transactions.filter(t => t.created_at.startsWith(mes))
    if (sucursalFilt) tx = tx.filter(t => getSucursalCode(t) === sucursalFilt)
    return tx
  }, [transactions, mes, sucursalFilt])

  const gastosFiltered = useMemo(() => {
    let gs = mes === 'all' ? gastos : gastos.filter(g => g.date.startsWith(mes))
    if (sucursalFilt) gs = gs.filter(g => g.sucursales?.code === sucursalFilt)
    return gs
  }, [gastos, mes, sucursalFilt])

  const cierresFiltered = useMemo(() => {
    let cs = mes === 'all' ? cierres : cierres.filter(c => c.fecha.startsWith(mes))
    if (sucursalFilt) cs = cs.filter(c => c.sucursales?.code === sucursalFilt)
    return cs
  }, [cierres, mes, sucursalFilt])

  // ── Period totals ────────────────────────────────────────────────────────

  const online       = txFiltered.filter(t => getTxSubtype(t) === 'online').reduce((s, t) => s + Number(t.amount), 0)
  const efectivo     = txFiltered.filter(t => getTxSubtype(t) === 'efectivo').reduce((s, t) => s + Number(t.amount), 0)
  const tarjeta      = txFiltered.filter(t => getTxSubtype(t) === 'tarjeta').reduce((s, t) => s + Number(t.amount), 0)
  const gastosQB     = txFiltered.filter(t => getTxSubtype(t) === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
  const totalIngresos = online + efectivo + tarjeta
  const utilidad      = totalIngresos - gastosQB
  const margen        = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0

  const cierresPend   = cierres.filter(c => !c.qb_synced)
  const gastosPend    = gastos.filter(g => !g.qb_synced).reduce((s, g) => s + Number(g.amount), 0)

  // ── Chart data ───────────────────────────────────────────────────────────

  const barData = useMemo(() => last6Months().map(m => {
    const txM   = transactions.filter(t => t.created_at.startsWith(m))
    const ing   = txM.filter(t => t.type === 'sales_receipt').reduce((s, t) => s + Number(t.amount), 0)
    const gas   = txM.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0)
    return { mes: monthShort(m), ingresos: +ing.toFixed(2), gastos: +gas.toFixed(2), utilidad: +(ing - gas).toFixed(2) }
  }), [transactions])

  const pieData = useMemo(() => {
    const map = new Map<string, number>()
    gastosFiltered.forEach(g => map.set(g.category, (map.get(g.category) ?? 0) + Number(g.amount)))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
  }, [gastosFiltered])

  // ── P&L monthly table (last 6 months) ───────────────────────────────────

  const plTable = useMemo(() => last6Months().map(m => {
    const txM    = transactions.filter(t => t.created_at.startsWith(m))
    const ing    = txM.filter(t => t.type === 'sales_receipt').reduce((s, t) => s + Number(t.amount), 0)
    const gas    = txM.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount), 0)
    const util   = ing - gas
    const mgn    = ing > 0 ? (util / ing) * 100 : 0
    return { mes: monthLabel(m), ingresos: ing, gastos: gas, utilidad: util, margen: mgn }
  }), [transactions])

  // ── TX filtered for QB tab ────────────────────────────────────────────────

  const txDisplay = txFilter === 'all'
    ? txFiltered
    : txFiltered.filter(t => getTxSubtype(t) === txFilter)

  // ── CSV exports ───────────────────────────────────────────────────────────

  const exportQB = () => downloadCsv(
    txFiltered.map(t => ({
      Fecha:       new Date(t.created_at).toLocaleDateString('es-MX'),
      Tipo:        getTxSubtype(t),
      Sucursal:    getSucursalCode(t) ?? '',
      Documento:   t.doc_number ?? '',
      Descripcion: t.description ?? '',
      Monto:       Number(t.amount).toFixed(2),
      QB_Sync:     t.qb_id ? 'Sí' : 'No',
    })),
    `QB_${mes === 'all' ? 'historico' : mes}.csv`
  )

  const exportGastos = () => downloadCsv(
    gastosFiltered.map(g => ({
      Fecha:       g.date,
      Sucursal:    g.sucursales?.code ?? '',
      Categoria:   g.category,
      Descripcion: g.description ?? '',
      Empleado:    g.profiles?.full_name ?? '',
      Pago:        g.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta',
      Monto:       Number(g.amount).toFixed(2),
      QB_Sync:     g.qb_synced ? 'Sí' : 'No',
    })),
    `Gastos_${mes === 'all' ? 'historico' : mes}.csv`
  )

  const exportCierres = () => downloadCsv(
    cierresFiltered.map(c => ({
      Fecha:      c.fecha,
      Sucursal:   c.sucursales?.code ?? '',
      Cajero:     c.profiles?.full_name ?? c.profiles?.email ?? '',
      Boletos:    c.total_boletos,
      Efectivo:   Number(c.total_efectivo).toFixed(2),
      Tarjeta:    Number(c.total_tarjeta).toFixed(2),
      Paquetes:   Number(c.total_paquetes).toFixed(2),
      Total:      Number(c.total_general).toFixed(2),
      QB_Sync:    c.qb_synced ? 'Sí' : 'No',
    })),
    `Cierres_${mes === 'all' ? 'historico' : mes}.csv`
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#c01515]" />
            Contabilidad
          </h1>
          <p className="text-slate-500 text-sm mt-1">Estado financiero y registro QuickBooks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadMapping(); setShowMapping(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
            <Link2 className="w-4 h-4" /> Mapeo QB
          </button>
          <button onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Period selector + sucursal filter */}
      <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 w-fit">
        <button
          onClick={() => mes !== 'all' && setMes(shiftMonth(mes, -1))}
          disabled={mes === 'all'}
          className="p-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>

        <span className="px-3 py-1 font-black text-[#0a1628] text-sm min-w-[160px] text-center">
          {mes === 'all' ? 'Histórico completo' : monthLabel(mes)}
        </span>

        <button
          onClick={() => mes !== 'all' && setMes(shiftMonth(mes, 1))}
          disabled={mes === 'all' || mes >= currentMonth()}
          className="p-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>

        <div className="w-px h-6 bg-slate-200" />

        <button
          onClick={() => setMes(mes === 'all' ? currentMonth() : 'all')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
            mes === 'all'
              ? 'bg-[#0a1e42] text-white'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Histórico
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2">
        <Building2 className="w-4 h-4 text-slate-400 ml-1" />
        <select
          value={sucursalFilt}
          onChange={e => setSucursalFilt(e.target.value)}
          className="text-sm font-bold text-[#0a1628] bg-transparent border-none outline-none cursor-pointer pr-2"
        >
          <option value="">Todas las sucursales</option>
          {sucursalOpts.map(s => (
            <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
          ))}
        </select>
      </div>
      </div>

      {/* Alert: cierres sin QB */}
      {cierresPend.length > 0 && (
        <div
          className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-4 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setTab('cierres')}
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-sm">
              {cierresPend.length} {cierresPend.length === 1 ? 'cierre pendiente' : 'cierres pendientes'} en QuickBooks
            </p>
            <p className="text-amber-800 text-xs mt-0.5">
              {cierresPend.map(c => `${c.sucursales?.code ?? '?'} (${c.fecha})`).join(' · ')}
            </p>
          </div>
          <span className="text-amber-700 text-xs font-bold whitespace-nowrap">Ver cierres →</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Ingresos</p>
          </div>
          <p className="text-2xl font-black text-emerald-700">${usd(totalIngresos)}</p>
          <p className="text-emerald-400 text-xs mt-0.5">
            {txFiltered.filter(t => t.type === 'sales_receipt').length} operaciones
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider">Gastos QB</p>
          </div>
          <p className="text-2xl font-black text-red-700">${usd(gastosQB)}</p>
          {gastosPend > 0 && (
            <p className="text-amber-500 text-xs mt-0.5">+${usd(gastosPend)} pendiente QB</p>
          )}
        </div>

        <div className={`rounded-2xl p-4 border ${utilidad >= 0 ? 'bg-teal-50 border-teal-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Scale className={`w-4 h-4 ${utilidad >= 0 ? 'text-teal-600' : 'text-orange-600'}`} />
            <p className={`text-xs font-bold uppercase tracking-wider ${utilidad >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>Utilidad</p>
          </div>
          <p className={`text-2xl font-black ${utilidad >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>
            {utilidad >= 0 ? '+' : ''}${usd(utilidad)}
          </p>
          <p className={`text-xs mt-0.5 ${utilidad >= 0 ? 'text-teal-400' : 'text-orange-400'}`}>
            ingresos − gastos QB
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-slate-600" />
            <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">Margen</p>
          </div>
          <p className={`text-2xl font-black ${margen >= 20 ? 'text-emerald-600' : margen >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {margen.toFixed(1)}%
          </p>
          <p className="text-slate-400 text-xs mt-0.5">margen de utilidad</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {([
          ['resumen',       'Resumen P&L',       BarChart2],
          ['qb',            'Registro QB',        BookOpen],
          ['gastos',        'Gastos',             TrendingDown],
          ['cierres',       'Cierres de turno',   Banknote],
          ['conciliacion',  'Conciliación QB',    ShieldCheck],
        ] as const).map(([val, label, Icon]) => (
          <button key={val} onClick={() => setTab(val as Tab)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px whitespace-nowrap ${
              tab === val
                ? 'border-[#c01515] text-[#c01515]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {val === 'conciliacion' && (cierresPend.length + gastos.filter(g => !g.qb_synced).length) > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-black bg-red-500 text-white rounded-full">
                {cierresPend.length + gastos.filter(g => !g.qb_synced).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
        </div>
      ) : tab === 'resumen' ? (

        /* ── RESUMEN / P&L ── */
        <div className="space-y-6">

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Bar chart: last 6 months */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-black text-slate-700 mb-4">Ingresos vs Gastos — últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => [`$${usd(Number(v))}`, name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : 'Utilidad']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="ingresos" fill="#0a1e42" radius={[4, 4, 0, 0]} name="ingresos" />
                  <Bar dataKey="gastos"   fill="#c01515" radius={[4, 4, 0, 0]} name="gastos" />
                  <Bar dataKey="utilidad" fill="#c8a951" radius={[4, 4, 0, 0]} name="utilidad" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-[#0a1e42] inline-block" />Ingresos</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-[#c01515] inline-block" />Gastos</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-[#c8a951] inline-block" />Utilidad</span>
              </div>
            </div>

            {/* Pie chart: expenses by category */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-black text-slate-700 mb-2">Gastos por categoría</p>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-300 text-sm">Sin gastos en el período</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" nameKey="name" paddingAngle={2}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: unknown) => [`$${usd(Number(v))}`]}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-1">
                    {pieData.slice(0, 5).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {d.name}
                        </span>
                        <span className="text-xs font-bold text-slate-700 ml-2">${usd(d.value)}</span>
                      </div>
                    ))}
                    {pieData.length > 5 && (
                      <p className="text-xs text-slate-400 text-center mt-1">+{pieData.length - 5} categorías más</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* P&L Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-black text-slate-700 text-sm">Estado de Resultados — últimos 6 meses</p>
              <button
                onClick={() => downloadCsv(
                  plTable.map(r => ({
                    Mes: r.mes,
                    Ingresos: r.ingresos.toFixed(2),
                    Gastos: r.gastos.toFixed(2),
                    Utilidad: r.utilidad.toFixed(2),
                    'Margen %': r.margen.toFixed(1) + '%',
                  })),
                  'P&L_6meses.csv'
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Mes</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos QB</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Utilidad</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plTable.map((row, i) => (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${row.mes === monthLabel(currentMonth()) ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-5 py-3 font-semibold text-slate-700 capitalize">{row.mes}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-700">${usd(row.ingresos)}</td>
                      <td className="px-5 py-3 text-right font-bold text-red-600">${usd(row.gastos)}</td>
                      <td className={`px-5 py-3 text-right font-black ${row.utilidad >= 0 ? 'text-teal-700' : 'text-orange-600'}`}>
                        {row.utilidad >= 0 ? '+' : ''}${usd(row.utilidad)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                          row.margen >= 20 ? 'bg-emerald-100 text-emerald-700'
                          : row.margen >= 0 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {row.margen.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-200">
                    <td className="px-5 py-3 font-black text-slate-700 text-xs uppercase tracking-wide">Total 6 meses</td>
                    <td className="px-5 py-3 text-right font-black text-emerald-700">
                      ${usd(plTable.reduce((s, r) => s + r.ingresos, 0))}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-red-600">
                      ${usd(plTable.reduce((s, r) => s + r.gastos, 0))}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-teal-700">
                      {(() => { const u = plTable.reduce((s, r) => s + r.utilidad, 0); return (u >= 0 ? '+' : '') + '$' + usd(u) })()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {(() => {
                        const ing = plTable.reduce((s, r) => s + r.ingresos, 0)
                        const util = plTable.reduce((s, r) => s + r.utilidad, 0)
                        const mgn = ing > 0 ? (util / ing) * 100 : 0
                        return (
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${mgn >= 20 ? 'bg-emerald-100 text-emerald-700' : mgn >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {mgn.toFixed(1)}%
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Breakdown by income type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Ventas Online', value: online, count: txFiltered.filter(t => getTxSubtype(t) === 'online').length, color: 'purple', icon: Globe },
              { label: 'Efectivo Sucursales', value: efectivo, count: txFiltered.filter(t => getTxSubtype(t) === 'efectivo').length, color: 'emerald', icon: Banknote },
              { label: 'Tarjeta Sucursales', value: tarjeta, count: txFiltered.filter(t => getTxSubtype(t) === 'tarjeta').length, color: 'blue', icon: CreditCard },
            ].map(({ label, value, count, color, icon: Icon }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                  <p className={`text-${color}-700 text-xs font-bold uppercase tracking-wider`}>{label}</p>
                </div>
                <p className={`text-xl font-black text-${color}-700`}>${usd(value)}</p>
                <p className={`text-${color}-400 text-xs mt-0.5`}>{count} operaciones</p>
                {totalIngresos > 0 && (
                  <div className="mt-2 bg-white/60 rounded-full h-1.5">
                    <div
                      className={`bg-${color}-500 h-1.5 rounded-full`}
                      style={{ width: `${Math.round((value / totalIngresos) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Presupuesto vs Real */}
          {mes !== 'all' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#c8a951]" />
                  <p className="font-black text-slate-700 text-sm">Presupuesto vs Real — {monthLabel(mes as string)}</p>
                </div>
                <button
                  onClick={() => {
                    const draft: Record<string, string> = {}
                    presupuestos.forEach(p => { draft[p.category] = String(p.monto) })
                    setBudgetDraft(draft)
                    setEditBudget(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar presupuesto
                </button>
              </div>

              {editBudget ? (
                <div className="p-5 space-y-3">
                  <p className="text-xs text-slate-500 mb-3">Ingresa el presupuesto mensual para cada categoría (deja en 0 si no aplica)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIAS_GASTO.map(cat => (
                      <div key={cat} className="flex items-center gap-2">
                        <label className="text-xs text-slate-600 flex-1 min-w-0 truncate">{cat}</label>
                        <div className="relative shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={budgetDraft[cat] ?? ''}
                            onChange={e => setBudgetDraft(prev => ({ ...prev, [cat]: e.target.value }))}
                            placeholder="0.00"
                            className="w-28 pl-5 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#c8a951] bg-slate-50 font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={saveBudget} disabled={savingBudget}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-xs font-bold transition-colors disabled:opacity-50">
                      {savingBudget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Guardar
                    </button>
                    <button onClick={() => setEditBudget(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : presupuestos.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay presupuesto definido para este mes</p>
                  <button
                    onClick={() => { setBudgetDraft({}); setEditBudget(true) }}
                    className="mt-2 text-xs text-[#0a1e42] underline font-semibold"
                  >
                    Definir presupuesto
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Presupuesto</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Real</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Variación</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Uso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {presupuestos.filter(p => p.monto > 0).map(p => {
                        const real   = gastosFiltered.filter(g => g.category === p.category).reduce((s, g) => s + Number(g.amount), 0)
                        const vari   = real - p.monto
                        const pct    = p.monto > 0 ? Math.min((real / p.monto) * 100, 100) : 0
                        const over   = real > p.monto
                        return (
                          <tr key={p.category} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-700 text-xs font-semibold">{p.category}</td>
                            <td className="px-5 py-3 text-right text-xs text-slate-500">${usd(p.monto)}</td>
                            <td className={`px-5 py-3 text-right text-xs font-bold ${over ? 'text-red-600' : 'text-slate-700'}`}>${usd(real)}</td>
                            <td className={`px-5 py-3 text-right text-xs font-black ${over ? 'text-red-600' : 'text-emerald-600'}`}>
                              {over ? '+' : ''}{usd(vari)}
                            </td>
                            <td className="px-5 py-3 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold shrink-0 ${over ? 'text-red-500' : 'text-slate-400'}`}>
                                  {Math.round((real / p.monto) * 100)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-200">
                        <td className="px-5 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Total</td>
                        <td className="px-5 py-3 text-right text-xs font-black text-slate-600">
                          ${usd(presupuestos.reduce((s, p) => s + p.monto, 0))}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-black text-red-600">
                          ${usd(gastosFiltered.reduce((s, g) => s + Number(g.amount), 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      ) : tab === 'qb' ? (

        /* ── QB TRANSACTIONS ── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {([
                ['all',      'Todos'],
                ['online',   'Online'],
                ['efectivo', 'Efectivo'],
                ['tarjeta',  'Tarjeta'],
                ['gasto',    'Gastos'],
              ] as const).map(([val, label]) => (
                <button key={val} onClick={() => setTxFilter(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    txFilter === val ? 'bg-[#0f2c5c] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {label}
                  {val !== 'all' && (
                    <span className="ml-1.5 opacity-60">
                      {txFiltered.filter(t => getTxSubtype(t) === val).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={exportQB}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          {txDisplay.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay transacciones en este período</p>
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
                  {txDisplay.map(t => {
                    const sub    = getTxSubtype(t)
                    const cfg    = SUBTYPE_CONFIG[sub]
                    const Icon   = cfg.icon
                    const suc    = getSucursalCode(t)
                    const isInc  = sub !== 'gasto'
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.color}`}>
                            <Icon className="w-3 h-3" />{cfg.label}
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
                        <td className={`px-4 py-3 text-right font-black text-sm ${isInc ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isInc ? '+' : '-'}${Number(t.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.qb_id
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
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

      ) : tab === 'cierres' ? (

        /* ── CIERRES ── */
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportCierres}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          {/* Resumen por cajero */}
          {cierresFiltered.length > 0 && (() => {
            const cajeroMap = new Map<string, {
              nombre: string
              sucursales: Set<string>
              turnos: number
              boletos: number
              efectivo: number
              tarjeta: number
              paquetes: number
              total: number
            }>()
            cierresFiltered.forEach(c => {
              const key = c.profiles?.full_name ?? c.profiles?.email ?? 'Desconocido'
              if (!cajeroMap.has(key)) {
                cajeroMap.set(key, { nombre: key, sucursales: new Set(), turnos: 0, boletos: 0, efectivo: 0, tarjeta: 0, paquetes: 0, total: 0 })
              }
              const row = cajeroMap.get(key)!
              if (c.sucursales?.code) row.sucursales.add(c.sucursales.code)
              row.turnos   += 1
              row.boletos  += c.total_boletos
              row.efectivo += Number(c.total_efectivo)
              row.tarjeta  += Number(c.total_tarjeta)
              row.paquetes += Number(c.total_paquetes)
              row.total    += Number(c.total_general)
            })
            const rows = Array.from(cajeroMap.values()).sort((a, b) => b.total - a.total)
            return (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0a1e42]" />
                  <p className="font-black text-slate-700 text-sm">Reporte por cajero</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Cajero</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Turnos</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Boletos</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Efectivo</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Tarjeta</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Paquetes</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map(r => (
                        <tr key={r.nombre} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{r.nombre}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{Array.from(r.sucursales).join(', ')}</td>
                          <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">{r.turnos}</td>
                          <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">{r.boletos}</td>
                          <td className="px-4 py-3 text-right text-xs text-emerald-600 font-bold">${usd(r.efectivo)}</td>
                          <td className="px-4 py-3 text-right text-xs text-blue-600 font-bold">${usd(r.tarjeta)}</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-600 font-bold">${usd(r.paquetes)}</td>
                          <td className="px-4 py-3 text-right text-xs font-black text-slate-800">${usd(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-200">
                        <td colSpan={2} className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Total</td>
                        <td className="px-4 py-3 text-center text-xs font-black text-slate-700">{cierresFiltered.length}</td>
                        <td className="px-4 py-3 text-center text-xs font-black text-slate-700">{rows.reduce((s, r) => s + r.boletos, 0)}</td>
                        <td className="px-4 py-3 text-right text-xs font-black text-emerald-700">${usd(rows.reduce((s, r) => s + r.efectivo, 0))}</td>
                        <td className="px-4 py-3 text-right text-xs font-black text-blue-700">${usd(rows.reduce((s, r) => s + r.tarjeta, 0))}</td>
                        <td className="px-4 py-3 text-right text-xs font-black text-slate-700">${usd(rows.reduce((s, r) => s + r.paquetes, 0))}</td>
                        <td className="px-4 py-3 text-right text-xs font-black text-slate-800">${usd(rows.reduce((s, r) => s + r.total, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* Detalle individual de cierres */}
          {cierresFiltered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay cierres en este período</p>
            </div>
          ) : cierresFiltered.map(c => {
            const isFailed = !c.qb_synced
            const msg = retryMsg?.id === c.id ? retryMsg : null
            return (
              <div key={c.id} className={`rounded-2xl border p-4 ${isFailed ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.sucursales && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          <Building2 className="w-3 h-3" />{c.sucursales.code}
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-800">{c.profiles?.full_name ?? c.profiles?.email ?? 'Cajero'}</span>
                      <span className="text-slate-400 text-xs">{c.fecha}</span>
                      {isFailed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                          <XCircle className="w-3 h-3" />Sin sync QB
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />QB ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                      <span><span className="font-semibold">Boletos:</span> {c.total_boletos}</span>
                      <span><span className="font-semibold">Efectivo:</span> ${Number(c.total_efectivo).toFixed(2)}</span>
                      <span><span className="font-semibold">Tarjeta:</span> ${Number(c.total_tarjeta).toFixed(2)}</span>
                      <span><span className="font-semibold">Paquetes:</span> ${Number(c.total_paquetes).toFixed(2)}</span>
                      <span className="font-black text-slate-800">Total: ${Number(c.total_general).toFixed(2)}</span>
                    </div>
                    {c.notas && <p className="mt-1 text-xs text-slate-500 italic">"{c.notas}"</p>}
                    {msg && (
                      <p className={`mt-2 text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                        {msg.ok ? '✓' : '✗'} {msg.text}
                      </p>
                    )}
                  </div>
                  {isFailed && (
                    <button onClick={() => retryCierre(c.id)} disabled={retrying === c.id}
                      className="shrink-0 inline-flex items-center gap-1.5 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                      {retrying === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                      {retrying === c.id ? 'Enviando...' : 'Reintentar QB'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      ) : tab === 'gastos' ? (

        /* ── GASTOS ── */
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={exportGastos}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
          {gastosFiltered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay gastos en este período</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Recibo</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">QB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gastosFiltered.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{g.date}</td>
                      <td className="px-4 py-3">
                        {g.sucursales
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"><Building2 className="w-3 h-3" />{g.sucursales.code}</span>
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs max-w-[120px] truncate">{g.category}</td>
                      <td className="px-4 py-3 text-xs">
                        {g.vendor
                          ? <span className="font-semibold text-slate-700">{g.vendor}</span>
                          : <span className="text-slate-300">—</span>
                        }
                        {g.receipt_number && (
                          <span className="ml-1 font-mono text-[10px] text-slate-400">#{g.receipt_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">{g.description ?? '—'}</td>
                      <td className="px-4 py-3">
                        {g.payment_method === 'cash'
                          ? <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Banknote className="w-3 h-3" /> Efectivo</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-slate-500"><CreditCard className="w-3 h-3" /> Tarjeta</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-600">${Number(g.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {g.receipt_url ? (
                          <a href={g.receipt_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors mx-auto"
                            title="Ver comprobante">
                            <Image className="w-3.5 h-3.5 text-slate-500" />
                          </a>
                        ) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {g.qb_synced
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-amber-400 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={8} className="px-4 py-3 text-xs font-bold text-slate-500">
                      Total ({gastosFiltered.length} gastos)
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-700">
                      ${usd(gastosFiltered.reduce((s, g) => s + Number(g.amount), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (

        /* ── CONCILIACIÓN QB ── */
        <div className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Gastos pendientes QB', value: gastos.filter(g => !g.qb_synced).length, color: 'red' },
              { label: 'Gastos sincronizados',  value: gastos.filter(g => g.qb_synced).length,  color: 'emerald' },
              { label: 'Cierres pendientes QB', value: cierresPend.length,                       color: 'amber' },
              { label: 'Cierres sincronizados', value: cierres.filter(c => c.qb_synced).length,  color: 'emerald' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-2xl p-4`}>
                <p className={`text-${color}-700 text-xs font-bold uppercase tracking-wider mb-1`}>{label}</p>
                <p className={`text-2xl font-black text-${color}-700`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Gastos sin QB */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="font-black text-slate-700 text-sm">
                  Gastos pendientes de QB ({gastos.filter(g => !g.qb_synced).length})
                </p>
              </div>
              {gastos.some(g => !g.qb_synced) && (
                <button onClick={retryAllGastos} disabled={retryingAll || !!retryingGasto}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-50 text-white text-xs font-bold transition-colors">
                  {retryingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                  Reintentar todos
                </button>
              )}
            </div>

            {gastos.filter(g => !g.qb_synced).length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-600">Todos los gastos están en QB</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {gastos.filter(g => !g.qb_synced).map(g => {
                  const msg = gastoRetryMsg[g.id]
                  return (
                    <div key={g.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{g.category}</span>
                          {g.sucursales && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{g.sucursales.code}</span>
                          )}
                          {g.vendor && <span className="text-xs text-slate-500">{g.vendor}</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{g.date} · {g.profiles?.full_name ?? '—'}</p>
                        {msg && (
                          <p className={`text-xs font-semibold mt-1 ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                            {msg.ok ? '✓' : '✗'} {msg.text}
                          </p>
                        )}
                      </div>
                      <span className="font-black text-red-600 shrink-0">${Number(g.amount).toFixed(2)}</span>
                      <button onClick={() => retryGasto(g.id)} disabled={retryingGasto === g.id || retryingAll}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                        {retryingGasto === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                        QB
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cierres sin QB */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-500" />
                <p className="font-black text-slate-700 text-sm">
                  Cierres pendientes de QB ({cierresPend.length})
                </p>
              </div>
            </div>
            {cierresPend.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-600">Todos los cierres están en QB</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cierresPend.map(c => {
                  const msg = retryMsg?.id === c.id ? retryMsg : null
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.sucursales && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{c.sucursales.code}</span>
                          )}
                          <span className="font-bold text-slate-800 text-sm">{c.profiles?.full_name ?? 'Cajero'}</span>
                          <span className="text-xs text-slate-400">{c.fecha}</span>
                        </div>
                        {msg && (
                          <p className={`text-xs font-semibold mt-1 ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                            {msg.ok ? '✓' : '✗'} {msg.text}
                          </p>
                        )}
                      </div>
                      <span className="font-black text-slate-700 shrink-0">${Number(c.total_general).toFixed(2)}</span>
                      <button onClick={() => retryCierre(c.id)} disabled={retrying === c.id}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                        {retrying === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                        QB
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mapeo de cuentas QB (modal/overlay) ── */}
      {showMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-slate-800 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-[#c8a951]" /> Mapeo de cuentas QB
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Asigna cada categoría de gasto a su cuenta en QuickBooks</p>
              </div>
              <button onClick={() => setShowMapping(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {loadingMapping ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              ) : qbAccounts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">QuickBooks no conectado o sin cuentas de gasto disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {CATEGORIAS_GASTO.map(cat => (
                    <div key={cat} className="flex items-center gap-3">
                      <label className="text-xs text-slate-700 font-semibold flex-1 min-w-0">{cat}</label>
                      <select
                        value={mappingDraft[cat] ?? ''}
                        onChange={e => setMappingDraft(prev => ({ ...prev, [cat]: e.target.value }))}
                        className="w-64 shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#c8a951]"
                      >
                        <option value="">— Sin asignar —</option>
                        {qbAccounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <button onClick={saveMapping} disabled={savingMapping || qbAccounts.length === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0a1e42] hover:bg-[#0f2c5c] text-white text-sm font-bold transition-colors disabled:opacity-50">
                {savingMapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar mapeo
              </button>
              <button onClick={() => setShowMapping(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
