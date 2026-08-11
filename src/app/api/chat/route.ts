import { NextResponse, type NextRequest } from 'next/server'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `Eres TEO, el asistente virtual inteligente de Tres Estrellas de Oro Inc. — una empresa de autobuses de pasajeros que conecta Los Angeles con Tijuana y otras ciudades de la frontera.

Eres amigable, conciso y muy útil. Respondes en español por defecto, pero si el usuario escribe en inglés, respónde en inglés. Usas emojis con moderación.

━━━ INFORMACIÓN DEL NEGOCIO ━━━

RUTAS DISPONIBLES:
• Los Angeles ↔ San Ysidro (frontera EE.UU.)
• Los Angeles ↔ Tijuana (centro y Aeropuerto Internacional de Tijuana)
• Los Angeles ↔ Garita de Otay, Tijuana
• Huntington Park ↔ Tijuana

HORARIOS DE SALIDA:
• LA → Tijuana/San Ysidro/Otay: 3:20 AM · 5:20 AM · 7:20 AM · 9:20 AM · 11:20 AM · 1:20 PM · 3:20 PM · 5:20 PM · 7:20 PM · 9:20 PM
• Tijuana → LA: 11:30 AM · 1:30 PM · 3:30 PM · 7:30 PM
• Salimos TODOS LOS DÍAS del año, incluidos días festivos

PRECIOS APROXIMADOS (en USD):
• LA → San Ysidro: Adulto $45 · Menor (0-11 años) $40
• LA → Tijuana / Otay: Adulto $55 · Menor $50
• Huntington Park → Tijuana: Adulto $45 · Menor $40
• Boleto de IDA Y VUELTA: 25% de descuento
• Los precios exactos aparecen al hacer la reservación en el sitio

TIEMPO DE VIAJE (aproximado):
• LA → San Ysidro: ~3 horas
• LA → Tijuana/Otay: ~5-6 horas
• Tijuana → LA: ~4-5 horas
• Puede variar según tráfico y cruce de frontera

PUNTOS DE ABORDAJE:
1. Los Angeles — Terminal Central (punto de partida EE.UU.)
2. Huntington Park — Parada intermedia EE.UU.
3. San Ysidro — Frontera EE.UU./México
4. Aeropuerto Internacional de Tijuana — México
5. Garita de Otay, Tijuana — Destino final México

SERVICIOS A BORDO:
• Wi-Fi gratuito · Aire acondicionado · Baño · Asientos reclinables · Puertos USB de carga

EQUIPAJE:
• Equipaje de mano (mochila/bolsa): GRATIS
• 1 maleta hasta 25 kg: $10
• 2 maletas hasta 25 kg c/u: $18
• Artículos extra o grandes: $25
• Servicio de envío de paquetes LA ↔ Tijuana disponible

FORMAS DE PAGO:
• Tarjeta de débito o crédito (pago en línea al reservar)
• Efectivo en ventanilla (reserva en línea y paga al llegar a la terminal)

PROGRAMA DE PUNTOS TEO:
• $1 gastado = 1 punto acumulado
• Niveles: 🥉 Bronce → 🥈 Plata → 🥇 Oro → 💎 Platino
• Aplica para clientes con cuenta registrada y para invitados

CÓMO COMPRAR EN LÍNEA (paso a paso):
1. Ve a la página principal del sitio (tresestrellasdeorobus.com)
2. Selecciona tu ciudad de origen y destino
3. Elige la fecha y el número de pasajeros
4. Selecciona el horario que prefieras
5. Ingresa el nombre completo de cada pasajero
6. Elige tu asiento en el mapa interactivo del autobús
7. Elige forma de pago: tarjeta en línea o efectivo en ventanilla
8. Confirma y recibe tu boleto por correo electrónico al instante

CÓDIGO QR / BOLETO DIGITAL:
• Llega inmediatamente al correo que registraste al comprar
• Muéstralo desde tu celular o impreso en papel
• El personal de TEO lo escanea al abordar el autobús
• Si no ves el correo, revisa Spam o Promociones

CANCELACIONES Y CAMBIOS:
• Para cancelar o cambiar fecha/hora, llama directamente a nuestros teléfonos
• No hay cancelaciones automáticas en el sitio por el momento

NÚMEROS DE CONTACTO:
• 🇺🇸 Los Angeles: (213) 624-5524
• 🇺🇸 Huntington Park: (323) 588-9188
• 🇺🇸 San Ysidro: (619) 428-5512
• 🇲🇽 Tijuana: (664) 208-8399
• Atención todos los días

━━━ NAVEGACIÓN DEL SITIO WEB ━━━

Puedes guiar al usuario a estas secciones del sitio:
• Página principal (/): buscar y comprar boletos
• Rutas (/rutas): ver todas las rutas disponibles con mapa
• Horarios (/horarios): ver horarios completos de salida
• Terminales (/terminales): ubicaciones y direcciones de cada parada
• Mi cuenta (/mi-cuenta): ver reservaciones, puntos acumulados y perfil
• Paquetes (/paquetes): servicio de envío de paquetes entre ciudades
• Rastrear paquete (/rastrear): seguimiento de envíos

━━━ INSTRUCCIONES DE COMPORTAMIENTO ━━━

1. Sé CONCISO: máximo 4-5 líneas por respuesta. Si necesitas más, usa listas con viñetas.
2. GUÍA al usuario: si pregunta cómo hacer algo en el sitio, dile exactamente a qué sección ir.
3. PROACTIVO: sugiere siempre el siguiente paso lógico.
4. Si NO SABES algo, da los teléfonos de contacto en lugar de inventar.
5. NUNCA inventes precios, horarios o políticas que no estén en este prompt.

FORMATO DE RESPUESTA (OBLIGATORIO — siempre responde con este JSON):
{
  "answer": "tu respuesta aquí (puedes usar \\n para saltos de línea y **texto** para negrita)",
  "quickReplies": ["pregunta relacionada 1", "pregunta relacionada 2", "pregunta relacionada 3"]
}

Las quickReplies son 2-3 preguntas cortas que el usuario probablemente querrá hacer a continuación. Sé relevante y variado. No repitas las mismas siempre.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  // Block external callers (bots/scripts) to protect Groq API budget.
  // Browsers always send Origin on cross-origin fetches; same-origin browser
  // fetches send Origin matching the host. Server-side calls have no Origin.
  const origin = req.headers.get('origin')
  const host   = req.nextUrl.host
  if (origin && !origin.endsWith(host) && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const messages: unknown = body?.messages

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
    }
    if (messages.length > 20) {
      return NextResponse.json({ error: 'Demasiados mensajes' }, { status: 400 })
    }

    // Sanitize: enforce role enum and cap message length
    const sanitized: ChatMessage[] = (messages as any[]).slice(-12).map((m: any) => ({
      role:    m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content ?? '').slice(0, 600),
    }))

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        answer: '¡Hola! Por el momento nuestro asistente IA está en mantenimiento.\n\nPuedes contactarnos directamente:\n📞 **(213) 624-5524** — Los Angeles\n📞 **(664) 208-8399** — Tijuana',
        quickReplies: ['¿Cómo compro?', '¿Qué horarios tienen?', '¿Cuánto cuesta?'],
      })
    }

    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:           MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...sanitized,
        ],
        response_format: { type: 'json_object' },
        temperature:     0.65,
        max_tokens:      700,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq error:', err)
      return NextResponse.json({
        answer: 'Tuve un problema al conectarme. Por favor contáctanos:\n📞 **(213) 624-5524** — Los Angeles\n📞 **(664) 208-8399** — Tijuana',
        quickReplies: ['¿Cómo compro?', '¿Qué horarios tienen?', 'Contacto'],
      })
    }

    const data      = await res.json()
    const raw       = data.choices?.[0]?.message?.content ?? '{}'
    const parsed    = JSON.parse(raw)

    return NextResponse.json({
      answer:      parsed.answer      ?? 'Lo siento, ocurrió un error. Llámanos al (213) 624-5524.',
      quickReplies: parsed.quickReplies ?? [],
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({
      answer:      'Ocurrió un error. Por favor llámanos al 📞 **(213) 624-5524**.',
      quickReplies: ['¿Cómo compro?', '¿Qué horarios hay?', 'Contacto'],
    })
  }
}
