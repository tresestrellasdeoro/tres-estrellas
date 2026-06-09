import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Suspense } from 'react'
import ReportesClient from './reportes-client'

export const metadata = { title: 'Reportes — Admin' }
export const revalidate = 300

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export interface MonthData {
  month: string
  revenue: number
  bookings: number
}

export interface PaymentStat {
  method: string
  count: number
  pct: number
  color: string
}

export interface ReportesData {
  monthlyData: MonthData[]
  totalRevenue: number
  totalBookings: number
  avgMonthlyRevenue: number
  paymentStats: PaymentStat[]
}

export default async function ReportesPage() {
  const service = getService()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  // Traer todas las reservaciones de los últimos 6 meses
  const { data: rawBookings } = await service
    .from('bookings')
    .select('id, total_amount, payment_method, created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true }) as { data: Array<{ id: string; total_amount: number; payment_method: string | null; created_at: string }> | null }

  const bookings = rawBookings ?? []

  // Agrupar por mes
  const monthMap = new Map<string, { revenue: number; bookings: number }>()

  // Inicializar los últimos 6 meses con ceros
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
      const entry = monthMap.get(key)!
      entry.revenue += b.total_amount || 0
      entry.bookings += 1
    }
  }

  const monthlyData: MonthData[] = Array.from(monthMap.entries()).map(([key, val]) => {
    const monthIdx = parseInt(key.split('-')[1]) - 1
    return {
      month: MONTH_NAMES[monthIdx],
      revenue: Math.round(val.revenue),
      bookings: val.bookings,
    }
  })

  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0)
  const totalBookings = monthlyData.reduce((s, d) => s + d.bookings, 0)
  const avgMonthlyRevenue = monthlyData.length > 0 ? Math.round(totalRevenue / monthlyData.length) : 0

  // Breakdown de métodos de pago
  const paymentCounts: Record<string, number> = {}
  for (const b of bookings) {
    const method = b.payment_method || 'card'
    paymentCounts[method] = (paymentCounts[method] || 0) + 1
  }

  const total = bookings.length || 1
  const paymentLabels: Record<string, { label: string; color: string }> = {
    card:   { label: 'Tarjeta (en línea)', color: 'bg-blue-500' },
    stripe: { label: 'Stripe (en línea)',  color: 'bg-blue-500' },
    cash:   { label: 'Efectivo (taquilla)', color: 'bg-amber-400' },
    square: { label: 'Square (taquilla)',  color: 'bg-emerald-500' },
  }

  const paymentStats: PaymentStat[] = Object.entries(paymentCounts)
    .map(([method, count]) => ({
      method: paymentLabels[method]?.label ?? method,
      count,
      pct: Math.round((count / total) * 100),
      color: paymentLabels[method]?.color ?? 'bg-slate-400',
    }))
    .sort((a, b) => b.count - a.count)

  const data: ReportesData = {
    monthlyData,
    totalRevenue,
    totalBookings,
    avgMonthlyRevenue,
    paymentStats,
  }

  return (
    <Suspense>
      <ReportesClient data={data} />
    </Suspense>
  )
}
