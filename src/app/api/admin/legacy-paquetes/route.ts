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
    return (data.paquetes ?? []).map((p: any) => {
    const recibio = !!(p.nombre_recibe && String(p.nombre_recibe).trim().length > 0)
    const fechaRec = p.fecha_recepcion ? String(p.fecha_recepcion) : null
    const entregado = recibio || !!(fechaRec && !fechaRec.startsWith('1901'))
    return {
      id:              p.id_paquete,
      codigo:          p.codigo,
      tipo:            p.id_tipopaquete,
      precio:          Number(p.calculo ?? p.precio ?? 0),
      peso:            Number(p.peso ?? 0),
      vendedor:        p.vendedor ?? null,
      remitente:       p.ras_remitente ?? null,
      receptor:        p.ras_receptor ?? null,
      receptor2:       p.ras_receptor_2 ?? null,
      contacto:        p.numeroContacto ?? null,
      fecha_envio:     p.ras_fechaenvio ?? null,
      hora_envio:      p.ras_horaenvio ?? null,
      origen:          p.ras_envio ?? null,
      destino:         p.ras_destino ?? null,
      num_rastreo:     p.ras_numrastreo ?? null,
      descripcion:     p.descripcion ?? null,
      direccion:       p.direccion ?? null,
      entregado,
      nombre_recibe:   p.nombre_recibe ?? null,
      fecha_recepcion: fechaRec,
      source:          'legacy',
    }
  })
  } catch { return [] }
}

function mirrorRowToPaquete(r: any) {
  const recibio   = !!(r.nombre_recibe && String(r.nombre_recibe).trim())
  const fechaRec  = r.fecha_recepcion ? String(r.fecha_recepcion) : null
  const entregado = recibio || !!(fechaRec && !fechaRec.startsWith('1901'))
  return {
    id:              r.id_paquete,
    codigo:          r.codigo,
    tipo:            r.tipo,
    precio:          Number(r.precio ?? 0),
    peso:            Number(r.peso ?? 0),
    vendedor:        r.vendedor        ?? null,
    remitente:       r.ras_remitente   ?? null,
    receptor:        r.ras_receptor    ?? null,
    receptor2:       r.ras_receptor_2  ?? null,
    contacto:        r.numero_contacto ?? null,
    fecha_envio:     r.ras_fechaenvio  ?? null,
    hora_envio:      r.ras_horaenvio   ?? null,
    origen:          r.ras_envio       ?? null,
    destino:         r.ras_destino     ?? null,
    num_rastreo:     r.ras_numrastreo  ?? null,
    descripcion:     r.descripcion     ?? null,
    direccion:       r.direccion       ?? null,
    entregado,
    nombre_recibe:   r.nombre_recibe   ?? null,
    fecha_recepcion: fechaRec,
    source:          'legacy',
    from_mirror:     true,
  }
}

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const q      = req.nextUrl.searchParams.get('q') ?? ''
  const limit  = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 60), 200)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0)

  // 1. Intentar PHP proxy primero (datos en vivo)
  const live = await queryProxy(q, limit)
  if (live.length > 0) {
    return NextResponse.json({ paquetes: live, total: live.length })
  }

  // 2. PHP proxy vacío o caído — intentar mirror de Supabase
  let mirrorQuery = svc()
    .from('legacy_paquetes_mirror')
    .select('*', { count: 'exact' })
    .order('ras_fechaenvio', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) {
    mirrorQuery = mirrorQuery.or(
      `codigo.ilike.%${q}%,ras_remitente.ilike.%${q}%,ras_receptor.ilike.%${q}%,` +
      `numero_contacto.ilike.%${q}%,ras_destino.ilike.%${q}%,ras_envio.ilike.%${q}%`
    )
  }

  const { data: mirrorData, count } = await mirrorQuery
  if ((mirrorData ?? []).length > 0) {
    return NextResponse.json({
      paquetes:    (mirrorData ?? []).map(mirrorRowToPaquete),
      total:       count ?? 0,
      from_mirror: true,
    })
  }

  // 3. Consultar legacy_paquetes (tabla TEO para paquetes migrados manualmente)
  let teoQuery = svc()
    .from('legacy_paquetes')
    .select('*', { count: 'exact' })
    .order('fecha_envio', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) {
    teoQuery = teoQuery.or(
      `codigo.ilike.%${q}%,remitente.ilike.%${q}%,receptor.ilike.%${q}%,` +
      `origen.ilike.%${q}%,destino.ilike.%${q}%,contacto.ilike.%${q}%`
    )
  }

  const { data: teoData, error: teoErr, count: teoCount } = await teoQuery
  if (teoErr) return NextResponse.json({ error: teoErr.message }, { status: 500 })

  return NextResponse.json({ paquetes: teoData ?? [], total: teoCount ?? 0 })
}
