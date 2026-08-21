import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const q       = req.nextUrl.searchParams.get('q') ?? ''
  const limit   = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 60), 200)
  const offset  = Number(req.nextUrl.searchParams.get('offset') ?? 0)

  let query = svc()
    .from('legacy_paquetes')
    .select('*', { count: 'exact' })
    .order('fecha_envio', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(
      `codigo.ilike.%${q}%,remitente.ilike.%${q}%,receptor.ilike.%${q}%,` +
      `origen.ilike.%${q}%,destino.ilike.%${q}%,contacto.ilike.%${q}%`
    )
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ paquetes: data ?? [], total: count ?? 0 })
}
