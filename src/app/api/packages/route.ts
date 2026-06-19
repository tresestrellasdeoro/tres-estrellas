import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { generateTrackingNumber, PACKAGE_SIZES, type PackageSize } from '@/lib/packages'
import { requireAuth } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — list packages (customer: own; admin/staff: all + search)
export async function GET(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = svc()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle() as { data: { role: string } | null }

  const isAdmin = ['admin', 'super_admin', 'cajero'].includes(profile?.role ?? '')
  const search  = req.nextUrl.searchParams.get('q') ?? ''
  const limit   = Number(req.nextUrl.searchParams.get('limit') ?? 50)

  let query = db
    .from('packages')
    .select(`
      id, tracking_number, sender_name, sender_phone,
      recipient_name, recipient_phone,
      size, weight_lbs, price, status, created_at, notes,
      origin:stops!packages_origin_stop_id_fkey(name, city),
      destination:stops!packages_destination_stop_id_fkey(name, city)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!isAdmin) {
    query = query.eq('customer_id', user.id)
  } else if (search) {
    query = query.or(`tracking_number.ilike.%${search}%,sender_name.ilike.%${search}%,recipient_name.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ packages: data ?? [] })
}

// POST — create new package
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await req.json()
  const {
    sender_name, sender_phone, sender_email,
    recipient_name, recipient_phone, recipient_email,
    origin_stop_id, destination_stop_id,
    size, weight_lbs, declared_value, notes,
  } = body

  if (!sender_name || !sender_phone || !recipient_name || !recipient_phone || !origin_stop_id || !destination_stop_id || !size) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const sizeInfo = PACKAGE_SIZES[size as PackageSize]
  if (!sizeInfo) return NextResponse.json({ error: 'Tamaño inválido' }, { status: 422 })

  const db    = svc()
  let tracking = generateTrackingNumber()

  // Ensure unique tracking number
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await db.from('packages').select('id').eq('tracking_number', tracking).maybeSingle()
    if (!existing) break
    tracking = generateTrackingNumber()
  }

  const { data: pkg, error } = await db
    .from('packages')
    .insert({
      tracking_number:     tracking,
      sender_name,
      sender_phone,
      sender_email:        sender_email ?? null,
      recipient_name,
      recipient_phone,
      recipient_email:     recipient_email ?? null,
      origin_stop_id,
      destination_stop_id,
      size,
      weight_lbs:          Number(weight_lbs ?? 0),
      declared_value:      Number(declared_value ?? 0),
      price:               sizeInfo.price,
      status:              'label_created',
      customer_id:         user?.id ?? null,
      notes:               notes ?? null,
    })
    .select('*, origin:stops!packages_origin_stop_id_fkey(name,city), destination:stops!packages_destination_stop_id_fkey(name,city)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create first event
  await db.from('package_events').insert({
    package_id: pkg.id,
    status:     'label_created',
    location:   null,
    notes:      'Etiqueta creada',
    created_by: user?.id ?? null,
  })

  return NextResponse.json({ package: pkg }, { status: 201 })
}

// PATCH — update status (staff/admin)
export async function PATCH(req: NextRequest) {
  const deny = await requireAuth(); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, tracking_number, status, location, notes } = await req.json()
  if ((!id && !tracking_number) || !status) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 422 })
  }

  const db = svc()

  let pkgId = id
  if (!pkgId && tracking_number) {
    const { data } = await db.from('packages').select('id').eq('tracking_number', tracking_number).maybeSingle()
    pkgId = data?.id
    if (!pkgId) return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
  }

  const { data: pkg, error } = await db
    .from('packages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', pkgId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('package_events').insert({
    package_id: pkgId,
    status,
    location:   location ?? null,
    notes:      notes ?? null,
    created_by: user.id,
  })

  return NextResponse.json({ package: pkg })
}
