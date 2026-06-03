import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const BookingSchema = z.object({
  trip_id:    z.string().uuid(),
  ticket_type: z.enum(['one_way', 'round_trip']),
  total_amount: z.number().positive(),
  passengers: z.array(z.object({
    full_name:     z.string().min(2),
    passenger_type: z.enum(['adult', 'child', 'senior']),
    terminal_id:   z.string().uuid(),
    price:         z.number().positive(),
  })).min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = BookingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { trip_id, ticket_type, total_amount, passengers } = parsed.data

  // Check seats
  const { data: trip } = await supabase
    .from('trips')
    .select('seats_available')
    .eq('id', trip_id)
    .single() as { data: { seats_available: number } | null }

  if (!trip || trip.seats_available < passengers.length) {
    return NextResponse.json({ error: 'No hay suficientes lugares disponibles' }, { status: 409 })
  }

  // Create booking
  const bookingResult = await (supabase.from('bookings') as any)
    .insert({
      trip_id,
      customer_id: user.id,
      ticket_type,
      status: 'pending',
      total_amount,
      points_earned: Math.floor(total_amount),
    })
    .select()
    .single()

  const booking    = bookingResult.data as { id: string; booking_number: string } | null
  const bookingError = bookingResult.error

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Error al crear la reservación' }, { status: 500 })
  }

  // Create passengers
  const passengersToInsert = passengers.map(p => ({
    booking_id:     booking.id,
    full_name:      p.full_name,
    passenger_type: p.passenger_type,
    terminal_id:    p.terminal_id,
    price:          p.price,
  }))

  const { error: passError } = await (supabase.from('passengers') as any).insert(passengersToInsert)

  if (passError) {
    await (supabase.from('bookings') as any).delete().eq('id', booking.id)
    return NextResponse.json({ error: 'Error al registrar los pasajeros' }, { status: 500 })
  }

  return NextResponse.json({ booking_id: booking.id, booking_number: booking.booking_number }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, passengers(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ bookings })
}
