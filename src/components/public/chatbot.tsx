'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, ChevronRight } from 'lucide-react'

// ── FAQ Knowledge Base ──────────────────────────────────────────────────────
const FAQS = [
  {
    keywords: ['boleto', 'ticket', 'recibo', 'recibir', 'donde', 'llega', 'manda', 'envian', 'envía', 'correo', 'email'],
    answer: `📧 **Tu boleto llega por correo electrónico** al email que pusiste al comprar, inmediatamente después de confirmar tu reservación.\n\nEl correo incluye:\n• Tu número de reservación\n• Código QR para abordar\n• Detalles del viaje y pasajeros\n\nSi no ves el correo, revisa tu carpeta de **Spam** o **Promociones**.`,
    quickReplies: ['¿Cómo compro?', '¿Puedo cancelar?', '¿Qué es el QR?'],
  },
  {
    keywords: ['comprar', 'compro', 'adquirir', 'reservar', 'reservación', 'como', 'cómo', 'pasos'],
    answer: `🎫 **Comprar tu boleto es muy fácil:**\n\n1. Selecciona tu origen y destino en la página principal\n2. Elige la fecha y número de pasajeros\n3. Selecciona el horario de tu preferencia\n4. Ingresa los datos de los pasajeros\n5. Elige tu asiento en el mapa del bus\n6. Paga con tarjeta o elige efectivo en ventanilla\n7. ¡Listo! Recibes tu boleto por correo al instante`,
    quickReplies: ['¿Dónde recibo mi boleto?', '¿Qué horarios hay?', '¿Cuánto cuesta?'],
  },
  {
    keywords: ['horario', 'horarios', 'salida', 'salidas', 'cuando', 'cuándo', 'horas', 'hora', 'sale', 'salen', 'disponible'],
    answer: `🕐 **Horarios LA → Tijuana:**\n3:20 AM · 5:20 AM · 7:20 AM · 9:20 AM · 11:20 AM · 1:20 PM · 3:20 PM · 5:20 PM · 7:20 PM · 9:20 PM\n\n🕐 **Horarios Tijuana → LA:**\n11:30 AM · 1:30 PM · 3:30 PM · 7:30 PM\n\n📅 Salimos **todos los días del año**, incluyendo días festivos.`,
    quickReplies: ['¿Cuánto cuesta?', '¿Dónde abordo?', '¿Puedo comprar en línea?'],
  },
  {
    keywords: ['precio', 'precios', 'costo', 'cuanto', 'cuánto', 'tarifa', 'tarifas', 'vale', 'cobra', 'cuesta', 'dolares', 'dólares', 'usd'],
    answer: `💵 **Precios aproximados (USD):**\n\n**Los Angeles → San Ysidro**\nAdulto: $45 · Menor (0-11): $40\n\n**Los Angeles → Tijuana/Otay**\nAdulto: $55 · Menor (0-11): $50\n\n**Huntington Park → Tijuana**\nAdulto: $45 · Menor: $40\n\n🎉 **Ida y vuelta: 25% de descuento**\n\nLos precios pueden variar. Verifica el precio exacto al hacer tu reservación.`,
    quickReplies: ['¿Cómo compro?', '¿Qué horarios hay?', '¿Hay descuentos?'],
  },
  {
    keywords: ['qr', 'codigo', 'código', 'escanear', 'validar', 'abordar', 'subir', 'presentar'],
    answer: `📱 **Tu código QR es tu boleto de abordaje.**\n\nAl llegar al autobús, el personal escaneará el código QR de tu correo para verificar tu reservación.\n\nPuedes mostrarlo desde tu:\n• 📱 Celular (abre el correo o el PDF)\n• 🖨️ Impreso en papel\n\n**¡No necesitas imprimir!** El QR digital funciona perfectamente.`,
    quickReplies: ['¿Dónde recibo mi boleto?', '¿Qué llevo al viajar?'],
  },
  {
    keywords: ['cancelar', 'cancelacion', 'cancelación', 'reembolso', 'devolver', 'cambiar', 'cambio'],
    answer: `❓ Para cancelaciones o cambios de fecha, comunícate directamente con nosotros por teléfono:\n\n📞 **(213) 275-1402** — Los Angeles\n📞 **(323) 588-9188** — Huntington Park\n📞 **(619) 428-5512** — San Ysidro\n📞 **(664) 208-8399** — Tijuana\n\nTe atenderemos con gusto para ayudarte con tu reservación.`,
    quickReplies: ['¿Cómo compro?', '¿Dónde están las terminales?'],
  },
  {
    keywords: ['equipaje', 'maleta', 'maletas', 'bulto', 'bultos', 'mochila', 'peso', 'paquete', 'paquetes'],
    answer: `🧳 **Política de equipaje:**\n\n✅ **Gratis:** Equipaje de mano (mochila o bolsa pequeña)\n\n💰 **Con costo adicional:**\n• 1 maleta (hasta 25 kg) — $10\n• 2 maletas (hasta 25 kg c/u) — $18\n• Equipaje extra / artículos grandes — $25\n\n📦 También ofrecemos **servicio de envío de paquetes** entre Los Angeles y Tijuana. Pregunta en ventanilla.`,
    quickReplies: ['¿Cuánto cuesta el boleto?', '¿Dónde abordo?'],
  },
  {
    keywords: ['terminal', 'terminales', 'direccion', 'dirección', 'donde', 'dónde', 'ubicacion', 'ubicación', 'parada', 'paradas', 'abordo', 'abordar'],
    answer: `📍 **Nuestras paradas:**\n\n🔵 **Los Angeles**\nTerminal Central — sal desde LA a Tijuana\n\n🔵 **Huntington Park**\nParada intermedia\n\n🔵 **San Ysidro**\nFrontera EE.UU.\n\n🔵 **Aeropuerto Tijuana**\nMéxico\n\n🔵 **Garita de Otay — Tijuana**\nDestino final México\n\nPuedes ver el mapa de cada terminal en la sección **Terminales** de nuestro sitio.`,
    quickReplies: ['¿Qué horarios hay?', '¿Cuánto cuesta?', '¿Cómo compro?'],
  },
  {
    keywords: ['tiempo', 'duracion', 'duración', 'demora', 'tarda', 'cuanto tiempo', 'viaje', 'horas'],
    answer: `⏱️ **Tiempo aproximado de viaje:**\n\n🚌 **LA → San Ysidro:** ~3 horas\n🚌 **LA → Tijuana:** ~5-6 horas\n🚌 **LA → Otay:** ~5.5-6.5 horas\n\n🚌 **Tijuana → LA:** ~4-5 horas\n\n⚠️ El tiempo puede variar según el tráfico y la espera en la frontera, especialmente en días festivos o fines de semana.`,
    quickReplies: ['¿Qué horarios hay?', '¿Dónde abordo?'],
  },
  {
    keywords: ['efectivo', 'cash', 'ventanilla', 'pagar', 'pago', 'tarjeta', 'credito', 'débito'],
    answer: `💳 **Formas de pago:**\n\n✅ **Tarjeta de débito o crédito** — paga en línea al reservar\n✅ **Efectivo en ventanilla** — reserva en línea y paga al llegar a la terminal\n\nSi eliges efectivo, tu reservación queda confirmada y recibes tu boleto por correo. Solo debes pagar el monto antes de abordar.`,
    quickReplies: ['¿Cómo compro?', '¿Cuánto cuesta?'],
  },
  {
    keywords: ['puntos', 'lealtad', 'programa', 'beneficios', 'recompensas', 'acumular'],
    answer: `⭐ **Programa de puntos TEO:**\n\nCada dólar que pagas equivale a **1 punto**.\n\nAcumula puntos y sube de nivel:\n🥉 Bronce → 🥈 Plata → 🥇 Oro → 💎 Platino\n\nLos puntos y beneficios de nivel se activan al crear una cuenta. Los clientes invitados también acumulan puntos en cada viaje.`,
    quickReplies: ['¿Cómo compro?', '¿Cuánto cuesta?'],
  },
  {
    keywords: ['wifi', 'internet', 'servicios', 'amenidades', 'comodidades', 'baño', 'ac', 'aire'],
    answer: `🚌 **Servicios a bordo:**\n\n✅ Wi-Fi gratuito\n✅ Aire acondicionado\n✅ Baño en el autobús\n✅ Asientos reclinables\n✅ Puertos USB\n✅ Seguridad y comodidad\n\nViaja cómodo y conectado en cada trayecto.`,
    quickReplies: ['¿Qué horarios hay?', '¿Cuánto cuesta?'],
  },
  {
    keywords: ['contacto', 'telefono', 'teléfono', 'llamar', 'comunicar', 'whatsapp', 'ayuda', 'soporte'],
    answer: `📞 **Contáctanos:**\n\n🇺🇸 **(213) 275-1402** — Los Angeles\n🇺🇸 **(323) 588-9188** — Huntington Park\n🇺🇸 **(619) 428-5512** — San Ysidro\n🇲🇽 **(664) 208-8399** — Tijuana\n\nEstamos disponibles todos los días. ¡Con gusto te ayudamos!`,
    quickReplies: ['¿Cómo compro?', '¿Dónde están las terminales?'],
  },
  {
    keywords: ['niño', 'niños', 'menor', 'menores', 'bebe', 'bebé', 'infantil', 'hijo', 'hijos'],
    answer: `👶 **Viaje con menores:**\n\n• Los niños de **0 a 11 años** tienen tarifa de menor (~$5-10 menos que adulto)\n• Los menores deben viajar acompañados de un adulto\n• Se debe ingresar el nombre completo del menor al comprar\n\n¿Necesitas ayuda para reservar? Llámanos al **(213) 275-1402**.`,
    quickReplies: ['¿Cuánto cuesta?', '¿Cómo compro?'],
  },
]

