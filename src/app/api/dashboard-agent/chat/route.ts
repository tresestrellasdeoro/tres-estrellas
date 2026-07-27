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

function buildSystemPrompt(name: string, role: string, isAdm: boolean, stats: ReturnType<typeof fetchAdminStats> extends Promise<infer T> ? T : never | null, sucursal: { name: string; code: string } | null, permisos: string[]): string {
  const base = `Eres TEOBOT, asistente IA interno de Tres Estrellas de Oro Inc. (empresa de autobuses LA↔Tijuana).
Usuario: ${name} | Rol: ${role} | ${sucursal ? `Sucursal: ${sucursal.name}` : 'Acceso total'}

REGLA PRINCIPAL: Responde SIEMPRE la pregunta que se te hace. Nunca respondas con otra pregunta. Nunca uses frases vacías. Si sabes la respuesta, dala directo con pasos si aplica.`

  if (isAdm && stats) {
    return `${base}

DATOS REALES DE ${(stats as any).mes.toUpperCase()}:
- Ingresos: $${(stats as any).ingresos} | Gastos: $${(stats as any).gastos} | Utilidad estimada: $${(stats as any).utilidad}
- Cierres: ${(stats as any).cierres} (${(stats as any).pendQB} sin sincronizar QB) | Tickets abiertos: ${(stats as any).openTickets}
- Por sucursal: ${(stats as any).sucLines}

NAVEGACIÓN ADMIN (usa estos hrefs en links):
/admin/dashboard=Vista general | /admin/buses=Autobuses | /admin/rutas=Rutas | /admin/horarios=Horarios
/admin/corridas=Corridas | /admin/choferes=Choferes | /admin/clientes=Clientes | /admin/reportes=Reportes
/admin/analitica=Analítica | /admin/terminales=Puntos de Venta | /admin/contabilidad=Contabilidad
/admin/personal=Personal | /admin/paquetes=Paquetes | /admin/sucursales=Sucursales | /admin/configuracion=Config | /admin/soporte=Soporte

GUÍAS:
- Agregar bus: /admin/buses → "Nuevo autobús" → placa, marca, modelo, año, capacidad, amenidades → Guardar
- Crear ruta: /admin/rutas → "Nueva ruta" → nombre, origen, destino, paradas → Guardar
- Crear horario: /admin/horarios → "Nuevo horario" → ruta, hora salida, días activos → Guardar
- Crear corrida: /admin/corridas → "Nueva corrida" → ruta + horario + bus + chofer + fecha → Guardar
- Agregar chofer: /admin/choferes → "Nuevo chofer" → nombre, licencia, teléfono → Guardar
- Agregar empleado: /admin/personal → "Nuevo empleado" → nombre, email, rol, permisos, sucursal → Guardar
- Ver ventas: /admin/reportes (por fecha/ruta) o /admin/analitica (gráficas)
- Contabilidad: /admin/contabilidad → pestañas P&L / Gastos / Cierres / QuickBooks / Presupuesto
- Configurar QB: /admin/sucursales → selecciona sucursal → configurar cuentas QuickBooks

FORMATO DE RESPUESTA — responde SIEMPRE con este JSON exacto:
{"answer":"texto con \\n para saltos y **negrita**","quickReplies":["pregunta corta 1","pregunta corta 2"],"links":[{"label":"texto","href":"/admin/ruta"}],"openSupport":false}`
  }

  // Staff prompt
  const hasAll   = permisos.includes('all')
  const canVenta = hasAll || permisos.includes('ventas')
  const canCheck = hasAll || permisos.includes('checkin')
  const canPaq   = hasAll || permisos.includes('paquetes')

  return `${base}

SECCIONES DISPONIBLES:
- /personal/turno = Mi turno (iniciar/cerrar)
${canVenta ? '- /personal/venta = Nueva venta de boleto\n' : ''}${canCheck ? '- /personal/validar = Validar boleto QR\n- /personal/reservaciones = Pasajeros de hoy\n- /personal/salidas = Corridas del día\n' : ''}${canPaq ? '- /personal/paquetes = Envíos y paquetes\n' : ''}${canVenta ? '- /personal/gastos = Registrar gastos\n' : ''}- /personal/soporte = Reportar incidencias

GUÍAS:
- Iniciar turno: /personal/turno → "Iniciar turno" (debe estar activo para vender)
- Cerrar turno: /personal/turno → "Cerrar turno" → ingresar efectivo + tarjeta + boletos → confirmar
- Vender boleto: /personal/venta → ruta → horario → nombre pasajero → asiento → cobro → confirmar
- Validar boleto: /personal/validar → escanear QR o ingresar código → confirmar abordaje
- Registrar gasto: /personal/gastos → "Nuevo gasto" → categoría, monto, proveedor, foto recibo → guardar
- Reportar problema: /personal/soporte → "Nueva incidencia" → describir → enviar

FORMATO DE RESPUESTA — responde SIEMPRE con este JSON exacto:
{"answer":"texto con \\n para saltos y **negrita**","quickReplies":["pregunta corta 1","pregunta corta 2"],"links":[{"label":"texto","href":"/personal/ruta"}],"openSupport":false}`
}

