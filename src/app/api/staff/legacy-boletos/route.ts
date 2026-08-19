import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const q      = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const date   = req.nextUrl.searchParams.get('date') ?? ''
  const ticket = req.nextUrl.searchParams.get('ticket')?.trim().toUpperCase() ?? ''

  if (!q && !date && !ticket) {
    return NextResponse.json({ error: 'Proporciona al menos un criterio de búsqueda' }, { status: 400 })
  }

  const service = getService()

  // Búsqueda por número exacto de boleto (TEO123456)
  if (ticket) {
    const normalized = ticket.startsWith('TEO') ? ticket.slice(3) : ticket
    const { data, error } = await service
      .from('legacy_bookings')
      .select('*')
      .or(`ticket_id.eq.${normalized},booking_number.ilike.%${ticket}%`)
      .limit(20)

    if (error) return NextResponse.json({ error: 'Error al buscar' }, { status: 500 })
    return NextResponse.json({ results: data ?? [] })
  }

  // Búsqueda por nombre y/o fecha
  let query = service.from('legacy_bookings').select('*')

  if (q) {
    query = query.ilike('passenger_name', `%${q}%`)
  }

  if (date) {
    query = query.eq('travel_date', date)
  }

  query = query.order('travel_date', { ascending: false }).limit(50)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al buscar' }, { status: 500 })

  return NextResponse.json({ results: data ?? [] })
}
