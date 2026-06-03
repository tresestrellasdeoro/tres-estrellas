import { Bus, DollarSign, Users, Ticket, TrendingUp, ArrowUpRight, Clock } from 'lucide-react'
import { BUS_ROUTES, DEMO_SEATS_AVAILABLE } from '@/lib/data/bus-config'

export const metadata = { title: 'Dashboard Admin' }

export default async function AdminDashboardPage() {
  const totalBuses = BUS_ROUTES.length
  const soldOutBuses = Object.values(DEMO_SEATS_AVAILABLE).filter(s => s === 0).length

  const stats = [
    { label: 'Reservaciones hoy',  value: '24',              icon: Ticket,     color: 'bg-blue-50 text-blue-600',               trend: '+12%' },
    { label: 'Ingresos del mes',   value: '$18,420',          icon: DollarSign, color: 'bg-emerald-50 text-emerald-600',          trend: '+8%' },
    { label: 'Clientes activos',   value: '142',              icon: Users,      color: 'bg-purple-50 text-purple-600',            trend: '+24' },
    { label: 'Buses en servicio',  value: String(totalBuses), icon: Bus,        color: 'bg-amber-50 text-amber-600',              trend: 'activos' },
  ]

  const todayDepartures = BUS_ROUTES.slice(0, 6).map(bus => ({
    time:   bus.departs,
    route:  `${bus.stops[0].code} → ${bus.stops[bus.stops.length - 1].code}`,
    sold:   bus.capacity - (DEMO_SEATS_AVAILABLE[bus.id] ?? 0),
    total:  bus.capacity,
    status: (DEMO_SEATS_AVAILABLE[bus.id] ?? 1) === 0 ? 'full' : 'on_time',
  }))

  const recentBookings = [
    { id: 1, name: 'María García',    booking: 'TEO-2026-0041', amount: 55,  status: 'confirmado' },
    { id: 2, name: 'Carlos López',    booking: 'TEO-2026-0040', amount: 110, status: 'confirmado' },
    { id: 3, name: 'Ana Martínez',    booking: 'TEO-2026-0039', amount: 45,  status: 'pendiente'  },
    { id: 4, name: 'Juan Rodríguez',  booking: 'TEO-2026-0038', amount: 55,  status: 'confirmado' },
    { id: 5, name: 'Laura Sánchez',   booking: 'TEO-2026-0037', amount: 83,  status: 'confirmado' },
  ]

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628]">Dashboard Admin</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vista general de operaciones —{' '}
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
              <span className="text-emerald-600 text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
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
              Salidas de hoy
            </h2>
            <span className="text-xs text-slate-400">{todayDepartures.length} viajes</span>
          </div>
          <div className="divide-y divide-slate-100">
            {todayDepartures.map(dep => (
              <div key={dep.time + dep.route} className="px-5 py-3.5 flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="font-black text-[#0a1628] text-sm">{dep.time}</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 text-sm">{dep.route}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dep.sold === dep.total ? 'bg-red-400' : 'bg-[#c01515]'}`}
                        style={{ width: `${(dep.sold / dep.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{dep.sold}/{dep.total}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  dep.status === 'full' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {dep.status === 'full' ? 'Lleno' : 'A tiempo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Reservaciones recientes</h2>
            <span className="text-[#c01515] text-xs font-semibold flex items-center gap-1 cursor-pointer hover:underline">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBookings.map(b => (
              <div key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                  {b.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm truncate">{b.name}</p>
                  <p className="text-slate-400 text-xs">{b.booking}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-800 text-sm">${b.amount}</p>
                  <span className={`text-[10px] font-bold ${b.status === 'confirmado' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