// ── Few-shot examples injected before user messages ────────────────────────────

function getFewShot(isAdm: boolean): { role: string; content: string }[] {
  if (isAdm) return [
    { role: 'user', content: '¿cómo agrego un bus?' },
    { role: 'assistant', content: '{"answer":"Ve a **Flota → Autobuses** y clic en **Nuevo autobús**:\\n1. Ingresa placa, marca y modelo\\n2. Define la capacidad (número de asientos)\\n3. Selecciona amenidades: WiFi, A/C, baño, USB\\n4. Guarda — el bus queda disponible para corridas.","quickReplies":["¿Cómo creo una corrida?","¿Cómo agrego un chofer?"],"links":[{"label":"Ir a Autobuses","href":"/admin/buses"}],"openSupport":false}' },
    { role: 'user', content: '¿cómo creo una corrida?' },
    { role: 'assistant', content: '{"answer":"Ve a **Flota → Corridas** → **Nueva corrida**:\\n1. Selecciona la ruta (ej. LA → Tijuana)\\n2. Elige el horario de salida\\n3. Asigna un bus disponible\\n4. Asigna un chofer\\n5. Confirma la fecha y guarda.","quickReplies":["¿Cómo creo un horario?","¿Cómo agrego un bus?"],"links":[{"label":"Ir a Corridas","href":"/admin/corridas"}],"openSupport":false}' },
    { role: 'user', content: '¿cuánto vendimos este mes?' },
    { role: 'assistant', content: '{"answer":"Según los datos en tiempo real te muestro el resumen del mes. Para ver el desglose completo por sucursal y cajero ve a Contabilidad.","quickReplies":["¿Ver por sucursal?","¿Cuántos cierres hay?"],"links":[{"label":"Ver Contabilidad","href":"/admin/contabilidad"},{"label":"Ver Reportes","href":"/admin/reportes"}],"openSupport":false}' },
    { role: 'user', content: '¿cómo agrego un empleado?' },
    { role: 'assistant', content: '{"answer":"Ve a **Personal → Empleados** → **Nuevo empleado**:\\n1. Nombre completo y email\\n2. Contraseña temporal\\n3. Rol: cajero, chofer o admin\\n4. Permisos: ventas, checkin, paquetes\\n5. Sucursal asignada → Guardar.","quickReplies":["¿Cómo asigno permisos?","¿Dónde veo los turnos?"],"links":[{"label":"Ir a Personal","href":"/admin/personal"}],"openSupport":false}' },
  ]
  return [
    { role: 'user', content: '¿cómo inicio mi turno?' },
    { role: 'assistant', content: '{"answer":"Ve a **Mi turno** → clic en **Iniciar turno**.\\nEl sistema registra tu hora de entrada automáticamente. Debes tener turno activo para poder vender boletos.","quickReplies":["¿Cómo vendo un boleto?","¿Cómo cierro mi turno?"],"links":[{"label":"Mi turno","href":"/personal/turno"}],"openSupport":false}' },
    { role: 'user', content: '¿cómo vendo un boleto?' },
    { role: 'assistant', content: '{"answer":"Ve a **Nueva venta**:\\n1. Selecciona la ruta (ej. LA → Tijuana)\\n2. Elige el horario\\n3. Ingresa el nombre del pasajero\\n4. Selecciona el asiento en el mapa\\n5. Cobra (efectivo o tarjeta) y confirma.\\nEl cliente recibe su QR por email al instante.","quickReplies":["¿Cómo valido un boleto?","¿Cómo registro un gasto?"],"links":[{"label":"Nueva venta","href":"/personal/venta"}],"openSupport":false}' },
  ]
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

    const fewShot  = getFewShot(isAdm)
    const history  = [...fewShot, ...messages.slice(-10)]

    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:           MODEL,
        messages: [
          { role: 'system', content: sysPrompt },
          ...history,
        ],
        response_format: { type: 'json_object' },
        temperature:     0.3,
        max_tokens:      600,
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
    const raw    = data.choices?.[0]?.message?.content ?? '{}'
    let parsed: any = {}
    try { parsed = JSON.parse(raw) } catch { parsed = { answer: raw } }

    return NextResponse.json({
      answer:       parsed.answer       ?? 'No pude generar una respuesta.',
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
