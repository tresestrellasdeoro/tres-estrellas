import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { SquareClient, SquareEnvironment } from 'square'
import { z } from 'zod'

const Schema = z.object({
  booking_number: z.string().min(1),
  luggage_label:  z.string().min(1),
  extra_price:    z.number().positive(),
  payment_method: z.enum(['cash', 'card']),
  source_id:      z.string().optional(),
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

export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const { booking_number, luggage_label, extra_price, payment_method, source_id } = parsed.data

  const service = svc()

  const { data: booking } = await service
    .from('bookings')
    .select('id, booking_number, status, luggage_price, luggage_label, total_amount')
    .eq('booking_number', booking_number)
    .maybeSingle() as { data: any }

  if (!booking) return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 })
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: `No se puede cobrar equipaje — estado del boleto: ${booking.status}` }, { status: 409 })
  }

  // Charge with Square if card
  let squarePaymentId: string | null = null
  if (payment_method === 'card') {
    if (!squareClient) return NextResponse.json({ error: 'Pagos con tarjeta no configurados' }, { status: 503 })
    if (!source_id)    return NextResponse.json({ error: 'Token de pago requerido' }, { status: 400 })
    try {
      const response = await squareClient.payments.create({
        sourceId:       source_id,
        amountMoney:    { amount: BigInt(Math.round(extra_price * 100)), currency: 'USD' },
        locationId:     process.env.SQUARE_LOCATION_ID!,
        idempotencyKey: crypto.randomUUID(),
        note:           `Equipaje extra ${luggage_label} — ${booking_number}`,
      })
      const payment = response.payment
      if (!payment || payment.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Pago rechazado por el banco' }, { status: 402 })
      }
      squarePaymentId = payment.id ?? null
    } catch (e: any) {
      const detail = e?.errors?.[0]?.detail || e?.message || 'Pago rechazado'
      return NextResponse.json({ error: detail }, { status: 402 })
    }
  }

  // Build combined luggage info
  const prevPrice = Number(booking.luggage_price ?? 0)
  const newPrice  = prevPrice + extra_price
  const prevLabel = booking.luggage_label as string | null
  const newLabel  = prevLabel && prevLabel !== luggage_label
    ? `${prevLabel} + ${luggage_label}`
    : luggage_label

  const { error: updErr } = await service
    .from('bookings')
    .update({
      luggage_price: newPrice,
      luggage_label: newLabel,
      total_amount:  Number(booking.total_amount) + extra_price,
    })
    .eq('id', booking.id)

  if (updErr) return NextResponse.json({ error: 'Error al actualizar: ' + updErr.message }, { status: 500 })

  // Save payment record
  await service.from('payments').insert({
    booking_id:     booking.id,
    amount:         extra_price,
    provider:       squarePaymentId ? 'square' : 'cash',
    status:         'completed',
    payment_method: payment_method,
    metadata:       squarePaymentId ? { square_payment_id: squarePaymentId, type: 'equipaje_extra' } : { type: 'equipaje_extra' },
    ...(squarePaymentId ? { provider_payment_id: squarePaymentId } : {}),
  })

  return NextResponse.json({
    ok:            true,
    luggage_price: newPrice,
    luggage_label: newLabel,
    total_amount:  Number(booking.total_amount) + extra_price,
    message: payment_method === 'card'
      ? `Equipaje cobrado con tarjeta: $${extra_price}`
      : `Equipaje cobrado en efectivo: $${extra_price} — cobra al cliente ahora`,
  })
}
