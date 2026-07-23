import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Converts "3:20 AM" → "03:20:00" to match DB TIME column format
function parseTimeToDb(timeStr: string): string {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return timeStr
  let h = parseInt(m[1])
  const period = m[3].toUpperCase()
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m[2]}:00`
}

// GET /api/bookings/seats?date=YYYY-MM-DD&departure_time=3:20+AM
// Returns the seat numbers already taken for a specific trip
export async function GET(req: NextRequest) {
  const date          = req.nextUrl.searchParams.get('date')
  const departureTime = req.nextUrl.searchParams.get('departure_time')

  if (!date || !departureTime) return NextResponse.json({ seats: [] })

  const service = svc()
  const departureTimeDb = parseTimeToDb(departureTime)

  const { data: trip } = await service
    .from('trips')
    .select('id')
    .eq('departure_date', date)
    .eq('departure_time', departureTimeDb)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (!trip?.id) return NextResponse.json({ seats: [] })

  const { data } = await service
    .from('passengers')
    .select('seat_number, bookings!inner(trip_id, status)')
    .eq('bookings.trip_id', trip.id)
    .not('bookings.status', 'in', '("cancelled","refunded")')
    .not('seat_number', 'is', null) as any

  const seats = (data ?? [])
    .map((r: any) => r.seat_number)
    .filter(Boolean) as string[]

  return NextResponse.json({ seats })
}
