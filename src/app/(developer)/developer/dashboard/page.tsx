import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Bus, DollarSign, Users, Ticket, Terminal, MessageCircle, AlertCircle, Clock } from 'lucide-react'

export const metadata = { title: 'Developer Dashboard' }
export const revalidate = 60

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STATUS_COLOR: Record<string, string> = {
  abierta:     'bg-amber-50 text-amber-700 border-amber-200',
  en_revision: 'bg-blue-50 text-blue-700 border-blue-200',
  solucionada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cerrada:     'bg-slate-50 text-slate-500 border-slate-200',
}
const PRIORITY_COLOR: Record<string, string> = {
  critica: 'text-red-600 font-black',
  alta:    'text-amber-600 font-bold',
  media:   'text-blue-500',
  baja:    'text-slate-400',
}

export default async function DeveloperDashboardPage() {
  const service = svc()
  const today      = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: todayBookings },
    { data: monthData },
    { count: totalBookings },
    { count: totalBuses },
    { data: recentTickets },
    { data: openCounts },
  ] = await Promise.all([
    service.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    service.from('bookings').select('total_amount').gte('created_at', monthStart),
    service.from('bookings').select('*', { count: 'exact', head: true }),
    service.from('buses').select('*', { count: 'exact', head: true }),
    service.from('support_tickets').select('id, ticket_number, subject, category, priority, status, creator_name, creator_role, created_at, updated_at').order('updated_at', { ascending: false }).limit(10) as any,
    service.from('support_tickets').select('status') as any,
  ])

  const monthRevenue = monthData?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) ?? 0
  const openCount    = (openCounts as any[])?.filter((t: any) => t.status === 'abierta').length ?? 0
  const reviewCount  = (openCounts as any[])?.filter((t: any) => t.status === 'en_revision').length ?? 0

  const stats = [
    { label: 'Reservaciones hoy', value: String(todayBookings ?? 0),            icon: Ticket,        color: 'bg-blue-50 text-blue-600' },
    { label: 'Ingresos del mes',  value: `$${monthRevenue.toLocaleString()}`,   icon: DollarSign,    color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total reservaciones',value: String(totalBookings ?? 0),           icon: Users,         color: 'bg-purple-50 text-purple-600' },
    { label: 'Buses registrados', value: String(totalBuses ?? 0),               icon: Bus,           color: 'bg-amber-50 text-amber-600' },
    { label: 'Tickets abiertos',  value: String(openCount),                     icon: AlertCircle,   color: 'bg-red-50 text-red-600' },
    { label: 'En revisión',       value: String(reviewCount),                   icon: Clock,         color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-violet-500" />
            <h1 className="font-display font-black text-2xl text-[#0a1628]">Developer Dashboard</h1>
          </div>
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-black border border-violet-200">
          DEVELOPER
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="font-black text-2xl text-[#0a1628]">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent support tickets */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-violet-500" />
            <h2 className="font-bold text-slate-800">Incidencias recientes</h2>
          </div>
          <a href="/developer/soporte" className="text-xs text-violet-600 hover:underline font-semibold">Ver todas →</a>
        </div>
        <div className="divide-y divide-slate-100">
          {!recentTickets || recentTickets.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Sin incidencias reportadas</p>
            </div>
          ) : (
            (recentTickets as any[]).map((t: any) => (
              <a key={t.id} href={`/developer/soporte/${t.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{t.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">{t.ticket_number}</span>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] text-slate-500">{t.creator_name} ({t.creator_role})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold ${PRIORITY_COLOR[t.priority] ?? ''}`}>
                    {t.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLOR[t.status] ?? ''}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
