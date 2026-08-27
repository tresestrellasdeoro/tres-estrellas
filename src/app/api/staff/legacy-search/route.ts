import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function mirrorRowToResult(r: any) {
  return {
    bolId:         String(r.bol_id),
    bolVenta:      r.bol_venta   ? String(r.bol_venta)  : null,
    nombreCliente: r.nombre_cliente ?? '',
    contacto:      r.contacto    ?? null,
    bolCosto:      String(r.bol_costo ?? 0),
    tipoCliente:   String(r.tipo_cliente ?? 1),
    bolDetFecha:   r.det_fecha   ?? null,
    bolDetHora:    r.det_hora    ?? null,
    bolDetAsiento: r.det_asiento ? String(r.det_asiento) : null,
    tipoViaje:     String(r.tipo_viaje ?? 1),
    origen_nombre: r.origen_nombre ?? '',
    origen_clave:  r.origen_clave  ?? '',
    destino_nombre: r.destino_nombre ?? '',
    destino_clave:  r.destino_clave  ?? '',
    from_mirror:   true,
  }
}

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ resultados: [] })

  const base = (process.env.AWS_PROXY_URL ?? 'http://54.212.85.161/api/boleto.php')
    .replace('boleto.php', 'search.php')
  const key = process.env.AWS_PROXY_KEY ?? 'teo2026'

  try {
    const res = await fetch(
      `${base}?q=${encodeURIComponent(q)}&key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error('proxy error')
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    // Servidor caído — fallback al mirror de Supabase
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data } = await svc()
      .from('legacy_boletos_mirror')
      .select('*')
      .or(`nombre_cliente.ilike.%${q}%,contacto.ilike.%${q}%`)
      .gte('det_fecha', desde)
      .order('det_fecha', { ascending: true })
      .limit(20)

    return NextResponse.json({
      resultados:  (data ?? []).map(mirrorRowToResult),
      from_mirror: true,
    })
  }
}
