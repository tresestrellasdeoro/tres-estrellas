'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, AlertCircle, Clock, CheckCircle2, X as XIcon, Search, Filter, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos los estados' },
  { value: 'abierta',     label: 'Abierta' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'solucionada', label: 'Solucionada' },
  { value: 'cerrada',     label: 'Cerrada' },
]

const CATEGORY_OPTIONS = [
  { value: '',             label: 'Todas las áreas' },
  { value: 'ventas',       label: 'Ventas' },
  { value: 'checkin',      label: 'Check-in' },
  { value: 'paquetes',     label: 'Paquetes' },
  { value: 'sistema',      label: 'Sistema' },
  { value: 'reportes',     label: 'Reportes' },
  { value: 'contabilidad', label: 'Contabilidad' },
  { value: 'otro',         label: 'Otro' },
]

const PRIORITY_OPTIONS = [
  { value: '',        label: 'Todas las urgencias' },
  { value: 'critica', label: '🔴 Crítica' },
  { value: 'alta',    label: '🟠 Alta' },
  { value: 'media',   label: '🔵 Normal' },
  { value: 'baja',    label: '⚪ Baja' },
]

const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  abierta:     { label: 'Abierta',     icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  en_revision: { label: 'En revisión', icon: Clock,        color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  solucionada: { label: 'Solucionada', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  cerrada:     { label: 'Cerrada',     icon: XIcon,        color: 'text-slate-400',   bg: 'bg-slate-50 border-slate-200' },
}

const PRIORITY_COLOR: Record<string, string> = {
  critica: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-amber-100 text-amber-700 border-amber-200',
  media:   'bg-blue-100 text-blue-700 border-blue-200',
  baja:    'bg-slate-100 text-slate-600 border-slate-200',
}

type Ticket = {
  id: string
  ticket_number: string
  subject: string
  category: string
  priority: string
  status: string
  creator_name: string
  creator_role: string
  created_at: string
  updated_at: string
  sucursales?: { nombre: string } | null
}

export default function SoporteListPage() {
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setFetchErr('')
    try {
      const params = new URLSearchParams()
      if (status)   params.set('status', status)
      if (category) params.set('category', category)
      if (priority) params.set('priority', priority)
      if (search)   params.set('search', search)
      const r = await fetch(`/api/developer/support?${params}`)
      if (r.ok) {
        setTickets(await r.json())
      } else {
        const body = await r.json().catch(() => ({}))
        setFetchErr(`Error ${r.status}: ${body.error ?? 'desconocido'}`)
      }
    } catch {
      setFetchErr('Error de conexión')
    } finally { setLoading(false) }
  }, [status, category, priority, search])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const counts = {
    abierta:     tickets.filter(t => t.status === 'abierta').length,
    en_revision: tickets.filter(t => t.status === 'en_revision').length,
    solucionada: tickets.filter(t => t.status === 'solucionada').length,
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-violet-500" /> Centro de Soporte
          </h1>
          <p className="text-slate-400 text-sm mt-1">{tickets.length} incidencias encontradas</p>
        </div>
        <button onClick={fetchTickets} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {fetchErr && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{fetchErr}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { key: 'abierta', label: 'Abiertas', color: 'border-amber-200 bg-amber-50', textColor: 'text-amber-700' },
          { key: 'en_revision', label: 'En revisión', color: 'border-blue-200 bg-blue-50', textColor: 'text-blue-700' },
          { key: 'solucionada', label: 'Solucionadas', color: 'border-emerald-200 bg-emerald-50', textColor: 'text-emerald-700' },
        ].map(c => (
          <button key={c.key} onClick={() => setStatus(status === c.key ? '' : c.key)}
            className={`rounded-xl border p-3 text-center transition-all ${c.color} ${status === c.key ? 'ring-2 ring-offset-1 ring-violet-400' : 'hover:opacity-80'}`}>
            <p className={`font-black text-2xl ${c.textColor}`}>{counts[c.key as keyof typeof counts]}</p>
            <p className={`text-xs font-semibold ${c.textColor}`}>{c.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar incidencia..."
            className="bg-transparent text-sm py-2 flex-1 focus:outline-none" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Ticket list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">Sin incidencias que mostrar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ticket</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asunto</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Reportado por</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Área</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Urgencia</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(t => {
                const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.abierta
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/developer/soporte/${t.id}`} className="font-mono text-xs text-violet-600 hover:underline font-bold">
                        {t.ticket_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <Link href={`/developer/soporte/${t.id}`} className="text-sm font-semibold text-slate-800 hover:text-violet-700 line-clamp-1 block">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700">{t.creator_name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{t.creator_role}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-slate-500 capitalize">{t.category}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_COLOR[t.priority] ?? ''}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${cfg.bg}`}>
                        <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                        <span className={cfg.color}>{cfg.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <p className="text-[11px] text-slate-400">
                        {new Date(t.updated_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
