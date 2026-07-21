'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Plus, ChevronLeft, AlertCircle, CheckCircle2, Clock, X as XIcon, Send, Loader2 } from 'lucide-react'

const CATEGORIES = [
  { value: 'ventas',       label: 'Ventas / Boletos' },
  { value: 'checkin',      label: 'Check-in / Validación' },
  { value: 'paquetes',     label: 'Paquetes' },
  { value: 'sistema',      label: 'Problema técnico' },
  { value: 'reportes',     label: 'Reportes' },
  { value: 'contabilidad', label: 'Contabilidad' },
  { value: 'otro',         label: 'Otro' },
]
const PRIORITIES = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Normal' },
  { value: 'alta',    label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]
const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  abierta:     { label: 'Abierta',     icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  en_revision: { label: 'En revisión', icon: Clock,        color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  solucionada: { label: 'Solucionada', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  cerrada:     { label: 'Cerrada',     icon: XIcon,        color: 'text-slate-400',   bg: 'bg-slate-50 border-slate-200' },
}

type Ticket  = { id: string; ticket_number: string; subject: string; category: string; priority: string; status: string; created_at: string; updated_at: string }
type Message = { id: string; sender_name: string; message: string; is_developer: boolean; created_at: string }
type View = 'list' | 'new' | 'chat'

export default function SoporteStaffPage() {
  const [view,     setView]     = useState<View>('list')
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [active,   setActive]   = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const [reply,    setReply]    = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ subject: '', category: 'sistema', priority: 'media', description: '' })

  useEffect(() => { if (view === 'list') fetchTickets() }, [view])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function fetchTickets() {
    setLoading(true)
    try {
      const r = await fetch('/api/support/tickets')
      if (r.ok) setTickets(await r.json())
    } finally { setLoading(false) }
  }

  async function openTicket(t: Ticket) {
    setActive(t); setView('chat'); setLoading(true)
    try {
      const r = await fetch(`/api/support/tickets/${t.id}/messages`)
      if (r.ok) setMessages(await r.json())
    } finally { setLoading(false) }
  }

  async function submitNew() {
    if (!form.subject.trim() || !form.description.trim()) return
    setSending(true)
    try {
      const r = await fetch('/api/support/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (r.ok) { setForm({ subject: '', category: 'sistema', priority: 'media', description: '' }); setView('list') }
    } finally { setSending(false) }
  }

  async function sendReply() {
    if (!reply.trim() || !active) return
    setSending(true)
    try {
      const r = await fetch(`/api/support/tickets/${active.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply.trim() }),
      })
      if (r.ok) { const msg = await r.json(); setMessages(prev => [...prev, msg]); setReply('') }
    } finally { setSending(false) }
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button onClick={() => { setView('list'); setActive(null) }} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#c01515]" />
              {view === 'list' ? 'Mis incidencias' : view === 'new' ? 'Nueva incidencia' : `#${active?.ticket_number}`}
            </h1>
            {view === 'list' && <p className="text-slate-400 text-sm mt-0.5">{tickets.length} incidencias registradas</p>}
          </div>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('new')}
            className="flex items-center gap-2 bg-[#c01515] hover:bg-[#a01010] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Nueva incidencia
          </button>
        )}
      </div>

      {/* LIST */}
      {view === 'list' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-700 mb-1">Sin incidencias</p>
              <p className="text-slate-400 text-sm mb-4">Reporta un problema y el equipo de soporte te responderá.</p>
              <button onClick={() => setView('new')} className="bg-[#c01515] text-white font-bold text-sm px-4 py-2 rounded-xl">
                Reportar problema
              </button>
            </div>
          ) : (
            tickets.map(t => {
              const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.abierta
              return (
                <button key={t.id} onClick={() => openTicket(t)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{t.subject}</p>
                      <p className="text-slate-400 text-xs mt-0.5 capitalize">{t.category}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${cfg.bg}`}>
                      <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                      <span className={cfg.color}>{cfg.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-mono text-[11px] text-slate-400">{t.ticket_number}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(t.updated_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* NEW */}
      {view === 'new' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Asunto *</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Describe brevemente el problema"
              className="mt-1.5 w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Área</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="mt-1.5 w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Urgencia</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="mt-1.5 w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción detallada *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="¿Qué pasó? ¿Cuándo? ¿Con qué frecuencia ocurre?" rows={5}
              className="mt-1.5 w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setView('list')} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={submitNew} disabled={sending || !form.subject.trim() || !form.description.trim()}
              className="flex-1 bg-[#c01515] hover:bg-[#a01010] disabled:opacity-40 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar incidencia
            </button>
          </div>
        </div>
      )}

      {/* CHAT */}
      {view === 'chat' && active && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">{active.subject}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-bold ${STATUS_CFG[active.status]?.color ?? 'text-slate-400'}`}>
                {STATUS_CFG[active.status]?.label}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400 capitalize">{active.category}</span>
            </div>
          </div>

          <div className="p-5 space-y-3 overflow-y-auto" style={{ minHeight: 300, maxHeight: 420 }}>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
            ) : messages.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Sin mensajes aún. El equipo de soporte responderá pronto.</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_developer ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${msg.is_developer ? 'bg-[#0a1628] text-white rounded-tl-sm' : 'bg-[#c01515] text-white rounded-tr-sm'}`}>
                    {msg.is_developer && <p className="text-[10px] text-violet-300 font-bold mb-1">⚡ {msg.sender_name}</p>}
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className="text-[10px] mt-1.5 opacity-50 text-right">
                      {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {active.status !== 'cerrada' && (
            <div className="border-t border-slate-100 p-4 flex gap-3">
              <input value={reply} onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendReply() } }}
                placeholder="Escribe una respuesta..."
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30" />
              <button onClick={sendReply} disabled={sending || !reply.trim()}
                className="w-10 h-10 bg-[#c01515] disabled:opacity-40 text-white rounded-xl flex items-center justify-center hover:bg-[#a01010] transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