const WELCOME = `¡Hola! 👋 Soy el asistente virtual de **Tres Estrellas de Oro**.\n\n¿En qué puedo ayudarte hoy?`

const QUICK_TOPICS = [
  '¿Cómo compro mi boleto?',
  '¿Dónde recibo mi boleto?',
  '¿Qué horarios tienen?',
  '¿Cuánto cuesta?',
  '¿Dónde están las terminales?',
  '¿Puedo cancelar?',
]

const FALLBACK = `Lo siento, no encontré información exacta sobre eso 😅\n\nPuedes llamarnos directamente:\n📞 **(213) 275-1402** — Los Angeles\n📞 **(664) 208-8399** — Tijuana\n\nO prueba preguntando sobre: horarios, precios, equipaje, boletos o terminales.`

// ── Helpers ───────────────────────────────────────────────────────────────
function findAnswer(text: string): { answer: string; quickReplies: string[] } {
  const normalized = text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,]/g, '')

  for (const faq of FAQS) {
    if (faq.keywords.some(kw => normalized.includes(kw))) {
      return { answer: faq.answer, quickReplies: faq.quickReplies }
    }
  }
  return { answer: FALLBACK, quickReplies: ['¿Cómo compro?', '¿Qué horarios tienen?', 'Contacto'] }
}

