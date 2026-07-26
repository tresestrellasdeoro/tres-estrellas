import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { SquareClient, SquareEnvironment } from 'square'
import { z } from 'zod'

const Schema = z.object({
  id:    z.string().uuid().optional(),
  tracking_number: z.string().optional(),
  razon: z.string().optional(),
})

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const squareClient = process.env.SQUARE_ACCESS_TOKEN
  ? new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: SquareEnvironment.Production })
  : null

const CANCELLABLE = ['label_created', 'received', 'in_transit', 'arrived']
const BLOCKED     = ['delivered', 'returned', 'cancelled']

// POST /api/packages/cancel
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const { id, tracking_number, razon } = parsed.data
  if (!id && !tracking_number) return NextResponse.json({ error: 'Falta id o tracking_number' }, { status: 422 })

  const service = svc()

  // Fetch package
  let query = service.from('packages').select(
    'id, tracking_number, status, payment_status, payment_method, square_payment_id, price, sender_name, recipient_name'
  )
  if (id)              query = (query as any).eq('id', id)
  else if (tracking_number) query = (query as any).eq('tracking_number', tracking_number.toUpperCase())

  const { data: pkg } = await (query as any).maybeSingle() as { data: any }
  if (!pkg) return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })

  if (BLOCKED.includes(pkg.status)) {
    const labels: Record<string, string> = { delivered: 'ya fue entregado', returned: 'ya fue devuelto', cancelled: 'ya está cancelado' }
    return NextResponse.json({ error: `No se puede cancelar — el paquete ${labels[pkg.status] ?? pkg.status}.` }, { status: 409 })
  }

  // Square refund if paid by card
  let refundIssued  = false
  let refundError   = ''
  if (pkg.payment_status === 'paid' && pkg.payment_method === 'card' && pkg.square_payment_id && squareClient) {
    try {
      await squareClient.refunds.refundPayment({
        paymentId:      pkg.square_payment_id,
        amountMoney:    { amount: BigInt(Math.round(Number(pkg.price) * 100)), currency: 'USD' },
        idempotencyKey: crypto.randomUUID(),
        reason:         `Cancelación envío ${pkg.tracking_number}${razon ? ` — ${razon}` : ''}`,
      })
      refundIssued = true
    } catch (e: any) {
      refundError = e?.errors?.[0]?.detail ?? e.message ?? 'Error Square'
      console.error('Square refund error (package cancel):', refundError)
    }
  }

  const newPaymentStatus = refundIssued ? 'refunded' : pkg.payment_status

  const { error: updateErr } = await service
    .from('packages')
    .update({
      status:         'cancelled',
      payment_status: newPaymentStatus,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', pkg.id)

  if (updateErr) return NextResponse.json({ error: 'Error al cancelar: ' + updateErr.message }, { status: 500 })

  // Log event
  const eventNote = [
    razon ? `Motivo: ${razon}` : null,
    refundIssued          ? `Reembolso emitido: $${Number(pkg.price).toFixed(2)}` : null,
    refundError           ? `Reembolso Square falló: ${refundError}` : null,
    pkg.payment_status === 'pending' ? 'Sin cargo previo' : null,
  ].filter(Boolean).join(' · ')

  await service.from('package_events').insert({
    package_id: pkg.id,
    status:     'cancelled',
    location:   null,
    notes:      eventNote || 'Cancelado desde ventanilla',
    created_by: null,
  })

  const message = pkg.payment_status === 'pending'
    ? 'Envío cancelado. No había cargo pendiente.'
    : refundIssued
      ? `Envío cancelado y reembolso de $${Number(pkg.price).toFixed(2)} enviado a tarjeta (3–5 días hábiles).`
      : pkg.payment_method === 'cash'
        ? `Envío cancelado. Devuelve $${Number(pkg.price).toFixed(2)} en efectivo al remitente.`
        : `Envío cancelado. Reembolso Square falló — procesa manualmente: $${Number(pkg.price).toFixed(2)}.`

  return NextResponse.json({
    ok:             true,
    status:         'cancelled',
    payment_status: newPaymentStatus,
    refund_issued:  refundIssued,
    refund_error:   refundError || null,
    message,
  })
}
