import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const tracking = req.nextUrl.searchParams.get('n')?.toUpperCase().trim()
  if (!tracking) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })

  const db = svc()

  const { data: pkg, error } = await db
    .from('packages')
    .select(`
      id, tracking_number, sender_name, sender_phone,
      recipient_name, recipient_phone,
      size, weight_lbs, price, status, notes, created_at, updated_at,
      origin:stops!packages_origin_stop_id_fkey(name, city),
      destination:stops!packages_destination_stop_id_fkey(name, city)
    `)
    .eq('tracking_number', tracking)
    .maybeSingle()

  if (error)   return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pkg)    return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })

  const { data: events } = await db
    .from('package_events')
    .select('status, location, notes, created_at')
    .eq('package_id', pkg.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ package: pkg, events: events ?? [] })
}
