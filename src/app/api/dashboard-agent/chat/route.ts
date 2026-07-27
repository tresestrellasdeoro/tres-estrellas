import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'

function extractJSON(text: string): any {
  // Extract the first {...} block from the model's text output
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Real-time stats ────────────────────────────────────────────────────────────

async function fetchAdminStats() {
  const db  = svc()
  const mes = new Date().toISOString().slice(0, 7)

  const [txRes, cierresRes, gastosRes, ticketsRes] = await Promise.all([
    db.from('qb_transactions').select('amount, type').gte('created_at', `${mes}-01`).limit(500),
    db.from('cierres_de_turno').select('total_general, total_efectivo, total_tarjeta, total_boletos, qb_synced, sucursales(name, code)').gte('fecha', `${mes}-01`).limit(200) as any,
    db.from('gastos').select('amount, qb_synced').gte('date', `${mes}-01`).limit(200) as any,
    db.from('support_tickets').select('status').neq('status', 'cerrada').limit(100) as any,
  ])

  const tx      = (txRes.data ?? []) as any[]
  const cierres = (cierresRes.data ?? []) as any[]
  const gastos  = (gastosRes.data ?? []) as any[]
  const tickets = (ticketsRes.data ?? []) as any[]

  const ingresos    = tx.filter(t => t.type === 'sales_receipt').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const gastoQB     = tx.filter(t => t.type === 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const gastosTotal = gastos.reduce((s: number, g: any) => s + Number(g.amount ?? 0), 0)
  const openTickets = tickets.filter((t: any) => ['abierta', 'en_revision'].includes(t.status)).length
  const pendQB      = cierres.filter((c: any) => !c.qb_synced).length

  const bySuc: Record<string, { boletos: number; total: number }> = {}
  cierres.forEach((c: any) => {
    const k = c.sucursales?.code ?? 'N/A'
    if (!bySuc[k]) bySuc[k] = { boletos: 0, total: 0 }
    bySuc[k].boletos += c.total_boletos ?? 0
    bySuc[k].total   += Number(c.total_general ?? 0)
  })
  const sucLines = Object.entries(bySuc)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([code, d]) => `${code}: $${d.total.toFixed(2)} (${d.boletos} boletos)`)
    .join(' | ') || 'sin datos'

  return {
    ingresos:    ingresos.toFixed(2),
    gastos:      gastosTotal.toFixed(2),
    gastoQB:     gastoQB.toFixed(2),
    utilidad:    (ingresos - gastoQB).toFixed(2),
    cierres:     cierres.length,
    pendQB,
    openTickets,
    sucLines,
    mes: new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
  }
}

// ── Prompts ────────────────────────────────────────────────────────────────────

function buildSystemPrompt(
  name: string, role: string, isAdm: boolean,
  stats: any, sucursal: { name: string; code: string } | null, permisos: string[]
): string {

  if (isAdm) {
    const s = stats ?? {}
    return `Eres TEOBOT, el asistente IA interno de Tres Estrellas de Oro Inc.
Usuario activo: ${name} (${role === 'super_admin' ? 'Super Admin' : 'Admin'}) — acceso total al sistema.

━ DATOS REALES ${s.mes ? `DE ${s.mes.toUpperCase()}` : 'DEL MES'} ━
Ingresos: $${s.ingresos ?? '0.00'} | Gastos: $${s.gastos ?? '0.00'} | Utilidad: $${s.utilidad ?? '0.00'}
Cierres registrados: ${s.cierres ?? 0} (${s.pendQB ?? 0} pendientes de sincronizar a QuickBooks)
Tickets de soporte abiertos: ${s.openTickets ?? 0}
Ventas por sucursal: ${s.sucLines ?? 'sin datos'}

━ SECCIONES DEL SISTEMA ━
/admin/dashboard — KPIs, ventas del día, alertas
/admin/buses — flota: agregar/editar autobuses
/admin/rutas — rutas origen-destino con paradas
/admin/horarios — horarios de salida por ruta
/admin/corridas — viajes programados: bus + chofer + ruta + fecha
/admin/choferes — registro y asignación de choferes
/admin/clientes — base de clientes, historial, puntos TEO
/admin/reportes — ventas por fecha/ruta/sucursal, exportar CSV
/admin/analitica — gráficas de tendencias y proyecciones
/admin/terminales — puntos de venta, cajeros activos, turnos
/admin/contabilidad — P&L, gastos, cierres de turno, QuickBooks, presupuesto
/admin/personal — empleados: roles, permisos, sucursal asignada
/admin/paquetes — envíos LA↔TJ
/admin/sucursales — configurar sucursales y cuentas QuickBooks
/admin/configuracion — ajustes globales del sistema
/admin/soporte — tickets de incidencias del personal

━ CÓMO HACER TAREAS ━
AGREGAR BUS → /admin/buses → "Nuevo autobús" → placa, marca, modelo, año, capacidad, amenidades → Guardar
CREAR RUTA → /admin/rutas → "Nueva ruta" → nombre, origen, destino, paradas intermedias → Guardar
CREAR HORARIO → /admin/horarios → "Nuevo horario" → seleccionar ruta, hora de salida, días → Guardar
CREAR CORRIDA → /admin/corridas → "Nueva corrida" → ruta + horario + bus + chofer + fecha → Guardar
AGREGAR CHOFER → /admin/choferes → "Nuevo chofer" → nombre, número de licencia, teléfono → Guardar
AGREGAR EMPLEADO → /admin/personal → "Nuevo empleado" → nombre, email, rol (cajero/admin/chofer), permisos, sucursal → Guardar
VER TURNOS → /admin/terminales (turnos activos) o /admin/contabilidad pestaña "Cierres de turno"
VER VENTAS → /admin/reportes (tablas y CSV) o /admin/analitica (gráficas)
CONTABILIDAD → /admin/contabilidad → pestañas: P&L / Gastos / Cierres / QuickBooks / Presupuesto
CONFIGURAR QB → /admin/sucursales → seleccionar sucursal → configurar cuentas QuickBooks

━ INSTRUCCIONES DE COMPORTAMIENTO ━
- Si el usuario pregunta por datos financieros (ventas, ingresos, gastos, cierres), usa los DATOS REALES de arriba y responde con los números exactos.
- Si el usuario pregunta cómo hacer algo, da los pasos numerados con la ruta exacta.
- Si el usuario saluda o hace pregunta general, responde brevemente y ofrece ayuda concreta.
- Si no entiendes la pregunta, pide clarificación en una sola oración.
- Responde siempre en español. Sin saludos largos. Sin frases de relleno.

━ FORMATO DE RESPUESTA ━
Responde SIEMPRE con un bloque JSON con esta estructura exacta:
{"answer":"respuesta aquí, usa \\n para saltos y **texto** para negrita","quickReplies":["sugerencia breve 1","sugerencia breve 2"],"links":[{"label":"Ir a X","href":"/admin/ruta"}],"openSupport":false}

Regla crítica: el campo "answer" debe contener la respuesta REAL a la pregunta del usuario, no frases genéricas como "¿En qué puedo ayudarte?" o "¿En qué te puedo asistir?". Si el usuario pregunta cómo hacer algo, explícalo. Si pregunta datos, dálos.`
  }

  // ── Staff ──────────────────────────────────────────────────────────────────
  const hasAll   = permisos.includes('all')
  const canVenta = hasAll || permisos.includes('ventas')
  const canCheck = hasAll || permisos.includes('checkin')
  const canPaq   = hasAll || permisos.includes('paquetes')

  return `Eres TEOBOT, el asistente IA interno de Tres Estrellas de Oro Inc.
Usuario: ${name} | Rol: ${role === 'cajero' ? 'Cajero' : role} | Sucursal: ${sucursal ? sucursal.name : 'sin asignar'}
Permisos: ${hasAll ? 'todos' : [canVenta && 'ventas', canCheck && 'checkin', canPaq && 'paquetes'].filter(Boolean).join(', ') || 'solo turno'}

━ SECCIONES DISPONIBLES ━
/personal/turno — iniciar y cerrar turno de trabajo
${canVenta ? '/personal/venta — vender boleto a pasajero en ventanilla\n' : ''
}${canCheck ? '/personal/validar — escanear QR de pasajero para abordaje\n/personal/reservaciones — lista de pasajeros del día\n/personal/salidas — corridas y estado de cada salida\n' : ''
}${canPaq ? '/personal/paquetes — registrar y entregar envíos LA↔TJ\n' : ''
}${canVenta ? '/personal/gastos — registrar gastos operativos\n' : ''
}/personal/soporte — crear tickets de incidencias

━ CÓMO HACER TAREAS ━
INICIAR TURNO → /personal/turno → "Iniciar turno" → el sistema registra la hora automáticamente
CERRAR TURNO → /personal/turno → "Cerrar turno" → ingresar efectivo recibido + total tarjeta + boletos vendidos → confirmar
VENDER BOLETO → /personal/venta → elegir ruta → horario → nombre del pasajero → seleccionar asiento → cobrar (efectivo o tarjeta) → confirmar (el cliente recibe QR por email)
VALIDAR BOLETO → /personal/validar → escanear QR con la cámara o ingresar el código manual → confirmar abordaje
VER PASAJEROS → /personal/reservaciones → lista de boletos del día con nombre, ruta y estado
REGISTRAR GASTO → /personal/gastos → "Nuevo gasto" → categoría + monto + proveedor + foto de recibo → guardar
REPORTAR PROBLEMA → /personal/soporte → "Nueva incidencia" → describir el problema → enviar

━ INSTRUCCIONES ━
- Responde la pregunta directamente con los pasos si aplica.
- Si el usuario saluda, responde brevemente y pregunta en qué puedes ayudar.
- Si pide algo fuera de sus permisos, díselo claramente.
- Responde en español. Sin relleno.

━ FORMATO DE RESPUESTA ━
Responde SIEMPRE con un bloque JSON:
{"answer":"respuesta real aquí, usa \\n para saltos y **texto** para negrita","quickReplies":["sugerencia 1","sugerencia 2"],"links":[{"label":"Ir a X","href":"/personal/ruta"}],"openSupport":false}

El campo "answer" debe responder la pregunta concretamente. Nunca uses "¿En qué puedo ayudarte?" como answer.`
}


// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: { role: string; content: string }[] }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userProfile = { name: 'Administrador', role: 'super_admin', permisos: ['all'], sucursal: null as { name: string; code: string } | null }

    if (user) {
      const { data: profile } = await svc()
        .from('profiles')
        .select('full_name, email, role, permisos, sucursal_id, sucursales(name, code)')
        .eq('id', user.id)
        .maybeSingle() as { data: any }

      if (profile) {
        userProfile = {
          name:     profile.full_name || profile.email?.split('@')[0] || 'Usuario',
          role:     profile.role ?? 'cajero',
          permisos: profile.permisos ?? [],
          sucursal: profile.sucursales ?? null,
        }
      }
    } else {
      const cookieStore = await cookies()
      const session     = cookieStore.get('admin_session')
      if (!session?.value) {
        return NextResponse.json({
          answer: 'El agente IA está en mantenimiento. Navega manualmente al dashboard.',
          quickReplies: [], links: [], openSupport: false,
        })
      }
    }

    const isAdm = ['admin', 'super_admin', 'developer'].includes(userProfile.role)

    const stats   = isAdm ? await fetchAdminStats().catch(() => null) : null
    const sysPrompt = buildSystemPrompt(
      userProfile.name, userProfile.role, isAdm,
      stats as any, userProfile.sucursal, userProfile.permisos,
    )

    const apiKey = process.env.GROQ_DASHBOARD_KEY
    if (!apiKey) {
      return NextResponse.json({
        answer: 'El agente IA está en mantenimiento. Usa el botón Reportar para soporte.',
        quickReplies: [], links: [{ label: 'Dashboard', href: '/admin/dashboard' }], openSupport: false,
      })
    }

    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       MODEL,
        messages: [
          { role: 'system', content: sysPrompt },
          ...messages.slice(-12),
        ],
        temperature: 0.6,
        max_tokens:  800,
      }),
    })

    if (!res.ok) {
      console.error('Groq error:', await res.text())
      return NextResponse.json({
        answer: 'Tuve un problema al conectarme. Intenta de nuevo.',
        quickReplies: [], links: [], openSupport: false,
      })
    }

    const data   = await res.json()
    const raw    = data.choices?.[0]?.message?.content ?? ''
    const parsed = extractJSON(raw) ?? { answer: raw || 'No pude generar una respuesta.' }

    return NextResponse.json({
      answer:       parsed.answer       ?? raw,
      quickReplies: parsed.quickReplies ?? [],
      links:        parsed.links        ?? [],
      openSupport:  parsed.openSupport  ?? false,
    })
  } catch (err) {
    console.error('Dashboard agent error:', err)
    return NextResponse.json({
      answer: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
      quickReplies: [], links: [], openSupport: false,
    })
  }
}
