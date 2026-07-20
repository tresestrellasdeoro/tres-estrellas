import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to   = searchParams.get('to')   ?? new Date().toISOString().split('T')[0]

  const fromISO = `${from}T00:00:00.000Z`
  const toISO   = `${to}T23:59:59.999Z`

  const { data: bookings, error } = await svc()
    .from('bookings')
    .select('id, total_amount, sucursal_id, sold_by_user_id, sucursales(name, code), created_at')
    .eq('status', 'confirmed')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)
    .not('sold_by_user_id', 'is', null) as any

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by cajero (sold_by_user_id)
  const map = new Map<string, {
    user_id: string; name: string; sucursal: string; bookings: number; revenue: number
  }>()

  const userIds = [...new Set((bookings ?? []).map((b: any) => b.sold_by_user_id).filter(Boolean))]

  // Fetch profiles for all sellers
  const profileMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await svc()
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds) as any
    for (const p of profiles ?? []) profileMap.set(p.id, p.full_name ?? 'Sin nombre')
  }

  for (const b of bookings ?? []) {
    const uid = b.sold_by_user_id
    if (!uid) continue
    if (!map.has(uid)) {
      map.set(uid, {
        user_id:  uid,
        name:     profileMap.get(uid) ?? 'Sin nombre',
        sucursal: b.sucursales?.name ?? '—',
        bookings: 0,
        revenue:  0,
      })
    }
    const e = map.get(uid)!
    e.bookings++
    e.revenue += Number(b.total_amount ?? 0)
  }

  const cajeros = Array.from(map.values())
    .map(c => ({ ...c, revenue: Math.round(c.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json({ cajeros })
}
