import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Fetch real-time stats for admin context ───────────────────────────────────

async function fetchAdminStats() {
  const db  = svc()
  const mes = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [txRes, cierresRes, gastosRes, ticketsRes] = await Promise.all([
    db.from('qb_transactions')
      .select('amount, type, description')
      .gte('created_at', `${mes}-01`)
      .limit(500),
    db.from('cierres_de_turno')
      .select('total_general, total_efectivo, total_tarjeta, total_boletos, qb_synced, sucursales(name, code)')
      .gte('fecha', `${mes}-01`)
      .limit(200) as any,
    db.from('gastos')
      .select('amount, category, qb_synced, sucursales(name, code)')
      .gte('date', `${mes}-01`)
      .limit(200) as any,
    db.from('support_tickets')
      .select('status')
      .neq('status', 'cerrada')
      .limit(100) as any,
  ])

  const tx        = (txRes.data ?? []) as any[]
  const cierres   = (cierresRes.data ?? []) as any[]
  const gastos    = (gastosRes.data ?? []) as any[]
  const tickets   = (ticketsRes.data ?? []) as any[]

  const ingresos  = tx.filter(t => t.type === 'sales_receipt').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const gastoQB   = tx.filter(t => t.type === 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0)

  // Group cierres by sucursal
  const bySuc: Record<string, { boletos: number; total: number }> = {}
  cierres.forEach((c: any) => {
    const key = c.sucursales?.code ?? 'SIN SUCURSAL'
    if (!bySuc[key]) bySuc[key] = { boletos: 0, total: 0 }
    bySuc[key].boletos += c.total_boletos ?? 0
    bySuc[key].total   += Number(c.total_general ?? 0)
  })

  const sucLines = Object.entries(bySuc)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([code, d]) => `  • ${code}: $${d.total.toFixed(2)} (${d.boletos} boletos)`)
    .join('\n')

  const gastosTotal = gastos.reduce((s: number, g: any) => s + Number(g.amount ?? 0), 0)
  const pendQB      = cierres.filter((c: any) => !c.qb_synced).length
  const pendGastos  = gastos.filter((g: any) => !g.qb_synced).length
  const openTickets = tickets.filter((t: any) => t.status === 'abierta' || t.status === 'en_revision').length

  return `
DATOS EN TIEMPO REAL — ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}:
• Ingresos totales del mes: $${ingresos.toFixed(2)}
• Gastos registrados del mes: $${gastosTotal.toFixed(2)}
• Gastos en QB: $${gastoQB.toFixed(2)}
• Utilidad estimada: $${(ingresos - gastoQB).toFixed(2)}
• Cierres del mes: ${cierres.length} (${pendQB} pendientes QB)
• Gastos pendientes QB: ${pendGastos}
• Tickets de soporte abiertos: ${openTickets}
Ventas por sucursal este mes:
${sucLines || '  (sin datos)'}
`.trim()
}

// ── System prompts by role ─────────────────────────────────────────────────────

