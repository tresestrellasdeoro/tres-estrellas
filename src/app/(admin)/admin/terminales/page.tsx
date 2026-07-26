'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Monitor, RefreshCw, Loader2, Clock, CheckCircle2, Banknote, CreditCard, Ticket, Package, ChevronDown, ChevronUp, Filter } from 'lucide-react'

interface Turno {
  id:             string
  cajero_user_id: string
  sucursal_id:    string
  inicio:         string
  fin:            string | null
  estado:         'activo' | 'cerrado'
  total_boletos:  number
  total_efectivo: number
  total_tarjeta:  number
  total_paquetes: number
  total_general:  number
  notas:          string | null
  sucursales:     { id: string; name: string; code: string } | null
  profiles:       { id: string; full_name: string | null; email: string } | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start: string, end?: string | null) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
  const h  = Math.floor(ms / 3_600_000)
  const m  = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function PuntosDeVentaPage() {
  const [turnos,       setTurnos]       = useState<Turno[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fecha,        setFecha]        = useState(today())
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set())
  const [tick,         setTick]         = useState(0)
  const [filtroCajero, setFiltroCajero] = useState('')
  const [filtroSucur,  setFiltroSucur]  = useState('')

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/turnos?fecha=${fecha}&limit=200`)
      const d = await r.json()
      setTurnos(d.turnos ?? [])
    } catch {
      setTurnos([])
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Opciones únicas para los selects
  const cajeroOpts = useMemo(() => {
    const seen = new Map<string, string>()
    turnos.forEach(t => {
      if (t.profiles?.id)
        seen.set(t.profiles.id, t.profiles.full_name ?? t.profiles.email)
    })
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [turnos])

  const sucursalOpts = useMemo(() => {
    const seen = new Map<string, string>()
    turnos.forEach(t => {
      if (t.sucursales?.id)
        seen.set(t.sucursales.id, `${t.sucursales.code} · ${t.sucursales.name}`)
    })
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [turnos])

  // Aplicar filtros
  const turnosFiltrados = useMemo(() => turnos.filter(t => {
    if (filtroCajero && t.profiles?.id !== filtroCajero) return false
    if (filtroSucur  && t.sucursales?.id !== filtroSucur)  return false
    return true
  }), [turnos, filtroCajero, filtroSucur])

  const activos  = turnosFiltrados.filter(t => t.estado === 'activo')
  const cerrados = turnosFiltrados.filter(t => t.estado === 'cerrado')

  const totalActivo = activos.reduce((s, t) => s + t.total_general, 0)
  const totalDia    = turnosFiltrados.reduce((s, t) => s + t.total_general, 0)

  const hayFiltros = filtroCajero || filtroSucur

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Monitor className="w-6 h-6 text-[#c8a951]" />
            Puntos de Venta
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Estado en tiempo real de todos los cajeros</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0a1e42]/30"
          />
          <button
            onClick={fetchTurnos}
            className="flex items-center gap-2 bg-[#0a1e42] hover:bg-[#0f2c5c] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Filtrar</span>
        </div>

        <select
          value={filtroCajero}
          onChange={e => setFiltroCajero(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0a1e42]/30 text-slate-700 min-w-[160px]"
        >
          <option value="">Todos los cajeros</option>
          {cajeroOpts.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>

        <select
          value={filtroSucur}
          onChange={e => setFiltroSucur(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0a1e42]/30 text-slate-700 min-w-[160px]"
        >
          <option value="">Todas las sucursales</option>
          {sucursalOpts.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>

        {hayFiltros && (
          <button
            onClick={() => { setFiltroCajero(''); setFiltroSucur('') }}
            className="text-xs font-semibold text-slate-500 hover:text-red-500 underline transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">En turno</p>
          <p className="text-2xl font-black text-green-600">{activos.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Cerrados hoy</p>
          <p className="text-2xl font-black text-slate-700">{cerrados.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total activos</p>
          <p className="text-2xl font-black text-[#0a1e42]">${totalActivo.toFixed(0)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total del día</p>
          <p className="text-2xl font-black text-[#c8a951]">${totalDia.toFixed(0)}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#c8a951] animate-spin" />
        </div>
      )}

      {!loading && turnosFiltrados.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Monitor className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">
            {hayFiltros ? 'Sin turnos para este filtro' : 'Sin turnos para esta fecha'}
          </p>
          {hayFiltros && (
            <button
              onClick={() => { setFiltroCajero(''); setFiltroSucur('') }}
              className="mt-2 text-sm text-[#0a1e42] underline font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {!loading && turnosFiltrados.length > 0 && (
        <div className="space-y-3">

          {activos.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                En turno ahora ({activos.length})
              </p>
              {activos.map(t => (
                <TurnoCard key={t.id} turno={t} expanded={expanded.has(t.id)} onToggle={() => toggleExpand(t.id)} tick={tick} />
              ))}
            </div>
          )}

          {cerrados.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Cerrados hoy ({cerrados.length})
              </p>
              {cerrados.map(t => (
                <TurnoCard key={t.id} turno={t} expanded={expanded.has(t.id)} onToggle={() => toggleExpand(t.id)} tick={tick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TurnoCard({ turno, expanded, onToggle, tick: _tick }: {
  turno:    Turno
  expanded: boolean
  onToggle: () => void
  tick:     number
}) {
  const activo = turno.estado === 'activo'
  return (
    <div className={`bg-white border rounded-xl mb-2 overflow-hidden ${activo ? 'border-green-200' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${activo ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 truncate">
              {turno.profiles?.full_name ?? turno.profiles?.email ?? 'Cajero sin nombre'}
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
              {turno.sucursales?.code ?? '—'} · {turno.sucursales?.name ?? '—'}
            </span>
            {activo ? (
              <span className="text-xs bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(turno.inicio)}
              </span>
            ) : (
              <span className="text-xs bg-slate-50 text-slate-500 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Cerrado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inicio: {formatTime(turno.inicio)}
            {turno.fin && ` · Cierre: ${formatTime(turno.fin)}`}
          </p>
        </div>

        <div className="text-right shrink-0 mr-2">
          <p className="font-black text-[#0a1e42]">${turno.total_general.toFixed(2)}</p>
          <p className="text-xs text-slate-400">{turno.total_boletos} boletos</p>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="bg-slate-50 rounded-lg p-2.5 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Boletos</p>
                <p className="font-bold text-slate-800 text-sm">{turno.total_boletos}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Efectivo</p>
                <p className="font-bold text-slate-800 text-sm">${turno.total_efectivo.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Tarjeta</p>
                <p className="font-bold text-slate-800 text-sm">${turno.total_tarjeta.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#c8a951] shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Paquetes</p>
                <p className="font-bold text-slate-800 text-sm">${turno.total_paquetes.toFixed(2)}</p>
              </div>
            </div>
          </div>
          {turno.notas && (
            <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              <span className="font-bold">Notas:</span> {turno.notas}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
