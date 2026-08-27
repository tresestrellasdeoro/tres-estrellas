import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — check if already boarded
export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const booking = req.nextUrl.searchParams.get('booking')?.trim()
  const date    = req.nextUrl.searchParams.get('date')?.trim()
  if (!booking || !date) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  const { data, error } = await svc()
    .from('boardings')
    .select('boarded_at, boarded_by_name, seat, notes')
    .eq('booking_number', booking)
    .eq('travel_date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ boarded: !!data, boarding: data ?? null })
}

// POST — mark as boarded
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await req.json()
  const { booking_number, travel_date, source, passenger_name, origin_code, destination_code, travel_time, seat } = body

  if (!booking_number || !travel_date) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 422 })
  }

  const db = svc()

  // Get staff name
  let boarded_by_name: string | null = null
  if (user) {
    const { data: profile } = await db.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    boarded_by_name = profile?.full_name ?? null
  }

  const { data, error } = await db
    .from('boardings')
    .upsert({
      booking_number,
      travel_date,
      source:          source ?? 'legacy',
      passenger_name:  passenger_name ?? null,
      origin_code:     origin_code ?? null,
      destination_code: destination_code ?? null,
      travel_time:     travel_time ?? null,
      seat:            seat ?? null,
      boarded_at:      new Date().toISOString(),
      boarded_by:      user?.id ?? null,
      boarded_by_name,
    }, { onConflict: 'booking_number,travel_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ boarding: data })
}
