'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, User, ChevronRight, Loader2, Phone } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id:           number
  role:         'bot' | 'user'
  text:         string
  quickReplies?: string[]
  error?:       boolean
}

interface GroqMessage {
  role:    'user' | 'assistant'
  content: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WELCOME_TEXT = `¡Hola! 👋 Soy **TEO**, el asistente virtual de Tres Estrellas de Oro.\n\nPuedo ayudarte a comprar boletos, revisar horarios, precios, equipaje y guiarte por el sitio. ¿En qué te ayudo hoy?`

const WELCOME_REPLIES = [
  '¿Cómo compro mi boleto?',
  '¿Qué horarios tienen?',
  '¿Cuánto cuesta el boleto?',
  '¿Dónde están las terminales?',
  '¿Qué incluye el equipaje?',
]

// ── Text formatter ─────────────────────────────────────────────────────────────

function formatText(text: string) {
  return text.split('\n').map((line, i, arr) => {
    const html = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:11px">$1</code>')
    return (
      <span
        key={i}
        dangerouslySetInnerHTML={{ __html: html + (i < arr.length - 1 ? '<br/>' : '') }}
      />
    )
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Chatbot() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'bot', text: WELCOME_TEXT, quickReplies: WELCOME_REPLIES },
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  // Build conversation history for Groq (last 12 exchanges)
  const buildHistory = useCallback((msgs: Message[]): GroqMessage[] => {
    return msgs
      .filter(m => m.id !== 0) // skip welcome
      .map(m => ({
        role:    m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { id: Date.now(), role: 'user', text: trimmed }
    setMessages(prev => {
      const updated = [...prev, userMsg]
      sendToGroq(updated)
      return updated
    })
    setInput('')
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendToGroq = async (currentMessages: Message[]) => {
    setLoading(true)
    try {
      const history = buildHistory(currentMessages)
      const res     = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      const botMsg: Message = {
        id:           Date.now() + 1,
        role:         'bot',
        text:         data.answer ?? 'Lo siento, ocurrió un error.',
        quickReplies: data.quickReplies ?? [],
        error:        !res.ok,
      }
      setMessages(prev => [...prev, botMsg])
      if (!open) setUnread(n => n + 1)
    } catch {
      setMessages(prev => [...prev, {
        id:           Date.now() + 1,
        role:         'bot',
        text:         'No pude conectarme en este momento 😓\nLlámanos al 📞 **(213) 624-5524**',
        quickReplies: ['¿Cómo compro?', '¿Qué horarios hay?'],
        error:        true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* ── Bubble button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat con TEO'}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#c01515] hover:bg-[#a01010] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        {open
          ? <X className="w-6 h-6" />
          : <MessageCircle className="w-6 h-6" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#c8a951] text-[#0a1628] text-[10px] font-black rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)', height: 560 }}
        >
          {/* Header */}
          <div className="bg-[#0a1e42] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#c01515] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0a1e42] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm tracking-wide">TEO — Asistente Virtual</p>
              <p className="text-white/50 text-xs">Tres Estrellas de Oro · En línea</p>
            </div>
            <a
              href="tel:+12136245524"
              className="flex items-center gap-1 text-[#c8a951] hover:text-white text-xs font-bold transition-colors"
              title="Llamar a LA"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Llamar</span>
            </a>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-[#0a1e42] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#c8a951]" />
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[82%]">
                  {/* Bubble */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#c01515] text-white rounded-tr-sm'
                      : msg.error
                        ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {formatText(msg.text)}
                  </div>

                  {/* Quick replies */}
                  {msg.role === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.quickReplies.map(qr => (
                        <button
                          key={qr}
                          onClick={() => sendMessage(qr)}
                          disabled={loading}
                          className="text-[11px] font-semibold px-2.5 py-1 bg-white border border-[#c01515]/25 text-[#c01515] rounded-full hover:bg-red-50 hover:border-[#c01515]/50 transition-all flex items-center gap-0.5 disabled:opacity-40"
                        >
                          {qr}
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / loading */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0a1e42] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#c8a951]" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c01515]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c01515]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c01515]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-slate-400 ml-1">TEO está escribiendo...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder={loading ? 'TEO está escribiendo...' : 'Pregunta lo que necesites...'}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>

          {/* Powered by */}
          <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">Impulsado por IA · Tres Estrellas de Oro</p>
          </div>
        </div>
      )}
    </>
  )
}
