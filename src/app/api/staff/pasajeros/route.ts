import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function fetchLegacy(date: string, hora?: string, origen?: string) {
  const base = (process.env.AWS_PROXY_URL ?? 'http://54.212.85.161/api/boleto.php')
    .replace('boleto.php', 'passengers.php')
  const key  = process.env.AWS_PROXY_KEY ?? 'teo2026'
  const params = new URLSearchParams({ fecha: date, key })
  if (hora)   params.set('hora', hora)
  if (origen) params.set('origen', origen)
  try {
    const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return []
    const data = await res.json() as { pasajeros: any[] }
    return (data.pasajeros ?? []).map((p: any) => ({
      booking_number:  String(p.bolId),
      folio:           p.bolVenta ? String(p.bolVenta) : null,
      passenger_name:  String(p.nombreCliente ?? '').trim(),
      passenger_type:  Number(p.tipoCliente) === 2 ? 'senior' : Number(p.tipoCliente) === 3 ? 'child' : 'adult',
      phone:           p.contacto ?? null,
      origin_code:     p.origen_clave ?? '',
      origin_name:     p.origen_nombre ?? '',
      destination_code: p.destino_clave ?? '',
      destination_name: p.destino_nombre ?? '',
      travel_date:     p.bolDetFecha ?? date,
      travel_time:     p.bolDetHora ? String(p.bolDetHora).slice(0, 5) : null,
      seat:            p.bolDetAsiento ? Number(p.bolDetAsiento) : null,
      ticket_type:     Number(p.tipoViaje) === 2 ? 'round_trip' : 'one_way',
      amount:          Number(p.bolCosto ?? 0),
      sold_by:         p.bolUsuario ?? null,
      source:          'legacy' as const,
    }))
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const date   = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const hora   = req.nextUrl.searchParams.get('hora') ?? ''
  const origen = req.nextUrl.searchParams.get('origen') ?? ''

  const db = svc()

  // ── New system passengers ─────────────────────────────────────────────
  let newQuery = db
    .from('bookings')
    .select(`
      id, booking_number, status, ticket_type, total_amount, payment_method,
      departure_time, origin_name, destination_name,
      passengers(id, full_name, passenger_type, price, checked_in, checked_in_at)
    `)
    .eq('date', date)
    .neq('status', 'cancelled')
    .order('departure_time', { ascending: true })

  if (hora)   newQuery = newQuery.eq('departure_time', hora)
  if (origen) newQuery = newQuery.ilike('origin_name', `%${origen}%`)

  const { data: newBookings } = await newQuery

  const newPassengers = (newBookings ?? []).flatMap(b =>
    ((b.passengers as any[]) ?? []).map((p: any) => ({
      booking_number:   b.booking_number,
      folio:            null,
      passenger_name:   String(p.full_name ?? ''),
      passenger_type:   p.passenger_type ?? 'adult',
      phone:            null,
      origin_code:      '',
      origin_name:      b.origin_name ?? '',
      destination_code: '',
      destination_name: b.destination_name ?? '',
      travel_date:      date,
      travel_time:      b.departure_time ? String(b.departure_time).slice(0, 5) : null,
      seat:             null,
      ticket_type:      b.ticket_type,
      amount:           Number(b.total_amount ?? 0),
      sold_by:          null,
      boarded:          !!p.checked_in,
      boarded_at:       p.checked_in_at ?? null,
      source:           'new' as const,
    }))
  )

  // ── Legacy passengers ─────────────────────────────────────────────────
  const legacyRaw = await fetchLegacy(date, hora || undefined, origen || undefined)

  // ── Boarding status for legacy ────────────────────────────────────────
  const legacyNums = legacyRaw.map(p => p.booking_number)
  let boardingMap: Record<string, { boarded_at: string; boarded_by_name: string | null }> = {}

  if (legacyNums.length > 0) {
    const { data: boardings } = await db
      .from('boardings')
      .select('booking_number, boarded_at, boarded_by_name')
      .in('booking_number', legacyNums)
      .eq('travel_date', date)

    for (const b of boardings ?? []) {
      boardingMap[b.booking_number] = { boarded_at: b.boarded_at, boarded_by_name: b.boarded_by_name }
    }
  }

  const legacyPassengers = legacyRaw.map(p => ({
    ...p,
    boarded:    !!boardingMap[p.booking_number],
    boarded_at: boardingMap[p.booking_number]?.boarded_at ?? null,
  }))

  // ── Merge + sort by time ──────────────────────────────────────────────
  const all = [...newPassengers, ...legacyPassengers].sort((a, b) => {
    const ta = a.travel_time ?? '99:99'
    const tb = b.travel_time ?? '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return (a.seat ?? 999) - (b.seat ?? 999)
  })

  // Unique departure times for filter
  const hours = [...new Set(all.map(p => p.travel_time).filter(Boolean))].sort() as string[]

  return NextResponse.json({ pasajeros: all, total: all.length, hours })
}
