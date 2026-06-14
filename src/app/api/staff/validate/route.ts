import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny
  const booking = req.nextUrl.searchParams.get('booking')
  if (!booking) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })

  const service = getService()
  const { data, error } = await service
    .from('bookings')
    .select('id, booking_number, status, ticket_type, total_amount, payment_method, guest_email, created_at, return_date, passengers(id, full_name, passenger_type, price, checked_in, checked_in_at, return_checked_in, return_checked_in_at)')
    .eq('booking_number', booking)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny
  const body = await req.json()
  const { booking_number, leg } = body as { booking_number: string; leg: 'outbound' | 'return' }

  if (!booking_number) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })
  if (!leg) return NextResponse.json({ error: 'Tramo requerido (outbound/return)' }, { status: 400 })

  const service = getService()

  const { data: booking } = await service
    .from('bookings')
    .select('id, ticket_type, passengers(id, checked_in, return_checked_in)')
    .eq('booking_number', booking_number)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const passengers = (booking.passengers ?? []) as { id: string; checked_in: boolean; return_checked_in: boolean }[]

  if (leg === 'return') {
    if (booking.ticket_type !== 'round_trip') {
      return NextResponse.json({ error: 'Este boleto no tiene tramo de regreso.' }, { status: 400 })
    }

    // Return leg only allowed if outbound already done for ALL passengers
    const outboundDone = passengers.length > 0 && passengers.every(p => p.checked_in)
    if (!outboundDone) {
      return NextResponse.json(
        { error: 'El tramo de ida aún no ha sido registrado. Registra primero el abordaje de ida.' },
        { status: 400 }
      )
    }

    // Guard: all passengers already have return checked in
    const alreadyDone = passengers.every(p => p.return_checked_in)
    if (alreadyDone) {
      return NextResponse.json({ error: 'El tramo de regreso ya fue registrado anteriormente.' }, { status: 400 })
    }

    const { error } = await service
      .from('passengers')
      .update({ return_checked_in: true, return_checked_in_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .eq('return_checked_in', false)

    if (error) return NextResponse.json({ error: 'Error al registrar regreso' }, { status: 500 })

    // Mark booking as used when return is done
    await service.from('bookings').update({ status: 'used' }).eq('id', booking.id)

  } else {
    // Guard: outbound already fully done
    const alreadyBoarded = passengers.length > 0 && passengers.every(p => p.checked_in)
    if (alreadyBoarded) {
      return NextResponse.json({ error: 'El abordaje de ida ya fue registrado anteriormente.' }, { status: 400 })
    }

    // Outbound leg
    const { error } = await service
      .from('passengers')
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .eq('checked_in', false)

    if (error) return NextResponse.json({ error: 'Error al registrar abordaje' }, { status: 500 })

    // For one-way trips, mark as used immediately
    if (booking.ticket_type === 'one_way') {
      await service.from('bookings').update({ status: 'used' }).eq('id', booking.id)
    }
  }

  return NextResponse.json({ ok: true })
}
