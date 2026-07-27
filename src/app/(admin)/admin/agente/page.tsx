'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Send, Loader2, User, ChevronRight,
  ExternalLink, TicketCheck, Zap, BarChart3, Bus, Users, BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { supportWidgetBus } from '@/components/support/support-widget'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  name: string; role: string; email: string
  sucursal: { name: string; code: string } | null
}
interface AgentLink { label: string; href: string }
interface Message {
  id: number; role: 'bot' | 'user'; text: string
  quickReplies?: string[]; links?: AgentLink[]
}
interface GroqMsg { role: 'user' | 'assistant'; content: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Administrador',
    developer: 'Developer', cajero: 'Cajero', chofer: 'Chofer',
  }
  return map[role] ?? role
}

function isAdmin(role: string) {
  return ['admin', 'super_admin', 'developer'].includes(role)
}

function welcomeText(p: UserProfile) {
  const first = p.name.split(' ')[0]
  return isAdmin(p.role)
    ? `¡Hola, **${first}**! 👋\n\nSoy **TEOBOT**, tu asistente IA de administración. Puedo guiarte por el dashboard, darte datos de ventas, ayudarte con tareas del sistema y más.\n\n¿En qué te ayudo hoy?`
    : `¡Hola, **${first}**! 👋\n\nSoy **TEOBOT**, tu asistente de trabajo. Puedo guiarte con tu turno, ventas, validación y más.\n\n¿Qué necesitas?`
}

function welcomeReplies(role: string) {
  if (isAdmin(role)) return ['¿Cuánto vendimos este mes?', '¿Cómo agrego un bus?', '¿Cómo creo una corrida?', '¿Dónde veo la contabilidad?']
  return ['¿Cómo inicio mi turno?', '¿Cómo vendo un boleto?', '¿Cómo valido un boleto?']
}

function formatText(text: string) {
  return text.split('\n').map((line, i, arr) => (
    <span key={i} dangerouslySetInnerHTML={{
      __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + (i < arr.length - 1 ? '<br/>' : ''),
    }} />
  ))
}

