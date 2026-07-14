import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Suspense } from 'react'
import ReportesClient from './reportes-client'

export const metadata = { title: 'Reportes — Admin' }
export const dynamic = 'force-dynamic'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export interface MonthData   { month: string; revenue: number; bookings: number }
export interface PaymentStat { method: string; count: number; pct: number; color: string }
export interface SucursalStat { id: string; name: string; code: string; revenue: number; bookings: number }
export interface EmpleadoStat { id: string; name: string; revenue: number; bookings: number; sucursal: string }
export interface CierreStat   {
  id: string; fecha: string; sucursal_name: string; sucursal_code: string
  total_boletos: number; total_efectivo: number; total_tarjeta: number
  total_paquetes: number; total_general: number; qb_synced: boolean
  empleado: string; notas: string | null
}

export interface ReportesData {
  monthlyData:      MonthData[]
  totalRevenue:     number
  totalBookings:    number
  avgMonthlyRevenue:number
  paymentStats:     PaymentStat[]
  sucursalStats:    SucursalStat[]
  empleadoStats:    EmpleadoStat[]
  cierres:          CierreStat[]
  sucursales:       { id: string; name: string; code: string }[]
}

export default async function ReportesPage() {
  const service = getService()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const [
    { data: rawBookings },
    { data: sucursalesData },
    { data: cierresData },
  ] = await Promise.all([
    service
      .from('bookings')
      .select('id, total_amount, payment_method, created_at, sucursal_id, customer_id, sucursales(name, code), profiles(full_name)')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true }) as any,
    service
      .from('sucursales')
      .select('id, name, code')
      .eq('active', true)
      .order('name') as any,
    service
      .from('cierres_turno')
      .select('*, sucursales(name, code), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50) as any,
  ])

  const bookings: any[] = rawBookings ?? []

  // Monthly data
  const monthMap = new Map<string, { revenue: number; bookings: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { revenue: 0, bookings: 0 })
  }
  for (const b of bookings) {
    const d = new Date(b.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) {
      const e = monthMap.get(key)!
      e.revenue  += b.total_amount || 0
      e.bookings += 1
    }
  }
  const monthlyData: MonthData[] = Array.from(monthMap.entries()).map(([key, val]) => ({
    month: MONTH_NAMES[parseInt(key.split('-')[1]) - 1],
    revenue: Math.round(val.revenue),
    bookings: val.bookings,
  }))

  const totalRevenue     = monthlyData.reduce((s, d) => s + d.revenue, 0)
  const totalBookings    = monthlyData.reduce((s, d) => s + d.bookings, 0)
  const activeMonths     = monthlyData.filter(d => d.bookings > 0).length || 1
  const avgMonthlyRevenue = Math.round(totalRevenue / activeMonths)

  // Payment stats
  const paymentCounts: Record<string, number> = {}
  for (const b of bookings) {
    const method = b.payment_method || 'card'
    paymentCounts[method] = (paymentCounts[method] || 0) + 1
  }
  const total = bookings.length || 1
  const paymentLabels: Record<string, { label: string; color: string }> = {
    card:   { label: 'Tarjeta',  color: 'bg-blue-500' },
    cash:   { label: 'Efectivo', color: 'bg-amber-400' },
  }
  const paymentStats: PaymentStat[] = Object.entries(paymentCounts).map(([method, count]) => ({
    method: paymentLabels[method]?.label ?? method,
    count,
    pct: Math.round((count / total) * 100),
    color: paymentLabels[method]?.color ?? 'bg-slate-400',
  })).sort((a, b) => b.count - a.count)

  // Per-sucursal stats
  const sucMap = new Map<string, { id: string; name: string; code: string; revenue: number; bookings: number }>()
  for (const b of bookings) {
    if (!b.sucursal_id || !b.sucursales) continue
    const key = b.sucursal_id
    if (!sucMap.has(key)) {
      sucMap.set(key, { id: b.sucursal_id, name: b.sucursales.name, code: b.sucursales.code, revenue: 0, bookings: 0 })
    }
    const e = sucMap.get(key)!
    e.revenue  += b.total_amount || 0
    e.bookings += 1
  }
  const sucursalStats: SucursalStat[] = Array.from(sucMap.values())
    .map(s => ({ ...s, revenue: Math.round(s.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  // Per-employee stats
  const empMap = new Map<string, { id: string; name: string; revenue: number; bookings: number; sucursal: string }>()
  for (const b of bookings) {
    if (!b.customer_id || !b.profiles) continue
    const key = b.customer_id
    if (!empMap.has(key)) {
      empMap.set(key, { id: b.customer_id, name: b.profiles.full_name ?? '—', revenue: 0, bookings: 0, sucursal: b.sucursales?.name ?? '—' })
    }
    const e = empMap.get(key)!
    e.revenue  += b.total_amount || 0
    e.bookings += 1
  }
  const empleadoStats: EmpleadoStat[] = Array.from(empMap.values())
    .map(e => ({ ...e, revenue: Math.round(e.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  // Cierres
  const cierres: CierreStat[] = (cierresData ?? []).map((c: any) => ({
    id:              c.id,
    fecha:           c.fecha,
    sucursal_name:   c.sucursales?.name  ?? '—',
    sucursal_code:   c.sucursales?.code  ?? '—',
    total_boletos:   c.total_boletos,
    total_efectivo:  c.total_efectivo,
    total_tarjeta:   c.total_tarjeta,
    total_paquetes:  c.total_paquetes,
    total_general:   c.total_general,
    qb_synced:       c.qb_synced,
    empleado:        c.profiles?.full_name ?? 'Admin',
    notas:           c.notas,
  }))

  const data: ReportesData = {
    monthlyData, totalRevenue, totalBookings, avgMonthlyRevenue,
    paymentStats, sucursalStats, empleadoStats, cierres,
    sucursales: sucursalesData ?? [],
  }

  return (
    <Suspense>
      <ReportesClient data={data} />
    </Suspense>
  )
}