function buildAdminPrompt(name: string, role: string, stats: string): string {
  return `Eres TEOBOT, el agente IA interno de Tres Estrellas de Oro Inc. Tu misión es guiar a los administradores del sistema, responder preguntas sobre el dashboard y el negocio, y ayudar a resolver problemas.

USUARIO ACTUAL:
• Nombre: ${name}
• Rol: ${role === 'super_admin' ? 'Super Administrador' : role === 'developer' ? 'Desarrollador' : 'Administrador'}
• Acceso: Total

${stats}

━━━ SECCIONES DEL DASHBOARD ADMIN ━━━

1. /admin/dashboard — Vista general: KPIs del día, ventas recientes, alertas
2. /admin/corridas — Corridas/viajes: crear, editar, ver pasajeros por viaje
3. /admin/choferes — Choferes: agregar chofer, asignar a corrida, documentos
4. /admin/rutas — Rutas: crear rutas origen-destino, paradas, distancia
5. /admin/horarios — Horarios: definir horarios de salida por ruta
6. /admin/buses — Flota de autobuses: agregar bus, placa, capacidad, amenidades
7. /admin/clientes — Clientes: ver base de clientes, historial de compras, puntos
8. /admin/reportes — Reportes: ventas por período, por ruta, por sucursal, CSV
9. /admin/analitica — Analítica avanzada: tendencias, proyecciones, gráficas
10. /admin/terminales — Puntos de Venta: gestión de cajeros y turnos por sucursal
11. /admin/contabilidad — Contabilidad: P&L, gastos, cierres de turno, QuickBooks, presupuesto por sucursal
12. /admin/personal — Personal: empleados, roles, permisos, sucursal asignada
13. /admin/paquetes — Paquetes: envíos, rastreo, tarifas
14. /admin/sucursales — Sucursales: configurar cuentas QB, datos de cada sucursal
15. /admin/configuracion — Configuración: ajustes generales del sistema, email, pagos
16. /admin/soporte — Soporte: tickets de incidencias del personal

━━━ CÓMO HACER TAREAS COMUNES ━━━

AGREGAR UN BUS: /admin/buses → botón "Nuevo autobús" → llenar placa, modelo, marca, año, capacidad
AGREGAR CHOFER: /admin/choferes → "Nuevo chofer" → nombre, licencia, teléfono
CREAR CORRIDA: /admin/corridas → "Nueva corrida" → seleccionar ruta, horario, bus y chofer
CREAR RUTA: /admin/rutas → "Nueva ruta" → origen, destino, paradas intermedias
VER VENTAS: /admin/reportes o /admin/analitica
VER CONTABILIDAD: /admin/contabilidad → filtrar por sucursal y mes
AGREGAR EMPLEADO: /admin/personal → "Nuevo empleado" → nombre, email, rol, permisos, sucursal
CONFIGURAR QB: /admin/sucursales → seleccionar sucursal → configurar cuentas QuickBooks
VER CIERRES: /admin/contabilidad → pestaña "Cierres de turno"

━━━ INSTRUCCIONES ━━━

1. VE DIRECTO AL PUNTO — el saludo ya fue dado. Responde la pregunta inmediatamente sin preámbulos.
2. Responde de forma CONCISA — máximo 4-5 líneas, usa listas numeradas si hay pasos
3. Siempre incluye el enlace (href) cuando guíes a una sección
4. Puedes responder preguntas financieras usando los DATOS EN TIEMPO REAL de arriba
5. Si el usuario reporta un problema técnico, sugiere abrirlo como ticket de soporte
6. Responde en español siempre
7. NUNCA empieces con "Hola", "Bienvenido" ni saludos — responde la pregunta directamente

FORMATO DE RESPUESTA (SIEMPRE JSON):
{
  "answer": "respuesta aquí (usa \\n para saltos de línea, **texto** para negrita)",
  "quickReplies": ["pregunta relacionada 1", "pregunta relacionada 2"],
  "links": [{"label": "Nombre del botón", "href": "/admin/ruta"}],
  "openSupport": false
}

• links: array de hasta 3 enlaces relevantes a la respuesta. [] si no aplica.
• openSupport: true SOLO si el usuario quiere reportar un problema/bug.`
}

