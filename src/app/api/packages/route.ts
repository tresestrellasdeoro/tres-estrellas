import { SquareClient, SquareEnvironment } from 'square'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { generateTrackingNumber, PACKAGE_SIZES, type PackageSize } from '@/lib/packages'
import { requireAuth, requireStaff } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const squareConfigured = !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID)
const squareClient = squareConfigured
  ? new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN!, environment: SquareEnvironment.Production })
  : null

// GET — list packages (customer: own; admin/staff: all + search)
export async function GET(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = svc()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle() as { data: { role: string } | null }

  const isAdmin = ['admin', 'super_admin', 'cajero'].includes(profile?.role ?? '')
  const search  = req.nextUrl.searchParams.get('q') ?? ''
  const limit   = Number(req.nextUrl.searchParams.get('limit') ?? 50)

  let query = db
    .from('packages')
    .select(`
      id, tracking_number, sender_name, sender_phone,
      recipient_name, recipient_phone,
      size, weight_lbs, price, status, payment_status, payment_method, paid_at, created_at, notes,
      origin:stops!origin_stop_id(name, city),
      destination:stops!destination_stop_id(name, city)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!isAdmin) {
    query = query.eq('customer_id', user.id)
  } else if (search) {
    query = query.or(
      `tracking_number.ilike.%${search}%,` +
      `sender_name.ilike.%${search}%,sender_phone.ilike.%${search}%,sender_email.ilike.%${search}%,` +
      `recipient_name.ilike.%${search}%,recipient_phone.ilike.%${search}%,recipient_email.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ packages: data ?? [] })
}

// POST — create new package (staff at counter, or authenticated customer online)
export async function POST(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    sender_name, sender_phone, sender_email,
    recipient_name, recipient_phone, recipient_email,
    origin_stop_id, destination_stop_id,
    size, weight_lbs, declared_value, notes,
    payment_method, source_id,
  } = body

  if (!sender_name || !sender_phone || !recipient_name || !recipient_phone || !origin_stop_id || !destination_stop_id || !size) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const staticInfo = PACKAGE_SIZES[size as PackageSize]
  if (!staticInfo) return NextResponse.json({ error: 'Tamaño inválido' }, { status: 422 })

  // Read price from DB (admin-editable); fall back to static config
  const { data: dbPricing } = await svc()
    .from('package_pricing')
    .select('price, max_lbs, dims')
    .eq('id', size)
    .maybeSingle()
  const sizeInfo = { ...staticInfo, price: dbPricing?.price ?? staticInfo.price }

  const method: 'card' | 'cash' | 'terminal' = payment_method ?? 'cash'

  // ── Square charge (if card) ────────────────────────────────────────────────
  let squarePaymentId: string | undefined

  if (method === 'card') {
    if (!source_id) return NextResponse.json({ error: 'Token de tarjeta requerido' }, { status: 400 })
    if (!squareConfigured || !squareClient) return NextResponse.json({ error: 'Pagos con tarjeta no configurados' }, { status: 503 })
    try {
      const paymentResponse = await squareClient.payments.create({
        sourceId:       source_id,
        amountMoney:    { amount: BigInt(Math.round(sizeInfo.price * 100)), currency: 'USD' },
        locationId:     process.env.SQUARE_LOCATION_ID!,
        idempotencyKey: crypto.randomUUID(),
        note:           `Paqueteo TEO — ${size} — ${sender_name} → ${recipient_name}`,
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

  const db      = svc()
  let tracking  = generateTrackingNumber()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await db.from('packages').select('id').eq('tracking_number', tracking).maybeSingle()
    if (!existing) break
    tracking = generateTrackingNumber()
  }

  const now = new Date().toISOString()
  const isPaid = method === 'card' && !!squarePaymentId

  const { data: pkg, error } = await db
    .from('packages')
    .insert({
      tracking_number:     tracking,
      sender_name,
      sender_phone,
      sender_email:        sender_email ?? null,
      recipient_name,
      recipient_phone,
      recipient_email:     recipient_email ?? null,
      origin_stop_id,
      destination_stop_id,
      size,
      weight_lbs:          Number(weight_lbs ?? 0),
      declared_value:      Number(declared_value ?? 0),
      price:               sizeInfo.price,
      status:              'label_created',
      payment_status:      isPaid ? 'paid' : 'pending',
      payment_method:      isPaid ? 'card' : null,
      square_payment_id:   squarePaymentId ?? null,
      paid_at:             isPaid ? now : null,
      paid_by:             isPaid ? (user?.id ?? null) : null,
      customer_id:         user?.id ?? null,
      notes:               notes ?? null,
    })
    .select('*, origin:stops!origin_stop_id(name,city), destination:stops!destination_stop_id(name,city)')
    .single()

  if (error) {
    // Reembolsar Square si el insert falló
    if (squarePaymentId && squareClient) {
      await squareClient.refunds.refundPayment({
        paymentId:      squarePaymentId,
        amountMoney:    { amount: BigInt(Math.round(sizeInfo.price * 100)), currency: 'USD' },
        idempotencyKey: crypto.randomUUID(),
        reason:         'Package creation failed — automatic refund',
      }).catch(() => {})
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await db.from('package_events').insert({
    package_id: pkg.id,
    status:     'label_created',
    location:   null,
    notes:      isPaid ? `Etiqueta creada · Pagado con tarjeta $${sizeInfo.price}` : 'Etiqueta creada · Pago pendiente en terminal',
    created_by: user?.id ?? null,
  })

  return NextResponse.json({ package: pkg }, { status: 201 })
}

// PATCH — update status (staff/admin only)
export async function PATCH(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, tracking_number, status, location, notes } = await req.json()
  if ((!id && !tracking_number) || !status) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 422 })
  }

  const db = svc()

  let pkgId = id
  if (!pkgId && tracking_number) {
    const { data } = await db.from('packages').select('id').eq('tracking_number', tracking_number).maybeSingle()
    pkgId = data?.id
    if (!pkgId) return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
  }

  const { data: pkg, error } = await db
    .from('packages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', pkgId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('package_events').insert({
    package_id: pkgId,
    status,
    location:   location ?? null,
    notes:      notes ?? null,
    created_by: user.id,
  })

  return NextResponse.json({ package: pkg })
}
