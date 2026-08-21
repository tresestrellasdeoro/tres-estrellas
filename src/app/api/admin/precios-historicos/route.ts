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

  const origen  = req.nextUrl.searchParams.get('origen') ?? ''
  const destino = req.nextUrl.searchParams.get('destino') ?? ''

  let query = svc().from('legacy_precios').select('*').order('origen').order('destino').order('tipo_viaje')

  if (origen)  query = query.eq('origen', origen.toUpperCase())
  if (destino) query = query.eq('destino', destino.toUpperCase())

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: 'Error al cargar' }, { status: 500 })

  // Orígenes y destinos únicos para los filtros
  const { data: codes } = await svc()
    .from('legacy_precios')
    .select('origen, destino')

  const origenes  = [...new Set(codes?.map(r => r.origen)  ?? [])].sort()
  const destinos  = [...new Set(codes?.map(r => r.destino) ?? [])].sort()

  return NextResponse.json({ precios: data ?? [], origenes, destinos })
}
