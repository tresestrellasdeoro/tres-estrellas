'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, X, Send, Loader2, User, ChevronRight,
  ExternalLink, AlertCircle, Sparkles, TicketCheck,
} from 'lucide-react'
import Link from 'next/link'
import { supportWidgetBus } from '@/components/support/support-widget'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  name:     string
  role:     string
  email:    string
  sucursal: { name: string; code: string } | null
}

interface AgentLink { label: string; href: string }

interface Message {
  id:           number
  role:         'bot' | 'user'
  text:         string
  quickReplies?: string[]
  links?:        AgentLink[]
  error?:        boolean
}

interface GroqMsg { role: 'user' | 'assistant'; content: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin: 'Super Admin',
    admin:       'Administrador',
    developer:   'Developer',
    cajero:      'Cajero',
    chofer:      'Chofer',
  }
  return map[role] ?? role
}

function isAdmin(role: string) {
  return ['admin', 'super_admin', 'developer'].includes(role)
}

function welcomeText(profile: UserProfile) {
  const firstName = profile.name.split(' ')[0]
  const greeting  = isAdmin(profile.role)
    ? `¡Hola, **${firstName}**! 👋 Soy TEOBOT, tu asistente de administración.\n\nPuedo guiarte por el dashboard, responder preguntas sobre ventas, contabilidad, personal y más. ¿En qué te ayudo hoy?`
    : `¡Hola, **${firstName}**! 👋 Soy TEOBOT, tu asistente de trabajo.\n\nPuedo guiarte en tu turno, ventas, validación y más. ¿Qué necesitas?`
  return greeting
}

function welcomeReplies(role: string) {
  if (isAdmin(role)) return [
    '¿Cuánto vendimos este mes?',
    '¿Cómo agrego un bus?',
    '¿Cómo creo una corrida?',
    '¿Dónde veo la contabilidad?',
    '¿Cómo agrego un empleado?',
  ]
  return [
    '¿Cómo inicio mi turno?',
    '¿Cómo vendo un boleto?',
    '¿Cómo valido un boleto?',
    '¿Cómo registro un gasto?',
  ]
}

function formatText(text: string) {
  return text.split('\n').map((line, i, arr) => (
    <span
      key={i}
      dangerouslySetInnerHTML={{
        __html: line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          + (i < arr.length - 1 ? '<br/>' : ''),
      }}
    />
  ))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardAgent() {
  const [open,     setOpen]     = useState(false)
  const [profile,  setProfile]  = useState<UserProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Fetch user profile once — fall back to generic admin so button always renders
  useEffect(() => {
    const fallback: UserProfile = { name: 'Administrador', role: 'super_admin', email: '', sucursal: null }
    fetch('/api/dashboard-agent/me')
      .then(r => r.json().catch(() => null).then(d => (r.ok && d ? d : fallback)))
      .catch(() => fallback)
      .then((p: UserProfile) => {
        setProfile(p)
        setMessages([{
          id:           0,
          role:         'bot',
          text:         welcomeText(p),
          quickReplies: welcomeReplies(p.role),
          links:        [],
        }])
      })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  const buildHistory = useCallback((msgs: Message[]): GroqMsg[] =>
    msgs
      .filter(m => m.id !== 0)
      .map(m => ({
        role:    m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
  , [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { id: Date.now(), role: 'user', text: trimmed }
    let updatedMsgs: Message[] = []

    setMessages(prev => {
      updatedMsgs = [...prev, userMsg]
      return updatedMsgs
    })
    setInput('')
    setLoading(true)

    try {
      const history = buildHistory(updatedMsgs)
      const res     = await fetch('/api/dashboard-agent/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      })
      const data = await res.json()

      // If AI says to open support, trigger it
      if (data.openSupport) {
        supportWidgetBus.openNewTicket()
      }

      const botMsg: Message = {
        id:           Date.now() + 1,
        role:         'bot',
        text:         data.answer ?? 'No pude generar una respuesta.',
        quickReplies: data.quickReplies ?? [],
        links:        data.links ?? [],
        error:        !res.ok,
      }
      setMessages(prev => [...prev, botMsg])
      if (!open) setUnread(n => n + 1)
    } catch {
      setMessages(prev => [...prev, {
        id:    Date.now() + 1,
        role:  'bot',
        text:  'Error de conexión. Por favor intenta de nuevo.',
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, open, buildHistory])

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const handleOpenSupport = () => {
    setOpen(false)
    supportWidgetBus.openNewTicket()
  }

  if (!profile) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Asistente IA TEOBOT"
        className="fixed bottom-20 right-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-[#0a1e42] to-[#1a3a6e] hover:from-[#0f2c5c] hover:to-[#1a3a6e] text-white shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-white/10"
      >
        {open
          ? <X className="w-5 h-5" />
          : <Sparkles className="w-5 h-5 text-[#c8a951]" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#c01515] text-white text-[10px] font-black flex items-center justify-center shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-[8.5rem] right-5 z-50 w-[340px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 100px)', height: 580 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0a1e42] to-[#0f2c5c] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#c8a951]/20 border border-[#c8a951]/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-[#c8a951]" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0a1e42] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm">TEOBOT</p>
              <p className="text-white/40 text-[10px] truncate">
                {profile.name} · {roleLabel(profile.role)}
                {profile.sucursal ? ` · ${profile.sucursal.code}` : ''}
              </p>
            </div>
            <button
              onClick={handleOpenSupport}
              title="Reportar un problema"
              className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-white transition-colors border border-amber-400/30 hover:border-white/30 px-2 py-1 rounded-lg"
            >
              <TicketCheck className="w-3 h-3" />
              Reportar
            </button>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white ml-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-[#0a1e42] border border-[#c8a951]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c8a951]" />
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[84%]">
                  {/* Bubble */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0a1e42] text-white rounded-tr-sm'
                      : msg.error
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {formatText(msg.text)}
                  </div>

                  {/* Navigation links */}
                  {msg.role === 'bot' && msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.links.map(link => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-[#0a1e42] text-white rounded-lg hover:bg-[#0f2c5c] transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Quick replies */}
                  {msg.role === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.quickReplies.map(qr => (
                        <button
                          key={qr}
                          onClick={() => sendMessage(qr)}
                          disabled={loading}
                          className="text-[11px] font-semibold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full hover:border-[#0a1e42] hover:text-[#0a1e42] transition-all flex items-center gap-0.5 disabled:opacity-40"
                        >
                          {qr}
                          <ChevronRight className="w-3 h-3 opacity-50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0a1e42] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#c8a951]" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#0a1e42]/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">TEOBOT está pensando...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Support CTA bar */}
          <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <p className="text-[10px] text-amber-700 font-semibold">¿Tienes un problema técnico?</p>
            </div>
            <button
              onClick={handleOpenSupport}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline transition-colors"
            >
              Repórtalo aquí →
            </button>
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder={loading ? 'TEOBOT está pensando...' : '¿En qué puedo ayudarte?'}
              className="flex-1 text-sm px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0a1e42]/15 focus:border-[#0a1e42] placeholder:text-slate-400 disabled:opacity-50 transition-all"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-[#0a1e42] hover:bg-[#0f2c5c] disabled:bg-slate-100 text-white disabled:text-slate-300 rounded-xl flex items-center justify-center transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
