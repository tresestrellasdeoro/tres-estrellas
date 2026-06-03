import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const origin      = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const date        = searchParams.get('date')

  if (!origin || !destination || !date) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: originStop }      = await supabase.from('stops').select('id').eq('code', origin).single() as { data: { id: string } | null }
  const { data: destinationStop } = await supabase.from('stops').select('id').eq('code', destination).single() as { data: { id: string } | null }

  if (!originStop || !destinationStop) {
    return NextResponse.json({ error: 'Invalid stops' }, { status: 400 })
  }

  const { data: trips, error } = await supabase
    .from('trips')
    .select(`
      id, trip_number, departure_date, departure_time, estimated_arrival,
      status, seats_available, seats_total,
      bus:buses(amenities),
      schedule:schedules(
        route:routes(
          id, code,
          origin_stop:stops!routes_origin_stop_id_fkey(id, name, code),
          destination_stop:stops!routes_destination_stop_id_fkey(id, name, code),
          pricing(passenger_type, ticket_type, price, terminal_id)
        )
      )
    `)
    .eq('departure_date', date)
    .eq('status', 'scheduled')
    .order('departure_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filtered = (trips || []).filter((t: any) =>
    t.schedule?.route?.origin_stop?.id === originStop.id &&
    t.schedule?.route?.destination_stop?.id === destinationStop.id
  )

  return NextResponse.json({ trips: filtered })
}
