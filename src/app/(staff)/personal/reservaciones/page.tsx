import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ClipboardList, CheckCircle2, Clock, Banknote, CreditCard } from 'lucide-react'

export const revalidate = 30

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function ReservacionesPage() {
  const service = getService()
  const today   = new Date().toISOString().slice(0, 10)

  const { data: bookings } = await service
    .from('bookings')
    .select('id, booking_number, status, total_amount, payment_method, guest_email, ticket_type, created_at, passengers(full_name, checked_in)')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })

  const total   = bookings?.length ?? 0
  const revenue = bookings?.reduce((s, b) => s + (b.total_amount || 0), 0) ?? 0
  const cash    = bookings?.filter(b => b.payment_method === 'cash').length ?? 0
  const checkedInCount = bookings?.filter(b =>
    Array.isArray(b.passengers) && b.passengers.every((p: any) => p.checked_in)
  ).length ?? 0

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#c01515]" />
          Reservaciones de hoy
        </h1>
        <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',          value: total,           color: 'bg-blue-50 text-blue-700' },
          { label: 'Ingresos',       value: `$${revenue}`,   color: 'bg-emerald-50 text-emerald-700' },
          { label: 'En efectivo',    value: cash,            color: 'bg-amber-50 text-amber-700' },
          { label: 'Abordaron',      value: checkedInCount,  color: 'bg-purple-50 text-purple-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="font-black text-2xl">{s.value}</p>
            <p className="text-xs font-semibold opacity-70 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {!bookings || bookings.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">Sin reservaciones hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map(b => {
              const passengers = Array.isArray(b.passengers) ? b.passengers : []
              const allBoarded = passengers.length > 0 && passengers.every((p: any) => p.checked_in)
              return (
                <div key={b.id} className="px-5 py-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${allBoarded ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    {allBoarded
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <Clock className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {passengers[0]?.full_name || b.guest_email}
                      {passengers.length > 1 && <span className="text-slate-400 ml-1 font-normal">+{passengers.length - 1}</span>}
                    </p>
                    <p className="text-slate-400 text-xs font-mono">{b.booking_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800 text-sm">${b.total_amount}</p>
                    <div className="flex items-center gap-1 justify-end">
                      {b.payment_method === 'cash'
                        ? <Banknote className="w-3 h-3 text-amber-500" />
                        : <CreditCard className="w-3 h-3 text-slate-400" />
                      }
                      <span className={`text-[10px] font-bold ${b.payment_method === 'cash' ? 'text-amber-600' : 'text-slate-400'}`}>
                        {b.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