const QUICK_ACTIONS = [
  { icon: BarChart3, label: 'Ver ventas del mes',       q: '¿Cuánto vendimos este mes?' },
  { icon: Bus,       label: 'Agregar un autobús',       q: '¿Cómo agrego un bus?' },
  { icon: Users,     label: 'Gestionar personal',       q: '¿Cómo agrego un empleado?' },
  { icon: BookOpen,  label: 'Ver contabilidad',         q: '¿Dónde veo la contabilidad?' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentePage() {
  const [profile,  setProfile]  = useState<UserProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [started,  setStarted]  = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const fallback: UserProfile = { name: 'Administrador', role: 'super_admin', email: '', sucursal: null }

  useEffect(() => {
    fetch('/api/dashboard-agent/me')
      .then(r => r.json().catch(() => null).then(d => (r.ok && d ? d : fallback)))
      .catch(() => fallback)
      .then((p: UserProfile) => setProfile(p))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildHistory = useCallback((msgs: Message[]): GroqMsg[] =>
    msgs.filter(m => m.id !== 0).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })), [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !profile) return
    if (!started) setStarted(true)

    const userMsg: Message = { id: Date.now(), role: 'user', text: text.trim() }
    let updatedMsgs: Message[] = []

    setMessages(prev => { updatedMsgs = [...prev, userMsg]; return updatedMsgs })
    setInput('')
    setLoading(true)

    try {
      const history = buildHistory(updatedMsgs)
      const res  = await fetch('/api/dashboard-agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json()
      if (data.openSupport) supportWidgetBus.openNewTicket()

      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        text: data.answer ?? 'No pude generar una respuesta.',
        quickReplies: data.quickReplies ?? [],
        links: data.links ?? [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        text: 'Error de conexión. Por favor intenta de nuevo.',
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, profile, started, buildHistory])

  const startChat = (q: string) => {
    if (started) { sendMessage(q); return }
    setStarted(true)
    if (profile) {
      setMessages([{
        id: 0, role: 'bot',
        text: welcomeText(profile),
        quickReplies: welcomeReplies(profile.role),
        links: [],
      }])
      setTimeout(() => sendMessage(q), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const initChat = () => {
    if (started || !profile) return
    setStarted(true)
    setMessages([{
      id: 0, role: 'bot',
      text: welcomeText(profile),
      quickReplies: welcomeReplies(profile.role),
    }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060e1f] via-[#0a1628] to-[#0d1f3c] flex flex-col">

      {/* Header */}
      <div className="border-b border-white/5 bg-black/20 backdrop-blur-sm px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c8a951]/30 to-[#f0b429]/10 border border-[#c8a951]/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#c8a951]" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#0a1628] rounded-full" />
        </div>
        <div>
          <h1 className="text-white font-black text-lg tracking-tight">TEOBOT</h1>
          <p className="text-white/30 text-xs">
            Agente IA · {profile ? roleLabel(profile.role) : '—'}
            {profile?.sucursal ? ` · ${profile.sucursal.code}` : ''}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-[#c8a951]/15 text-[#c8a951] border border-[#c8a951]/25 tracking-wider">
            IA · EN LÍNEA
          </span>
          <button
            onClick={() => supportWidgetBus.openNewTicket()}
            className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-amber-400 border border-white/10 hover:border-amber-400/40 px-3 py-1.5 rounded-lg transition-all"
          >
            <TicketCheck className="w-3.5 h-3.5" />
            Reportar problema
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!started ? (
          /* ── Landing ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-10">

            {/* Hero */}
            <div className="text-center space-y-4 max-w-lg">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#c8a951]/20 to-[#0f2c5c] border border-[#c8a951]/30 flex items-center justify-center mx-auto shadow-2xl shadow-[#c8a951]/10">
                <Sparkles className="w-9 h-9 text-[#c8a951]" />
              </div>
              <h2 className="text-white text-3xl font-black tracking-tight">
                ¿En qué puedo<br />
                <span className="bg-gradient-to-r from-[#c8a951] to-[#f0b429] bg-clip-text text-transparent">ayudarte hoy?</span>
              </h2>
              <p className="text-white/30 text-sm">
                {profile ? `Hola, ${profile.name.split(' ')[0]}. Soy tu asistente IA.` : 'Asistente IA de Tres Estrellas de Oro'}
              </p>
            </div>

            {/* Quick action cards */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => startChat(a.q)}
                  className="group flex items-center gap-3 p-4 rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-[#c8a951]/30 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#c8a951]/10 border border-[#c8a951]/20 group-hover:bg-[#c8a951]/20 flex items-center justify-center shrink-0 transition-all">
                    <a.icon className="w-4 h-4 text-[#c8a951]" />
                  </div>
                  <span className="text-white/70 text-sm font-semibold group-hover:text-white transition-colors leading-tight">{a.label}</span>
                </button>
              ))}
            </div>

            {/* Input to start */}
            <div className="w-full max-w-xl">
              <div className="flex gap-3 items-center bg-white/5 border border-white/10 hover:border-white/20 focus-within:border-[#c8a951]/40 rounded-2xl px-4 py-3 transition-all">
                <Zap className="w-4 h-4 text-white/20 shrink-0" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { initChat(); setTimeout(() => sendMessage(input), 60) } }}
                  onFocus={initChat}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
                />
                <button
                  onClick={() => { initChat(); setTimeout(() => sendMessage(input), 60) }}
                  disabled={!input.trim()}
                  className="w-8 h-8 bg-[#c8a951] disabled:bg-white/10 rounded-xl flex items-center justify-center transition-all hover:bg-[#f0b429] disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5 text-[#0a1628] disabled:text-white/30" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Chat ── */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {msg.role === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c8a951]/20 to-[#0f2c5c] border border-[#c8a951]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c8a951]" />
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-white/50" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[75%]">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#c8a951]/20 border border-[#c8a951]/25 text-white rounded-tr-sm'
                      : 'bg-white/6 border border-white/10 text-white/85 rounded-tl-sm'
                  }`}>
                    {formatText(msg.text)}
                  </div>

                  {msg.role === 'bot' && msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.links.map(link => (
                        <Link key={link.href} href={link.href}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-[#0f2c5c] border border-[#c8a951]/30 text-[#c8a951] rounded-xl hover:bg-[#c8a951]/10 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {msg.role === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.quickReplies.map(qr => (
                        <button key={qr} onClick={() => sendMessage(qr)} disabled={loading}
                          className="text-xs font-semibold px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:border-white/25 hover:text-white/90 transition-all disabled:opacity-40 flex items-center gap-1">
                          {qr} <ChevronRight className="w-3 h-3 opacity-50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c8a951]/20 to-[#0f2c5c] border border-[#c8a951]/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#c8a951]" />
                </div>
                <div className="bg-white/6 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#c8a951]/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-white/30">TEOBOT está pensando...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar (only in chat mode) */}
      {started && (
        <div className="border-t border-white/5 bg-black/20 backdrop-blur-sm px-6 py-4 shrink-0">
          <div className="flex gap-3 items-center bg-white/5 border border-white/10 hover:border-white/20 focus-within:border-[#c8a951]/40 rounded-2xl px-4 py-3 transition-all max-w-4xl mx-auto">
            <Zap className="w-4 h-4 text-white/20 shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder={loading ? 'TEOBOT está pensando...' : '¿En qué más puedo ayudarte?'}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-[#c8a951] disabled:bg-white/10 rounded-xl flex items-center justify-center transition-all hover:bg-[#f0b429] disabled:cursor-not-allowed shrink-0"
            >
              {loading
                ? <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                : <Send className="w-4 h-4 text-[#0a1628]" />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
