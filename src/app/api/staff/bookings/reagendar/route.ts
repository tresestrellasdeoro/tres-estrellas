import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
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
  new_departure_time: z.string().optional(), // solo requerido para outbound
})

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Convierte "8:00 AM" → "08:00:00" para comparar con trips.departure_time (TIME)
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

  // Buscar el booking
  const { data: booking } = await service
    .from('bookings')
    .select('id, status, ticket_type, trip_id, passengers(id, checked_in, return_checked_in)')
    .eq('booking_number', booking_number)
    .maybeSingle() as { data: any }

  if (!booking) {
    return NextResponse.json({ error: 'Reservación no encontrada.' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'No se puede reagendar un boleto cancelado.' }, { status: 400 })
  }

  const passengers = (booking.passengers ?? []) as { id: string; checked_in: boolean; return_checked_in: boolean }[]

  if (leg === 'outbound') {
    // No se puede reagendar si ya abordó
    const alreadyBoarded = passengers.length > 0 && passengers.every(p => p.checked_in)
    if (alreadyBoarded) {
      return NextResponse.json({ error: 'El pasajero ya abordó el tramo de ida. No se puede reagendar.' }, { status: 400 })
    }

    // Buscar trip que coincida con la nueva fecha y hora
    const dbTime = toDbTime(new_departure_time!)
    const { data: trip } = await service
      .from('trips')
      .select('id')
      .eq('departure_date', new_date)
      .eq('departure_time', dbTime)
      .eq('status', 'scheduled')
      .maybeSingle()

    const update: Record<string, unknown> = {
      departure_time: new_departure_time,
      updated_at:     new Date().toISOString(),
      notes:          `Reagendado por cajero — nuevo horario: ${new_departure_time} del ${new_date}`,
    }

    // Si encontramos un trip exacto, lo enlazamos
    if (trip) update.trip_id = trip.id

    const { error } = await service
      .from('bookings')
      .update(update)
      .eq('id', booking.id)

    if (error) return NextResponse.json({ error: 'Error al reagendar: ' + error.message }, { status: 500 })

    return NextResponse.json({
      ok:   true,
      msg:  `Boleto reagendado al ${new_date} a las ${new_departure_time}`,
      trip_linked: !!trip,
    })
  }

  if (leg === 'return') {
    if (booking.ticket_type !== 'round_trip') {
      return NextResponse.json({ error: 'Este boleto no tiene tramo de regreso.' }, { status: 400 })
    }

    const alreadyReturned = passengers.length > 0 && passengers.every(p => p.return_checked_in)
    if (alreadyReturned) {
      return NextResponse.json({ error: 'El pasajero ya abordó el tramo de regreso. No se puede reagendar.' }, { status: 400 })
    }

    const { error } = await service
      .from('bookings')
      .update({
        return_date: new_date,
        updated_at:  new Date().toISOString(),
        notes:       `Regreso reagendado por cajero — nueva fecha: ${new_date}`,
      })
      .eq('id', booking.id)

    if (error) return NextResponse.json({ error: 'Error al reagendar regreso: ' + error.message }, { status: 500 })

    return NextResponse.json({
      ok:  true,
      msg: `Regreso reagendado para el ${new_date}`,
    })
  }

  return NextResponse.json({ error: 'Tramo inválido.' }, { status: 400 })
}
