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

  const service = svc()

  const { data, error } = await service
    .from('legacy_bookings')
    .select('travel_date, amount, ticket_type, origin_code, destination_code, sold_by, cancelled, passenger_type')

  if (error) return NextResponse.json({ error: 'Error al cargar datos' }, { status: 500 })

  const rows = data ?? []

  // ── Por año ──
  const byYear: Record<string, { boletos: number; ingresos: number; roundtrip: number; cancelados: number }> = {}
  for (const r of rows) {
    const y = r.travel_date.slice(0, 4)
    if (!byYear[y]) byYear[y] = { boletos: 0, ingresos: 0, roundtrip: 0, cancelados: 0 }
    byYear[y].boletos++
    byYear[y].ingresos += Number(r.amount)
    if (r.ticket_type === 'round_trip') byYear[y].roundtrip++
    if (r.cancelled) byYear[y].cancelados++
  }
  const porAnio = Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({
      year,
      boletos:    v.boletos,
      ingresos:   Math.round(v.ingresos),
      roundtrip:  v.roundtrip,
      cancelados: v.cancelados,
    }))

  // ── Top rutas ──
  const routeMap: Record<string, { boletos: number; ingresos: number }> = {}
  for (const r of rows) {
    const key = `${r.origin_code}-${r.destination_code}`
    if (!routeMap[key]) routeMap[key] = { boletos: 0, ingresos: 0 }
    routeMap[key].boletos++
    routeMap[key].ingresos += Number(r.amount)
  }
  const topRutas = Object.entries(routeMap)
    .map(([ruta, v]) => ({ ruta, boletos: v.boletos, ingresos: Math.round(v.ingresos) }))
    .sort((a, b) => b.boletos - a.boletos)
    .slice(0, 10)

  // ── Top cajeros ──
  const cajeroMap: Record<string, number> = {}
  for (const r of rows) {
    if (!r.sold_by) continue
    cajeroMap[r.sold_by] = (cajeroMap[r.sold_by] ?? 0) + 1
  }
  const topCajeros = Object.entries(cajeroMap)
    .map(([cajero, boletos]) => ({ cajero, boletos }))
    .sort((a, b) => b.boletos - a.boletos)
    .slice(0, 10)

  // ── Resumen ──
  const total = rows.length
  const totalIngresos  = rows.reduce((s, r) => s + Number(r.amount), 0)
  const totalCancelados = rows.filter(r => r.cancelled).length
  const totalRoundtrip  = rows.filter(r => r.ticket_type === 'round_trip').length
  const mejorAnio = porAnio.reduce((a, b) => b.ingresos > a.ingresos ? b : a, porAnio[0])

  return NextResponse.json({
    porAnio,
    topRutas,
    topCajeros,
    resumen: {
      total,
      totalIngresos:   Math.round(totalIngresos),
      totalCancelados,
      totalRoundtrip,
      pctRoundtrip:    Math.round((totalRoundtrip / total) * 100),
      pctCancelados:   Math.round((totalCancelados / total) * 10) / 10,
      mejorAnio:       mejorAnio?.year ?? '—',
      mejorAnioIngresos: mejorAnio?.ingresos ?? 0,
    }
  })
}
