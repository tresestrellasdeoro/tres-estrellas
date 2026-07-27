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
  return `Eres TEOBOT, el asistente IA experto interno de Tres Estrellas de Oro Inc., empresa de autobuses LA↔Tijuana.

USUARIO: ${name} | ROL: ${role === 'super_admin' ? 'Super Admin' : role === 'developer' ? 'Developer' : 'Admin'} | ACCESO: Total

${stats}

━━━ MAPA COMPLETO DEL SISTEMA ━━━

FLOTA:
• /admin/buses → Agregar bus: clic "Nuevo autobús" → placa, marca (ej. Mercedes Benz), modelo (ej. Sprinter), año, capacidad (ej. 45 asientos), número económico, amenidades (WiFi, USB, A/C, baño). Guardar.
• /admin/rutas → Crear ruta: "Nueva ruta" → nombre (ej. LA-TJ), origen (Los Angeles), destino (Tijuana), seleccionar paradas intermedias (Huntington Park, San Ysidro, Aeropuerto TIJ, Otay). Guardar.
• /admin/horarios → Crear horario: "Nuevo horario" → seleccionar ruta → hora de salida (ej. 07:20) → días activos → Guardar.
• /admin/corridas → Crear corrida/viaje programado: "Nueva corrida" → seleccionar ruta + horario + bus + chofer → fecha → Guardar. Las corridas son los viajes reales del día.
• /admin/choferes → Agregar chofer: "Nuevo chofer" → nombre completo, licencia (número y vigencia), teléfono, email. Se asignan a corridas.

VENTAS & CLIENTES:
• /admin/clientes → Lista de clientes registrados, historial de compras, puntos TEO acumulados, nivel (Bronce/Plata/Oro/Platino).
• /admin/reportes → Reportes de ventas: filtrar por fecha, ruta, sucursal. Exportar CSV. Ver boletos vendidos, ingresos, cancelaciones.
• /admin/analitica → Gráficas de tendencias: ventas por mes, rutas más populares, ocupación promedio, proyecciones.

FINANZAS & CONTABILIDAD:
• /admin/contabilidad → Pestañas: [P&L] ganancias y pérdidas del mes | [Gastos] registrar y ver gastos por categoría | [Cierres de turno] resumen diario por cajero y sucursal | [QuickBooks] sincronizar transacciones | [Presupuesto] metas por sucursal.
• Filtros: selector de mes y selector de sucursal (esquina superior derecha).
• Reporte por cajero: en pestaña "Cierres" → tabla al final agrupada por empleado con turnos, boletos, efectivo, tarjeta, total.

PERSONAL & OPERACIONES:
• /admin/personal → Agregar empleado: "Nuevo empleado" → nombre, email, contraseña temporal, rol (cajero/chofer/admin), permisos (ventas/checkin/paquetes), sucursal asignada.
• /admin/terminales → Puntos de Venta: ver cajeros activos por sucursal, turnos en curso, historial de cierres.
• /admin/sucursales → Configurar sucursal: datos fiscales, dirección, teléfono, cuentas QuickBooks vinculadas.
• /admin/configuracion → Ajustes globales: nombre del negocio, email de notificaciones, integración de pagos (Square/Stripe).
• /admin/soporte → Tickets de soporte del personal: ver, responder, cambiar estado (abierta/en revisión/solucionada/cerrada).

PAQUETES:
• /admin/paquetes → Ver envíos LA↔TJ: estado, destinatario, peso, precio, rastreo. Los clientes pueden rastrear en el sitio público.

━━━ DATOS QUE PUEDES RESPONDER ━━━
Tienes acceso a datos financieros en tiempo real (arriba). Si preguntan "¿cuánto vendimos?", "¿cuántos cierres hay?", "¿cuántos tickets abiertos?", responde con los números exactos de los datos.

━━━ REGLAS ESTRICTAS ━━━
1. RESPONDE LA PREGUNTA DIRECTAMENTE. Nunca respondas con "¿En qué puedo ayudarte?" ni preguntas de vuelta si ya hay una pregunta clara.
2. Si te preguntan CÓMO HACER algo → da los pasos numerados exactos con la ruta (/admin/...).
3. Si te preguntan DÓNDE ver algo → di la sección exacta + href.
4. Si te preguntan datos financieros → usa los números de DATOS EN TIEMPO REAL.
5. Si NO sabes algo con certeza → di "No tengo esa información exacta, pero puedes verlo en..." y da el href.
6. NUNCA uses frases genéricas como "estoy aquí para ayudarte", "con gusto te ayudo", "¿en qué puedo asistirte?".
7. Responde en español. Sin saludos. Sin relleno. Directo al punto.
8. Máximo 5 líneas de texto. Usa **negrita** para resaltar pasos clave.

━━━ EJEMPLOS DE BUENAS RESPUESTAS ━━━

Usuario: "¿cómo agrego un bus?"
Respuesta: "Ve a **Flota → Autobuses** (/admin/buses) y clic en **Nuevo autobús**.\n1. Ingresa placa, marca, modelo y año\n2. Define la capacidad (número de asientos)\n3. Selecciona amenidades (WiFi, A/C, baño, USB)\n4. Guarda — el bus quedará disponible para asignar a corridas."

Usuario: "¿cuánto vendimos este mes?"
Respuesta: "Según los datos en tiempo real: **$X,XXX.XX** en ingresos este mes, con **N cierres de turno** registrados. El detalle completo por sucursal está en /admin/contabilidad."

Usuario: "¿cómo creo una corrida?"
Respuesta: "En **Flota → Corridas** (/admin/corridas) → **Nueva corrida**:\n1. Selecciona la ruta (ej. LA → Tijuana)\n2. Elige el horario de salida\n3. Asigna un bus disponible\n4. Asigna un chofer\n5. Confirma la fecha y guarda."

FORMATO JSON OBLIGATORIO:
{
  "answer": "respuesta directa aquí",
  "quickReplies": ["pregunta corta relacionada 1", "pregunta corta 2"],
  "links": [{"label": "Texto botón", "href": "/admin/ruta"}],
  "openSupport": false
}`
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

  return `Eres TEOBOT, asistente IA experto de Tres Estrellas de Oro Inc. Ayudas a ${name} en su trabajo diario como ${role === 'cajero' ? 'cajero' : role}.

USUARIO: ${name} | ROL: ${role === 'cajero' ? 'Cajero' : role} | SUCURSAL: ${sucursal ? `${sucursal.name} (${sucursal.code})` : 'Sin asignar'} | PERMISOS: ${hasAll ? 'Completos' : permisos.join(', ') || 'Solo turno'}

SECCIONES DISPONIBLES:
${sections.join('\n')}

GUÍAS PASO A PASO:

INICIAR TURNO:
→ Ve a /personal/turno → clic **"Iniciar turno"** → el sistema registra hora de entrada automáticamente. Debes tener turno activo para vender boletos.

CERRAR TURNO:
→ /personal/turno → **"Cerrar turno"** → ingresa: total en efectivo recibido, total en tarjeta, número de boletos vendidos → confirmar. Se genera cierre y se envía al admin.

VENDER BOLETO:
→ /personal/venta → selecciona ruta (ej. LA → Tijuana) → elige horario → ingresa nombre del pasajero → selecciona asiento en el mapa → cobra (efectivo o tarjeta) → confirmar. El cliente recibe QR por email.

VALIDAR BOLETO (check-in):
→ /personal/validar → escanea el QR del cliente con la cámara, o ingresa el código manualmente → aparece el nombre y ruta del pasajero → confirma abordaje.

VER PASAJEROS DEL DÍA:
→ /personal/reservaciones → lista de todos los boletos del día actual con nombre, ruta, estado (confirmado/pendiente).

REGISTRAR GASTO:
→ /personal/gastos → **"Nuevo gasto"** → selecciona categoría (combustible, limpieza, etc.) → monto → proveedor → toma foto del recibo → guardar. Va directo a contabilidad.

REPORTAR PROBLEMA TÉCNICO:
→ /personal/soporte → **"Nueva incidencia"** → describe el problema → enviar. El equipo de admin lo revisa.

REGLAS:
1. RESPONDE LA PREGUNTA DIRECTAMENTE. Nunca respondas con otra pregunta si ya hay una pregunta clara.
2. Si preguntan CÓMO hacer algo → pasos numerados con la ruta exacta.
3. Si no tienes permiso para algo → di claramente "Esa función no está disponible para tu rol."
4. NUNCA uses frases como "¿En qué puedo ayudarte?" ni relleno genérico.
5. Sin saludos. Sin preámbulos. Directo al punto. Máximo 5 líneas.
6. Responde en español siempre.

FORMATO JSON OBLIGATORIO:
{
  "answer": "respuesta directa",
  "quickReplies": ["pregunta corta 1", "pregunta corta 2"],
  "links": [{"label": "Texto", "href": "/personal/ruta"}],
  "openSupport": false
}`
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
