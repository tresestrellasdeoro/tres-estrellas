'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Plus, ChevronLeft, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'

// Exposed so other components can trigger a refresh
export const supportWidgetBus = { refresh: () => {} }

const CATEGORIES = [
  { value: 'ventas',        label: 'Ventas / Boletos' },
  { value: 'checkin',       label: 'Check-in / Validación' },
  { value: 'paquetes',      label: 'Paquetes' },
  { value: 'sistema',       label: 'Problema técnico' },
  { value: 'reportes',      label: 'Reportes' },
  { value: 'contabilidad',  label: 'Contabilidad' },
  { value: 'otro',          label: 'Otro' },
]

const PRIORITIES = [
  { value: 'baja',    label: 'Baja',    color: 'text-slate-500' },
  { value: 'media',   label: 'Normal',  color: 'text-blue-500' },
  { value: 'alta',    label: 'Alta',    color: 'text-amber-500' },
  { value: 'critica', label: 'Crítica', color: 'text-red-500' },
]

const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  abierta:     { label: 'Abierta',      icon: AlertCircle,   color: 'text-amber-500' },
  en_revision: { label: 'En revisión',  icon: Clock,         color: 'text-blue-500' },
  solucionada: { label: 'Solucionada',  icon: CheckCircle2,  color: 'text-emerald-500' },
  cerrada:     { label: 'Cerrada',      icon: X,             color: 'text-slate-400' },
}

type Ticket = {
  id: string
  ticket_number: string
  subject: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  sender_name: string
  message: string
  is_developer: boolean
  created_at: string
}

type View = 'list' | 'new' | 'chat'

export function SupportWidget() {
  const [open,     setOpen]     = useState(false)
  const [view,     setView]     = useState<View>('list')
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [active,   setActive]   = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(false)
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')
  const [reply,    setReply]    = useState('')
  const [badge,    setBadge]    = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    subject: '', category: 'sistema', priority: 'media', description: '',
  })

  // Load badge count on mount and every 60s
  useEffect(() => {
    const loadBadge = () =>
      fetch('/api/support/tickets')
        .then(r => r.ok ? r.json() : [])
        .then((ts: Ticket[]) => setBadge(ts.filter(t => t.status === 'en_revision').length))
        .catch(() => {})
    loadBadge()
    const interval = setInterval(loadBadge, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open && view === 'list') fetchTickets()
  }, [open, view])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchTickets() {
    setLoading(true)
    try {
      const r = await fetch('/api/support/tickets')
      if (r.ok) setTickets(await r.json())
    } finally { setLoading(false) }
  }

  async function openTicket(t: Ticket) {
    setActive(t)
    setView('chat')
    setLoading(true)
    try {
      const r = await fetch(`/api/support/tickets/${t.id}/messages`)
      if (r.ok) setMessages(await r.json())
    } finally { setLoading(false) }
  }

  async function submitNew() {
    if (!form.subject.trim() || !form.description.trim()) return
    setSending(true)
    setError('')
    try {
      const r = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        setForm({ subject: '', category: 'sistema', priority: 'media', description: '' })
        setView('list')
        fetchTickets()
      } else {
        const body = await r.json().catch(() => ({}))
        setError(body.error ?? `Error ${r.status}`)
      }
    } catch (e) {
      setError('Error de conexión')
    } finally { setSending(false) }
  }

  async function sendReply() {
    if (!reply.trim() || !active) return
    setSending(true)
    try {
      const r = await fetch(`/api/support/tickets/${active.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (r.ok) {
        const msg = await r.json()
        setMessages(prev => [...prev, msg])
        setReply('')
      }
    } finally { setSending(false) }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); if (!open) setView('list') }}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-[#c01515] hover:bg-[#a01010] text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
        title="Soporte"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-[#0a1628] text-[10px] font-black flex items-center justify-center shadow">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>

          {/* Header */}
          <div className="bg-[#0a1628] px-4 py-3 flex items-center gap-2">
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setActive(null) }} className="text-white/60 hover:text-white mr-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <MessageCircle className="w-4 h-4 text-[#f0b429]" />
            <span className="text-white font-bold text-sm flex-1">
              {view === 'list' ? 'Centro de soporte' : view === 'new' ? 'Nueva incidencia' : `#${active?.ticket_number}`}
            </span>
            {view === 'list' && (
              <button onClick={() => setView('new')} className="text-[#f0b429] hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* LIST VIEW */}
            {view === 'list' && (
              <div className="p-3">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Sin incidencias abiertas</p>
                    <button onClick={() => setView('new')}
                      className="mt-3 text-xs text-[#c01515] font-semibold hover:underline">
                      Reportar un problema
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map(t => {
                      const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.abierta
                      return (
                        <button key={t.id} onClick={() => openTicket(t)}
                          className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-slate-800 text-xs font-semibold leading-tight line-clamp-2">{t.subject}</p>
                            <cfg.icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">{t.ticket_number}</span>
                            <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                          </div>
                        </button>
                      )
                    })}
                    <button onClick={() => setView('new')}
                      className="w-full mt-1 py-2 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs hover:border-[#c01515] hover:text-[#c01515] transition-all flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Nueva incidencia
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* NEW TICKET VIEW */}
            {view === 'new' && (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Asunto</label>
                  <input
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Describe brevemente el problema"
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Área</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Urgencia</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Descripción detallada</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="¿Qué pasó? ¿Cuándo? ¿Con qué frecuencia?"
                    rows={4}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] resize-none"
                  />
                </div>
                {error && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  onClick={submitNew}
                  disabled={sending || !form.subject.trim() || !form.description.trim()}
                  className="w-full bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar incidencia
                </button>
              </div>
            )}

            {/* CHAT VIEW */}
            {view === 'chat' && (
              <div className="flex flex-col h-full">
                {active && (
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-700 line-clamp-1">{active.subject}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold ${STATUS_CFG[active.status]?.color ?? 'text-slate-400'}`}>
                        {STATUS_CFG[active.status]?.label ?? active.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{active.category}</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 200, maxHeight: 320 }}>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-4">Sin mensajes aún.<br/>El equipo de soporte responderá pronto.</p>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.is_developer ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                          msg.is_developer
                            ? 'bg-[#0a1628] text-white rounded-tl-sm'
                            : 'bg-[#c01515] text-white rounded-tr-sm'
                        }`}>
                          {msg.is_developer && (
                            <p className="text-[10px] text-white/50 font-bold mb-0.5">{msg.sender_name}</p>
                          )}
                          <p className="leading-relaxed">{msg.message}</p>
                          <p className="text-[9px] mt-1 opacity-50 text-right">
                            {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
          </div>

          {/* Reply bar for chat */}
          {view === 'chat' && active?.status !== 'cerrada' && (
            <div className="border-t border-slate-100 p-3 flex gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                placeholder="Escribe un mensaje..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30"
              />
              <button onClick={sendReply} disabled={sending || !reply.trim()}
                className="w-8 h-8 bg-[#c01515] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors hover:bg-[#a01010]">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