function buildStaffPrompt(name: string, role: string, permisos: string[], sucursal: { name: string; code: string } | null): string {
  const hasAll   = permisos.includes('all')
  const canVenta = hasAll || permisos.includes('ventas')
  const canCheck = hasAll || permisos.includes('checkin')
  const canPaq   = hasAll || permisos.includes('paquetes')

  const sections: string[] = [
    '• /personal/turno — Mi turno: iniciar o cerrar turno, ver resumen del turno activo',
  ]
  if (canVenta) sections.push('• /personal/venta — Nueva venta: registrar venta de boleto en ventanilla')
  if (canCheck) sections.push('• /personal/validar — Validar boleto: escanear QR de pasajeros al abordar')
  if (canCheck) sections.push('• /personal/reservaciones — Pasajeros de hoy: lista de pasajeros del día')
  if (canCheck) sections.push('• /personal/salidas — Salidas: ver corridas y estado de cada salida')
  if (canPaq)   sections.push('• /personal/paquetes — Paquetes: registrar envíos y entregas')
  if (canVenta) sections.push('• /personal/gastos — Gastos: registrar gastos operativos con foto de recibo')
  sections.push('• /personal/soporte — Mis incidencias: ver y crear tickets de soporte')

  return `Eres TEOBOT, el asistente IA interno de Tres Estrellas de Oro Inc. Tu misión es guiar a ${name} en su trabajo diario.

USUARIO ACTUAL:
• Nombre: ${name}
• Rol: ${role === 'cajero' ? 'Cajero / Punto de venta' : role}
• Sucursal: ${sucursal ? `${sucursal.name} (${sucursal.code})` : 'Sin asignar'}
• Permisos: ${hasAll ? 'Completos' : permisos.join(', ') || 'Solo turno'}

SECCIONES DISPONIBLES PARA ${name.toUpperCase()}:
${sections.join('\n')}

CÓMO HACER TAREAS COMUNES:
• INICIAR TURNO: /personal/turno → "Iniciar turno" → se registra hora de entrada
• CERRAR TURNO: /personal/turno → "Cerrar turno" → ingresar efectivo, tarjeta, boletos del día
• VENDER BOLETO: /personal/venta → seleccionar ruta, horario, pasajeros → cobrar
• VALIDAR BOLETO: /personal/validar → escanear QR del cliente o ingresar código
• VER PASAJEROS: /personal/reservaciones → muestra lista de boletos del día actual
• REGISTRAR GASTO: /personal/gastos → categoría, monto, proveedor, foto de recibo
• REPORTAR PROBLEMA: /personal/soporte → "Nueva incidencia"

RESTRICCIONES IMPORTANTES:
• NO tienes acceso a reportes financieros globales ni de otras sucursales
• NO puedes ver datos de otros cajeros o empleados
• Si preguntas sobre algo que no tienes permiso, te diré claramente que está fuera de tu acceso

INSTRUCCIONES:
1. VE DIRECTO AL PUNTO — el saludo ya fue dado. Responde la pregunta sin preámbulos.
2. Responde de forma CONCISA y práctica — máximo 4-5 líneas
3. Siempre incluye el enlace (href) cuando guíes a una sección
4. Si hay un problema técnico, ofrece abrir un ticket de soporte
5. Responde en español siempre
6. NUNCA empieces con "Hola", "Bienvenido" ni saludos — responde directo

FORMATO DE RESPUESTA (SIEMPRE JSON):
{
  "answer": "respuesta (\\n para saltos, **texto** para negrita)",
  "quickReplies": ["pregunta 1", "pregunta 2"],
  "links": [{"label": "Nombre botón", "href": "/personal/ruta"}],
  "openSupport": false
}

• links: hasta 3 enlaces relevantes. [] si no aplica.
• openSupport: true SOLO si el usuario quiere reportar un problema técnico.`
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: { role: string; content: string }[] }

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userProfile: {
      name: string; role: string; permisos: string[]; sucursal: { name: string; code: string } | null
    } = { name: 'Administrador', role: 'super_admin', permisos: ['all'], sucursal: null }

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
      // Check admin_session cookie
      const cookieStore = await cookies()
      const session     = cookieStore.get('admin_session')
      if (!session?.value) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
      }
    }

    const isAdmin = ['admin', 'super_admin', 'developer'].includes(userProfile.role)

    // Build system prompt
    let systemPrompt: string
    if (isAdmin) {
      const stats = await fetchAdminStats().catch(() => 'No disponible en este momento.')
      systemPrompt = buildAdminPrompt(userProfile.name, userProfile.role, stats)
    } else {
      systemPrompt = buildStaffPrompt(
        userProfile.name,
        userProfile.role,
        userProfile.permisos,
        userProfile.sucursal,
      )
    }

    const apiKey = process.env.GROQ_DASHBOARD_KEY
    if (!apiKey) {
      return NextResponse.json({
        answer:       'El agente IA está en mantenimiento. Para ayuda, usa el botón **Reportar** o navega manualmente al dashboard.',
        quickReplies: ['Ir al Dashboard', 'Reportar problema'],
        links:        [{ label: 'Dashboard', href: '/admin/dashboard' }],
        openSupport:  false,
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
          { role: 'system', content: systemPrompt },
          ...messages.slice(-16),
        ],
        response_format: { type: 'json_object' },
        temperature:     0.55,
        max_tokens:      800,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq dashboard error:', err)
      return NextResponse.json({
        answer:       'Tuve un problema al conectarme con el agente IA. Intenta de nuevo en un momento.',
        quickReplies: [],
        links:        [],
        openSupport:  false,
      })
    }

    const data    = await res.json()
    const raw     = data.choices?.[0]?.message?.content ?? '{}'
    const parsed  = JSON.parse(raw)

    return NextResponse.json({
      answer:       parsed.answer       ?? 'No pude generar una respuesta.',
      quickReplies: parsed.quickReplies ?? [],
      links:        parsed.links        ?? [],
      openSupport:  parsed.openSupport  ?? false,
    })
  } catch (err) {
    console.error('Dashboard agent error:', err)
    return NextResponse.json({
      answer:       'Ocurrió un error inesperado. Por favor intenta de nuevo.',
      quickReplies: [],
      links:        [],
      openSupport:  false,
    })
  }
}
