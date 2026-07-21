'use client'

import { useState, useEffect, useRef, use } from 'react'
import {
  ArrowLeft, Send, CheckCircle2, Clock, AlertCircle, X as XIcon,
  User, Tag, Calendar, Loader2, ChevronDown
} from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'abierta',     label: 'Abierta',     color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'en_revision', label: 'En revisión', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'solucionada', label: 'Solucionada', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'cerrada',     label: 'Cerrada',     color: 'text-slate-500 bg-slate-50 border-slate-200' },
]

const PRIORITY_OPTS = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Normal' },
  { value: 'alta',    label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

const STATUS_ICON: Record<string, typeof Clock> = {
  abierta: AlertCircle, en_revision: Clock, solucionada: CheckCircle2, cerrada: XIcon,
}

type Message = { id: string; sender_name: string; message: string; is_developer: boolean; created_at: string }
type Ticket  = {
  id: string; ticket_number: string; subject: string; category: string; priority: string;
  status: string; creator_name: string; creator_role: string; description: string;
  created_at: string; updated_at: string; resolved_at: string | null;
  sucursales?: { nombre: string } | null
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ticket,   setTicket]   = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)
  const [reply,    setReply]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [updating, setUpdating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/developer/support/${id}`)
      .then(r => r.json())
      .then(d => { setTicket(d.ticket); setMessages(d.messages ?? []) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendReply() {
    if (!reply.trim() || !ticket) return
    setSending(true)
    try {
      const r = await fetch(`/api/developer/support/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (r.ok) {
        const msg = await r.json()
        setMessages(prev => [...prev, msg])
        setReply('')
        if (ticket.status === 'abierta') setTicket(t => t ? { ...t, status: 'en_revision' } : t)
      }
    } finally { setSending(false) }
  }

  async function updateField(field: 'status' | 'priority', value: string) {
    setUpdating(true)
    try {
      const r = await fetch(`/api/developer/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (r.ok) {
        const updated = await r.json()
        setTicket(t => t ? { ...t, ...updated } : t)
      }
    } finally { setUpdating(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
    </div>
  )

  if (!ticket) return (
    <div className="p-8 text-center text-slate-400">Ticket no encontrado</div>
  )

  const currentStatus = STATUS_OPTIONS.find(s => s.value === ticket.status)
  const StatusIcon    = STATUS_ICON[ticket.status] ?? AlertCircle

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Link href="/developer/soporte" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-violet-600 font-bold">{ticket.ticket_number}</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${currentStatus?.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {currentStatus?.label}
            </span>
          </div>
          <h1 className="font-display font-black text-xl text-[#0a1628] leading-tight">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chat column */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Original description */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[rgba(240,180,41,0.2)] flex items-center justify-center text-[#d97706] font-black text-sm">
                {ticket.creator_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{ticket.creator_name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{ticket.creator_role}</p>
              </div>
              <span className="ml-auto text-[11px] text-slate-400">
                {new Date(ticket.created_at).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden shadow-sm" style={{ minHeight: 400 }}>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-700 text-sm">Mensajes de seguimiento</p>
              <span className="text-[11px] text-slate-400">{messages.length} mensajes</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Sin mensajes aún</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.is_developer ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.is_developer
                        ? 'bg-[#0a1628] text-white rounded-tl-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tr-sm'
                    }`}>
                      <p className={`text-[10px] font-bold mb-1 ${msg.is_developer ? 'text-violet-300' : 'text-slate-500'}`}>
                        {msg.is_developer ? '⚡ ' : ''}{msg.sender_name}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1.5 text-right ${msg.is_developer ? 'text-white/40' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {ticket.status !== 'cerrada' && (
              <div className="border-t border-slate-100 p-4 flex gap-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                  placeholder="Escribe tu respuesta… (Cmd/Ctrl+Enter para enviar)"
                  rows={3}
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="w-10 h-10 self-end bg-[#0a1628] hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">

          {/* Status control */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Estado del ticket</p>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => updateField('status', opt.value)}
                  disabled={updating || ticket.status === opt.value}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    ticket.status === opt.value
                      ? opt.color + ' ring-2 ring-offset-1 ring-violet-400'
                      : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                  }`}>
                  {ticket.status === opt.value && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority control */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Urgencia</p>
            <div className="relative">
              <select value={ticket.priority} onChange={e => updateField('priority', e.target.value)}
                disabled={updating}
                className="w-full appearance-none text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white pr-8">
                {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Ticket info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Información</p>
            {[
              { icon: User,     label: 'Reportado por', value: `${ticket.creator_name} (${ticket.creator_role})` },
              { icon: Tag,      label: 'Área',          value: ticket.category },
              { icon: Calendar, label: 'Creado',        value: new Date(ticket.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              ...(ticket.sucursales ? [{ icon: Tag, label: 'Sucursal', value: ticket.sucursales.nombre }] : []),
              ...(ticket.resolved_at ? [{ icon: CheckCircle2, label: 'Resuelto', value: new Date(ticket.resolved_at).toLocaleDateString('es-MX') }] : []),
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="text-sm text-slate-700 font-medium capitalize">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {updating && (
            <div className="flex items-center justify-center gap-2 text-violet-600 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
