import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { SquareClient, SquareEnvironment } from 'square'
import { Resend } from 'resend'
import { z } from 'zod'

const Schema = z.object({
  booking_number: z.string().min(1),
  razon:          z.string().optional(),
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

function cancelEmailHtml(d: {
  bookingNumber:   string
  origin:          string
  destination:     string
  passengerNames:  string[]
  totalAmount:     number
  refundIssued:    boolean
  paymentMethod:   string
  razon?:          string
}) {
  const passengers = d.passengerNames.map(n => `<li style="padding:4px 0;color:#374151">${n}</li>`).join('')
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Cancelación de boleto — Tres Estrellas de Oro</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

  <div style="background:#0a1e42;padding:28px 32px;text-align:center">
    <p style="color:#c8a951;font-size:11px;letter-spacing:3px;margin:0 0 8px;text-transform:uppercase">Tres Estrellas de Oro</p>
    <h1 style="color:#fff;font-size:22px;margin:0">Boleto cancelado</h1>
    <p style="color:#ffffff80;font-size:13px;margin:8px 0 0">Tu reservación ha sido cancelada por el personal en ventanilla</p>
  </div>

  <div style="padding:28px 32px">

    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Reservación</p>
    <p style="font-size:22px;font-weight:900;color:#0a1e42;letter-spacing:4px;margin:0 0 20px;font-family:monospace">${d.bookingNumber}</p>

    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Ruta</p>
    <p style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 20px">${d.origin} → ${d.destination}</p>

    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Pasajeros</p>
    <ul style="margin:0 0 20px;padding-left:18px">${passengers}</ul>

    ${d.razon ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin-bottom:20px">
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Motivo</p>
      <p style="font-size:13px;color:#374151;margin:0">${d.razon}</p>
    </div>` : ''}

    ${d.refundIssued ? `
    <div style="background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-weight:700;color:#065f46;font-size:14px">✅ Reembolso procesado</p>
      <p style="margin:0;color:#047857;font-size:13px">
        Se ha iniciado un reembolso de <strong>$${d.totalAmount.toFixed(2)}</strong> a tu tarjeta de crédito/débito original.
        Puede tardar 3–5 días hábiles en reflejarse.
      </p>
    </div>` : `
    <div style="background:#fff8e1;border:1.5px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-weight:700;color:#92400e;font-size:14px">💵 Reembolso en efectivo</p>
      <p style="margin:0;color:#78350f;font-size:13px">
        Tu pago fue en efectivo. Por favor acércate a la sucursal donde realizaste tu compra para recibir el reembolso de <strong>$${d.totalAmount.toFixed(2)}</strong>.
      </p>
    </div>`}

    <p style="font-size:13px;color:#374151;margin:0">Si tienes alguna duda o crees que fue un error, comunícate con nosotros.</p>

  </div>

  <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
    <p style="color:#9ca3af;font-size:12px;margin:0">¿Preguntas? Llámanos al <strong>1 800 337-8745</strong></p>
    <p style="color:#d1d5db;font-size:11px;margin:6px 0 0">Tres Estrellas de Oro Inc.</p>
  </div>
</div>
</body></html>`
}

// POST /api/staff/bookings/cancelar
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })

  const { booking_number, razon } = parsed.data
  const service = svc()

  const { data: booking } = await service
    .from('bookings')
    .select('id, booking_number, status, total_amount, payment_method, guest_email, customer_id, points_earned, trip_id, passengers(id, full_name), origin_name, destination_name')
    .eq('booking_number', booking_number)
    .maybeSingle() as { data: any }

  if (!booking) return NextResponse.json({ error: 'Reservación no encontrada.' }, { status: 404 })

  if (booking.status === 'cancelled') return NextResponse.json({ error: 'Este boleto ya está cancelado.' }, { status: 409 })
  if (booking.status === 'refunded')  return NextResponse.json({ error: 'Este boleto ya fue reembolsado.' }, { status: 409 })
  if (booking.status !== 'confirmed') return NextResponse.json({ error: `No se puede cancelar — estado: ${booking.status}` }, { status: 409 })

  const passengers    = (booking.passengers ?? []) as { id: string; full_name: string }[]
  const passengerNames = passengers.map(p => p.full_name).filter(Boolean)

  // Square refund if card payment
  let refundIssued = false
  if (booking.payment_method === 'card' && squareClient) {
    const { data: payment } = await service
      .from('payments')
      .select('provider_payment_id, amount')
      .eq('booking_id', booking.id)
      .eq('provider', 'square')
      .eq('status', 'completed')
      .maybeSingle() as any

    if (payment?.provider_payment_id) {
      try {
        await squareClient.refunds.refundPayment({
          paymentId:      payment.provider_payment_id,
          amountMoney:    { amount: BigInt(Math.round(Number(payment.amount) * 100)), currency: 'USD' },
          idempotencyKey: crypto.randomUUID(),
          reason:         `Cancelación desde ventanilla — ${booking_number}${razon ? ` — ${razon}` : ''}`,
        })
        refundIssued = true
      } catch (e: any) {
        console.error('Square refund error (staff cancel):', e?.errors?.[0]?.detail ?? e.message)
        // Continúa con la cancelación aunque el reembolso falle — se puede hacer manualmente
      }
    }
  }

  const newStatus = refundIssued ? 'refunded' : 'cancelled'

  const { error: updateErr } = await service
    .from('bookings')
    .update({
      status:     newStatus,
      updated_at: new Date().toISOString(),
      notes:      [booking.notes, razon ? `Cancelado en ventanilla: ${razon}` : 'Cancelado en ventanilla'].filter(Boolean).join(' | '),
    })
    .eq('id', booking.id)

  if (updateErr) return NextResponse.json({ error: 'Error al cancelar: ' + updateErr.message }, { status: 500 })
  // DB trigger `on_booking_cancelled` restores seats automatically

  // Reversar puntos de lealtad si aplica
  if (booking.customer_id && booking.points_earned && booking.points_earned > 0) {
    const { data: profile } = await service.from('profiles').select('loyalty_points').eq('id', booking.customer_id).maybeSingle() as any
    const currentPoints = profile?.loyalty_points ?? 0
    const newPoints     = Math.max(0, currentPoints - booking.points_earned)
    const newTier       = newPoints >= 5000 ? 'platinum' : newPoints >= 2000 ? 'gold' : newPoints >= 500 ? 'silver' : newPoints >= 100 ? 'bronze' : 'none'
    await service.from('profiles').update({ loyalty_points: newPoints, loyalty_tier: newTier }).eq('id', booking.customer_id)
    await service.from('loyalty_transactions').insert({
      customer_id: booking.customer_id,
      booking_id:  booking.id,
      points:      -booking.points_earned,
      type:        'reversed',
      description: `Cancelación desde ventanilla — ${booking_number}`,
    })
  }

  // Email al cliente
  if (booking.guest_email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from:    'Tres Estrellas de Oro <boletos@tresestrellasdeoroinc.com>',
        to:      booking.guest_email,
        subject: `Tu boleto fue cancelado — ${booking_number}`,
        html:    cancelEmailHtml({
          bookingNumber:  booking_number,
          origin:         booking.origin_name      ?? 'Origen',
          destination:    booking.destination_name ?? 'Destino',
          passengerNames,
          totalAmount:    Number(booking.total_amount),
          refundIssued,
          paymentMethod:  booking.payment_method,
          razon,
        }),
      })
    } catch (emailErr: any) {
      console.error('Cancel email failed:', emailErr.message)
    }
  }

  return NextResponse.json({
    ok:            true,
    status:        newStatus,
    refund_issued: refundIssued,
    message:       refundIssued
      ? `Boleto cancelado y reembolso enviado a tarjeta. Email notificado.`
      : `Boleto cancelado. Reembolso en efectivo pendiente.${!booking.guest_email ? '' : ' Email notificado.'}`,
  })
}
