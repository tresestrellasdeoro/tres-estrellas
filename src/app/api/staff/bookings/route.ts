import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/staff/bookings?q=...&date=YYYY-MM-DD
// Busca reservaciones por nombre, correo o número — con filtro opcional de fecha de viaje
export async function GET(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny

  const q    = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const date = req.nextUrl.searchParams.get('date')?.trim() ?? ''

  if (!q && !date) return NextResponse.json({ bookings: [] })

  const service = getService()

  // Columns shared across all result rows
  const SELECT = `
    id, booking_number, status, ticket_type, total_amount, payment_method,
    guest_email, created_at, return_date,
    passengers(id, full_name, passenger_type, price, checked_in, checked_in_at, return_checked_in, return_checked_in_at)
  `

  // ── Step 1: resolve booking IDs from passenger names ─────────────────
  let bookingIdsFromName: string[] = []
  if (q) {
    const { data: passengerRows } = await service
      .from('passengers')
      .select('booking_id')
      .ilike('full_name', `%${q}%`)
      .limit(50)
    bookingIdsFromName = (passengerRows ?? []).map((p: any) => p.booking_id)
  }

  // ── Step 2: resolve trip IDs from departure date ──────────────────────
  let tripIds: string[] = []
  if (date) {
    const { data: tripRows } = await service
      .from('trips')
      .select('id')
      .eq('departure_date', date)
      .limit(100)
    tripIds = (tripRows ?? []).map((t: any) => t.id)
  }

  // ── Step 3: build main bookings query ─────────────────────────────────
  let query = service
    .from('bookings')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(40)

  // Text filter — email, booking number, or passenger name match
  if (q) {
    const orParts = [`guest_email.ilike.%${q}%`, `booking_number.ilike.%${q}%`]
    if (bookingIdsFromName.length > 0) {
      orParts.push(`id.in.(${bookingIdsFromName.join(',')})`)
    }
    query = query.or(orParts.join(','))
  }

  // Date filter via trip
  if (tripIds.length > 0) {
    query = query.in('trip_id', tripIds)
  } else if (date) {
    // No trips found for that date → no results
    return NextResponse.json({ bookings: [] })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings: data ?? [] })
}

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
