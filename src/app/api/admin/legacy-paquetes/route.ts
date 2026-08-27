import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function queryProxy(q: string, limit: number) {
  const base = process.env.AWS_PROXY_URL?.replace('boleto.php', 'paquete.php')
    ?? 'http://54.212.85.161/api/paquete.php'
  const key  = process.env.AWS_PROXY_KEY ?? 'teo2026'
  try {
    const res = await fetch(`${base}?q=${encodeURIComponent(q)}&key=${key}&limit=${limit}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { paquetes: unknown[] }
    return (data.paquetes ?? []).map((p: any) => ({
      id:             p.id_paquete,
      codigo:         p.codigo,
      tipo:           p.id_tipopaquete,
      precio:         Number(p.calculo ?? p.precio ?? 0),
      peso:           Number(p.peso ?? 0),
      status:         Number(p.status ?? 0),
      vendedor:       p.vendedor ?? null,
      remitente:      p.ras_remitente ?? null,
      receptor:       p.ras_receptor ?? null,
      contacto:       p.numeroContacto ?? null,
      fecha_envio:    p.ras_fechaenvio ?? null,
      origen:         p.ras_envio ?? null,
      destino:        p.ras_destino ?? null,
      num_rastreo:    p.ras_numrastreo ?? null,
      source:         'legacy',
    }))
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const q      = req.nextUrl.searchParams.get('q') ?? ''
  const limit  = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 60), 200)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0)

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

  if ((data ?? []).length > 0) {
    return NextResponse.json({ paquetes: data, total: count ?? 0 })
  }

  // Supabase vacío — consultar sistema antiguo vía PHP proxy
  const legacy = await queryProxy(q, limit)
  return NextResponse.json({ paquetes: legacy, total: legacy.length })
}
