import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { SquareClient, SquareEnvironment } from 'square'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function svc() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const squareConfigured = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID)
const squareClient = squareConfigured
  ? new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN!, environment: SquareEnvironment.Production })
  : null

// POST — collect payment for an existing package (staff/admin only)
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, tracking_number, payment_method, source_id } = await req.json()
  if ((!id && !tracking_number) || !payment_method) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 422 })
  }

  const method: 'card' | 'cash' | 'terminal' = payment_method

  const db = svc()

  // Find package
  let pkgId = id
  let pkgPrice = 0

  if (!pkgId) {
    const { data } = await db.from('packages').select('id, price, payment_status').eq('tracking_number', tracking_number).maybeSingle()
    if (!data) return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    pkgId    = data.id
    pkgPrice = Number(data.price)
    if (data.payment_status === 'paid') return NextResponse.json({ error: 'Este paquete ya está pagado' }, { status: 409 })
  } else {
    const { data } = await db.from('packages').select('price, payment_status').eq('id', pkgId).maybeSingle()
    if (!data) return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    pkgPrice = Number(data.price)
    if (data.payment_status === 'paid') return NextResponse.json({ error: 'Este paquete ya está pagado' }, { status: 409 })
  }

  // ── Square charge (card) ───────────────────────────────────────────────────
  let squarePaymentId: string | undefined

  if (method === 'card') {
    if (!source_id) return NextResponse.json({ error: 'Token de tarjeta requerido' }, { status: 400 })
    if (!squareConfigured || !squareClient) return NextResponse.json({ error: 'Pagos con tarjeta no configurados' }, { status: 503 })
    try {
      const paymentResponse = await squareClient.payments.create({
        sourceId:       source_id,
        amountMoney:    { amount: BigInt(Math.round(pkgPrice * 100)), currency: 'USD' },
        locationId:     process.env.SQUARE_LOCATION_ID!,
        idempotencyKey: crypto.randomUUID(),
        note:           `Cobro paqueteo TEO en terminal — paquete ${tracking_number ?? pkgId}`,
      })
      const payment = paymentResponse.payment
      if (!payment || payment.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Pago rechazado por el banco' }, { status: 402 })
      }
      squarePaymentId = payment.id
    } catch (e: any) {
      const detail = e?.errors?.[0]?.detail || e?.message || 'Pago rechazado'
      return NextResponse.json({ error: detail }, { status: 402 })
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const now = new Date().toISOString()

  const { data: pkg, error } = await db
    .from('packages')
    .update({
      payment_status:    'paid',
      payment_method:    method,
      square_payment_id: squarePaymentId ?? null,
      paid_at:           now,
      paid_by:           user.id,
      updated_at:        now,
    })
    .eq('id', pkgId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const methodLabel = method === 'card' ? 'Tarjeta (Square)' : method === 'cash' ? 'Efectivo' : 'Terminal de pago'
  await db.from('package_events').insert({
    package_id: pkgId,
    status:     pkg.status,
    location:   null,
    notes:      `Pago recibido · ${methodLabel} · $${pkgPrice.toFixed(2)} USD`,
    created_by: user.id,
  })

  return NextResponse.json({ package: pkg, amount: pkgPrice })
}
