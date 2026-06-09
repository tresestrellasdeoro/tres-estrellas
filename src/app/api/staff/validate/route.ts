import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const booking = req.nextUrl.searchParams.get('booking')
  if (!booking) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })

  const service = getService()
  const { data, error } = await service
    .from('bookings')
    .select('id, booking_number, status, ticket_type, total_amount, payment_method, guest_email, created_at, passengers(id, full_name, passenger_type, price, checked_in, checked_in_at)')
    .eq('booking_number', booking)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { booking_number } = await req.json()
  if (!booking_number) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })

  const service = getService()

  const { data: booking } = await service
    .from('bookings')
    .select('id')
    .eq('booking_number', booking_number)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { error } = await service
    .from('passengers')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('booking_id', booking.id)
    .eq('checked_in', false)

  if (error) return NextResponse.json({ error: 'Error al registrar abordaje' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
