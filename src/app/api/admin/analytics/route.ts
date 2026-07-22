import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
}

// Last 12 months keys
function last12Months() {
  const keys: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function getSucursalCode(description: string | null): string {
  const match = description?.match(/^\[([A-Z0-9]+)\]/)
  return match?.[1] ?? 'OTRO'
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const service = svc()
  const from12 = new Date(new Date().setMonth(new Date().getMonth() - 11))
  from12.setDate(1)
  from12.setHours(0, 0, 0, 0)
  const fromISO = from12.toISOString()

  const [txRes, gastosRes, bookingsRes] = await Promise.all([
    service.from('qb_transactions').select('created_at, type, amount, description, doc_number, reference_type').gte('created_at', fromISO),
    service.from('gastos').select('date, amount, category, sucursal_id, sucursales(name, code)').gte('date', fromISO.split('T')[0]) as any,
    service.from('bookings').select('created_at, total_amount, sucursal_id, status, origin_name, destination_name, trips(schedules(routes(name, code))), sucursales(name, code)').gte('created_at', fromISO) as any,
  ])

  const txs     = (txRes.data      ?? []) as any[]
  const gastos  = (gastosRes.data  ?? []) as any[]
  const bookings = (bookingsRes.data ?? []) as any[]

  const months = last12Months()

  // ── Monthly revenue vs expenses ──
  const monthlyMap = new Map<string, { ingresos: number; gastos: number }>()
  months.forEach(m => monthlyMap.set(m, { ingresos: 0, gastos: 0 }))

  for (const t of txs) {
    const mk = monthKey(t.created_at)
    if (!monthlyMap.has(mk)) continue
    const entry = monthlyMap.get(mk)!
    if (t.type === 'purchase') {
      entry.gastos += Number(t.amount)
    } else {
      entry.ingresos += Number(t.amount)
    }
  }
  const monthly = months.map(mk => ({
    mes:      monthLabel(mk),
    ingresos: Math.round(monthlyMap.get(mk)!.ingresos),
    gastos:   Math.round(monthlyMap.get(mk)!.gastos),
    utilidad: Math.round(monthlyMap.get(mk)!.ingresos - monthlyMap.get(mk)!.gastos),
  }))

  // ── Revenue by channel ──
  const channel = { online: 0, efectivo: 0, tarjeta: 0 }
  for (const t of txs) {
    if (t.type === 'purchase') continue
    if (t.reference_type === 'booking_online') { channel.online += Number(t.amount); continue }
    if (t.doc_number?.endsWith('-TC'))          { channel.tarjeta += Number(t.amount); continue }
    channel.efectivo += Number(t.amount)
  }
  const channels = [
    { name: 'Online',   value: Math.round(channel.online),   color: '#7c3aed' },
    { name: 'Efectivo', value: Math.round(channel.efectivo), color: '#059669' },
    { name: 'Tarjeta',  value: Math.round(channel.tarjeta),  color: '#2563eb' },
  ]

  // ── Revenue by sucursal ──
  const sucursalMap = new Map<string, number>()
  for (const t of txs) {
    if (t.type === 'purchase') continue
    const code = getSucursalCode(t.description)
    sucursalMap.set(code, (sucursalMap.get(code) ?? 0) + Number(t.amount))
  }
  const bySucursal = Array.from(sucursalMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // ── Expenses by category ──
  const catMap = new Map<string, number>()
  for (const g of gastos) {
    catMap.set(g.category, (catMap.get(g.category) ?? 0) + Number(g.amount))
  }
  const byCategory = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // ── Top routes by bookings ──
  const routeMap = new Map<string, { bookings: number; revenue: number }>()
  for (const b of bookings) {
    if (b.status !== 'confirmed') continue
    // Use stored origin/destination names when available (new bookings),
    // fall back to the route name from the trip → schedule → route join.
    const key = b.origin_name && b.destination_name
      ? `${b.origin_name} → ${b.destination_name}`
      : (b.trips?.schedules?.routes?.name ?? '?')
    const entry  = routeMap.get(key) ?? { bookings: 0, revenue: 0 }
    entry.bookings++
    entry.revenue += Number(b.total_amount ?? 0)
    routeMap.set(key, entry)
  }
  const topRoutes = Array.from(routeMap.entries())
    .map(([name, v]) => ({ name, bookings: v.bookings, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  // ── Bookings by branch ──
  const branchBookMap = new Map<string, { bookings: number; revenue: number }>()
  for (const b of bookings) {
    if (b.status !== 'confirmed') continue
    const name = b.sucursales?.name ?? 'Online'
    const entry = branchBookMap.get(name) ?? { bookings: 0, revenue: 0 }
    entry.bookings++
    entry.revenue += Number(b.total_amount ?? 0)
    branchBookMap.set(name, entry)
  }
  const byBranch = Array.from(branchBookMap.entries())
    .map(([name, v]) => ({ name, bookings: v.bookings, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Summary totals ──
  const totalIngresos = txs.filter(t => t.type !== 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const totalGastos   = txs.filter(t => t.type === 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const totalBookings = bookings.filter((b: any) => b.status === 'confirmed').length

  return NextResponse.json({
    monthly, channels, bySucursal, byCategory, topRoutes, byBranch,
    summary: {
      totalIngresos: Math.round(totalIngresos),
      totalGastos:   Math.round(totalGastos),
      utilidad:      Math.round(totalIngresos - totalGastos),
      totalBookings,
    }
  })
}
