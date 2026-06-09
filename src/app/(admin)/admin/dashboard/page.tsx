import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Bus, DollarSign, Users, Ticket, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { BUS_ROUTES } from '@/lib/data/bus-config'

export const metadata = { title: 'Dashboard Admin' }
export const revalidate = 60

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function AdminDashboardPage() {
  const service = getService()

  const today     = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: todayCount },
    { data: monthData },
    { data: recentBookings },
    { count: totalGuests },
  ] = await Promise.all([
    service.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    service.from('bookings').select('total_amount').gte('created_at', monthStart),
    service.from('bookings').select('id, booking_number, guest_email, total_amount, status, ticket_type, created_at, passengers(full_name)').order('created_at', { ascending: false }).limit(8),
    service.from('bookings').select('guest_email', { count: 'exact', head: true }),
  ])

  const monthRevenue = monthData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) ?? 0

  const stats = [
    { label: 'Reservaciones hoy', value: String(todayCount ?? 0),          icon: Ticket,     color: 'bg-blue-50 text-blue-600' },
    { label: 'Ingresos del mes',  value: `$${monthRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total reservaciones',value: String(totalGuests ?? 0),         icon: Users,      color: 'bg-purple-50 text-purple-600' },
    { label: 'Buses en servicio', value: String(BUS_ROUTES.length),         icon: Bus,        color: 'bg-amber-50 text-amber-600' },
  ]

  const todayDepartures = BUS_ROUTES.slice(0, 6).map(bus => ({
    id:    bus.id,
    time:  bus.departs,
    route: `${bus.stops[0].code} → ${bus.stops[bus.stops.length - 1].code}`,
    name:  bus.name,
  }))

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628]">Dashboard Admin</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-200" />
            </div>
            <p className="font-black text-2xl text-[#0a1628]">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today departures */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Horarios de salida
            </h2>
            <span className="text-xs text-slate-400">{todayDepartures.length} servicios</span>
          </div>
          <div className="divide-y divide-slate-100">
            {todayDepartures.map(dep => (
              <div key={dep.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="font-black text-[#0a1628] text-sm">{dep.time}</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 text-sm">{dep.name}</p>
                  <p className="text-slate-400 text-xs">{dep.route}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  A tiempo
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Reservaciones recientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {!recentBookings || recentBookings.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Ticket className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Sin reservaciones aún</p>
              </div>
            ) : recentBookings.map(b => {
              const firstPassenger = Array.isArray(b.passengers) ? b.passengers[0]?.full_name : null
              const initial = (firstPassenger || b.guest_email || '?').charAt(0).toUpperCase()
              return (
                <div key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 text-sm truncate">
                      {firstPassenger || b.guest_email}
                    </p>
                    <p className="text-slate-400 text-xs font-mono">{b.booking_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800 text-sm">${b.total_amount}</p>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 justify-end ${
                      b.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {b.status === 'confirmed'
                        ? <><CheckCircle2 className="w-3 h-3" /> confirmado</>
                        : <><AlertCircle className="w-3 h-3" /> pendiente</>
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
