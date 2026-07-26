import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { Resend } from 'resend'
import { z } from 'zod'

const DEPARTURE_TIMES = [
  '3:20 AM','4:30 AM','5:00 AM','6:00 AM','7:00 AM','7:30 AM','8:00 AM',
  '9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM',
  '4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM','11:00 PM',
]

const Schema = z.object({
  booking_number:     z.string().min(1),
  leg:                z.enum(['outbound', 'return']),
  new_date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  new_departure_time: z.string().optional(),
})

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function toDbTime(readable: string): string {
  const m = readable.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return readable
  let h = parseInt(m[1])
  const min = m[2]
  const period = m[3].toUpperCase()
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}:00`
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} de ${months[parseInt(m) - 1]} de ${y}`
}

function reagendarEmailHtml(d: {
  bookingNumber: string
  origin:        string
  destination:   string
  passengerNames: string[]
  leg:           'outbound' | 'return'
  oldDate?:      string
  oldTime?:      string
  newDate:       string
  newTime?:      string
}) {
  const legLabel   = d.leg === 'outbound' ? 'Ida' : 'Regreso'
  const passengers = d.passengerNames.map(n => `<li style="padding:4px 0;color:#374151">${n}</li>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Cambio de horario — Tres Estrellas de Oro</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:#0a1e42;padding:28px 32px;text-align:center">
    <p style="color:#c8a951;font-size:11px;letter-spacing:3px;margin:0 0 8px;text-transform:uppercase">Tres Estrellas de Oro</p>
    <h1 style="color:#fff;font-size:22px;margin:0">📅 Cambio de horario</h1>
    <p style="color:#ffffff80;font-size:13px;margin:8px 0 0">Tu boleto fue reagendado por el personal en ventanilla</p>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px">

    <div style="background:#fff8e1;border:1.5px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-weight:700;color:#92400e;font-size:14px">⚠️ Tu horario ha cambiado</p>
      <p style="margin:0;color:#78350f;font-size:13px">Por favor presenta tu mismo código QR en el nuevo horario indicado abajo.</p>
    </div>

    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Reservación</p>
    <p style="font-size:22px;font-weight:900;color:#0a1e42;letter-spacing:4px;margin:0 0 20px;font-family:monospace">${d.bookingNumber}</p>

    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Ruta</p>
    <p style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 20px">${d.origin} → ${d.destination}</p>

    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Pasajeros</p>
    <ul style="margin:0 0 20px;padding-left:18px">${passengers}</ul>

    <!-- Cambio de horario -->
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:24px">
      <div style="background:#f9fafb;padding:12px 16px;display:flex;gap:16px">
        ${d.oldDate ? `
        <div style="flex:1">
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Antes (${legLabel})</p>
          <p style="font-size:14px;font-weight:600;color:#9ca3af;text-decoration:line-through;margin:0">${formatDate(d.oldDate)}${d.oldTime ? ` · ${d.oldTime}` : ''}</p>
        </div>` : ''}
        <div style="flex:1">
          <p style="font-size:11px;color:#059669;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Nuevo (${legLabel})</p>
          <p style="font-size:15px;font-weight:800;color:#065f46;margin:0">${formatDate(d.newDate)}${d.newTime ? ` · ${d.newTime}` : ''}</p>
        </div>
      </div>
    </div>

    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 16px">
      <p style="margin:0;font-size:13px;color:#065f46;font-weight:600">✅ El mismo código QR sigue siendo válido — solo preséntalo en el nuevo horario.</p>
    </div>

  </div>

  <!-- Footer -->
  <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
    <p style="color:#9ca3af;font-size:12px;margin:0">¿Preguntas? Llámanos al <strong>1 800 337-8745</strong></p>
    <p style="color:#d1d5db;font-size:11px;margin:6px 0 0">Tres Estrellas de Oro Inc.</p>
  </div>
</div>
</body></html>`
}

export async function PATCH(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { booking_number, leg, new_date, new_departure_time } = parsed.data

  if (leg === 'outbound' && !new_departure_time) {
    return NextResponse.json({ error: 'Se requiere hora de salida para el tramo de ida.' }, { status: 422 })
  }
  if (new_departure_time && !DEPARTURE_TIMES.includes(new_departure_time)) {
    return NextResponse.json({ error: 'Hora de salida no válida.' }, { status: 422 })
  }

  const service = svc()

  const { data: booking } = await service
    .from('bookings')
    .select('id, status, ticket_type, trip_id, guest_email, booking_number, origin_name, destination_name, departure_time, return_date, passengers(id, full_name, checked_in, return_checked_in)')
    .eq('booking_number', booking_number)
    .maybeSingle() as { data: any }

  if (!booking) return NextResponse.json({ error: 'Reservación no encontrada.' }, { status: 404 })
  if (booking.status === 'cancelled') return NextResponse.json({ error: 'No se puede reagendar un boleto cancelado.' }, { status: 400 })

  const passengers = (booking.passengers ?? []) as { id: string; full_name: string; checked_in: boolean; return_checked_in: boolean }[]
  const passengerNames = passengers.map((p: any) => p.full_name).filter(Boolean)

  if (leg === 'outbound') {
    const alreadyBoarded = passengers.length > 0 && passengers.every(p => p.checked_in)
    if (alreadyBoarded) return NextResponse.json({ error: 'El pasajero ya abordó el tramo de ida. No se puede reagendar.' }, { status: 400 })

    const dbTime = toDbTime(new_departure_time!)
    const { data: trip } = await service
      .from('trips').select('id')
      .eq('departure_date', new_date).eq('departure_time', dbTime).eq('status', 'scheduled')
      .maybeSingle()

    const update: Record<string, unknown> = {
      departure_time: new_departure_time,
      updated_at:     new Date().toISOString(),
      notes:          `Reagendado en ventanilla — nuevo horario: ${new_departure_time} del ${new_date}`,
    }
    if (trip) update.trip_id = trip.id

    const { error } = await service.from('bookings').update(update).eq('id', booking.id)
    if (error) return NextResponse.json({ error: 'Error al reagendar: ' + error.message }, { status: 500 })

    // Email al cliente
    if (booking.guest_email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from:    'Tres Estrellas de Oro <boletos@tresestrellasdeoroinc.com>',
          to:      booking.guest_email,
          subject: `📅 Tu boleto fue reagendado — ${booking.booking_number}`,
          html:    reagendarEmailHtml({
            bookingNumber:  booking.booking_number,
            origin:         booking.origin_name      ?? 'Origen',
            destination:    booking.destination_name ?? 'Destino',
            passengerNames,
            leg:            'outbound',
            oldDate:        booking.trips?.departure_date ?? undefined,
            oldTime:        booking.departure_time        ?? undefined,
            newDate:        new_date,
            newTime:        new_departure_time,
          }),
        })
      } catch (emailErr: any) {
        console.error('Reagendar email failed:', emailErr.message)
      }
    }

    return NextResponse.json({ ok: true, msg: `Boleto reagendado al ${formatDate(new_date)} a las ${new_departure_time}`, trip_linked: !!trip })
  }

  if (leg === 'return') {
    if (booking.ticket_type !== 'round_trip') return NextResponse.json({ error: 'Este boleto no tiene tramo de regreso.' }, { status: 400 })

    const alreadyReturned = passengers.length > 0 && passengers.every(p => p.return_checked_in)
    if (alreadyReturned) return NextResponse.json({ error: 'El pasajero ya abordó el tramo de regreso. No se puede reagendar.' }, { status: 400 })

    const { error } = await service.from('bookings').update({
      return_date: new_date,
      updated_at:  new Date().toISOString(),
      notes:       `Regreso reagendado en ventanilla — nueva fecha: ${new_date}`,
    }).eq('id', booking.id)

    if (error) return NextResponse.json({ error: 'Error al reagendar regreso: ' + error.message }, { status: 500 })

    // Email al cliente
    if (booking.guest_email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from:    'Tres Estrellas de Oro <boletos@tresestrellasdeoroinc.com>',
          to:      booking.guest_email,
          subject: `📅 Tu regreso fue reagendado — ${booking.booking_number}`,
          html:    reagendarEmailHtml({
            bookingNumber:  booking.booking_number,
            origin:         booking.origin_name      ?? 'Origen',
            destination:    booking.destination_name ?? 'Destino',
            passengerNames,
            leg:            'return',
            oldDate:        booking.return_date ?? undefined,
            newDate:        new_date,
          }),
        })
      } catch (emailErr: any) {
        console.error('Reagendar return email failed:', emailErr.message)
      }
    }

    return NextResponse.json({ ok: true, msg: `Regreso reagendado para el ${formatDate(new_date)}` })
  }

  return NextResponse.json({ error: 'Tramo inválido.' }, { status: 400 })
}