function formatText(text: string) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return <span key={i} dangerouslySetInnerHTML={{ __html: bold + (i < text.split('\n').length - 1 ? '<br/>' : '') }} />
  })
}

// ── Types ─────────────────────────────────────────────────────────────────
interface Message {
  id: number
  role: 'bot' | 'user'
  text: string
  quickReplies?: string[]
}

// ── Component ─────────────────────────────────────────────────────────────
export function Chatbot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'bot', text: WELCOME, quickReplies: QUICK_TOPICS },
  ])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const [unread, setUnread]   = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const { answer, quickReplies } = findAnswer(text)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: answer, quickReplies }])
      setTyping(false)
      if (!open) setUnread(n => n + 1)
    }, 600 + Math.random() * 400)
  }

  return (
    <>
      {/* Bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#c01515] hover:bg-[#a01010] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Abrir chat"
      >
        {open
          ? <X className="w-6 h-6" />
          : <MessageCircle className="w-6 h-6" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f0b429] text-[#0a1628] text-[10px] font-black rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)', height: 520 }}>

          {/* Header */}
          <div className="bg-[#0a1e42] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#c01515] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Asistente TEO</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-white/50 text-xs">En línea ahora</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-[#0a1e42] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#c8a951]" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[80%]">
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#c01515] text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {formatText(msg.text)}
                  </div>

                  {/* Quick replies */}
                  {msg.role === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.quickReplies.map(qr => (
                        <button key={qr} onClick={() => sendMessage(qr)}
                          className="text-[11px] font-semibold px-2.5 py-1 bg-white border border-[#c01515]/30 text-[#c01515] rounded-full hover:bg-red-50 transition-colors flex items-center gap-0.5">
                          {qr}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0a1e42] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#c8a951]" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Escribe tu pregunta..."
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] placeholder:text-slate-400"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="w-10 h-10 bg-[#c01515] hover:bg-[#a01010] disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
