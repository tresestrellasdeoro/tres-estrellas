import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ClipboardList, CheckCircle2, Clock, Banknote, CreditCard, ArrowRight, ArrowLeftRight, Bus } from 'lucide-react'

export const revalidate = 30

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PassengerRow {
  full_name: string
  checked_in: boolean
  return_checked_in: boolean
}

export default async function ReservacionesPage() {
  const service = getService()
  const today   = new Date().toISOString().slice(0, 10)

  const { data: bookings } = await service
    .from('bookings')
    .select('id, booking_number, status, total_amount, payment_method, guest_email, ticket_type, created_at, departure_time, passengers(full_name, checked_in, return_checked_in)')
    .eq('date', today)
    .order('departure_time', { ascending: true })

  const total   = bookings?.length ?? 0
  const revenue = bookings?.reduce((s, b) => s + (b.total_amount || 0), 0) ?? 0
  const cash    = bookings?.filter(b => b.payment_method === 'cash').length ?? 0

  // "Abordaron" = ida confirmada (all checked_in = true)
  const checkedInCount = bookings?.filter(b => {
    const ps = (Array.isArray(b.passengers) ? b.passengers : []) as PassengerRow[]
    return ps.length > 0 && ps.every(p => p.checked_in)
  }).length ?? 0

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#c01515]" />
          Pasajeros de hoy
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}Boletos con fecha de viaje hoy
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',       value: total,          color: 'bg-blue-50 text-blue-700' },
          { label: 'Ingresos',    value: `$${revenue}`,  color: 'bg-emerald-50 text-emerald-700' },
          { label: 'En efectivo', value: cash,           color: 'bg-amber-50 text-amber-700' },
          { label: 'Abordaron',   value: checkedInCount, color: 'bg-purple-50 text-purple-700' },
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
              const passengers = (Array.isArray(b.passengers) ? b.passengers : []) as PassengerRow[]
              const isRoundTrip    = b.ticket_type === 'round_trip'
              const outboundDone   = passengers.length > 0 && passengers.every(p => p.checked_in)
              const returnDone     = isRoundTrip && passengers.length > 0 && passengers.every(p => p.return_checked_in)
              const fullyComplete  = isRoundTrip ? returnDone : outboundDone

              let statusIcon = <Clock className="w-4 h-4 text-slate-400" />
              let iconBg     = 'bg-slate-100'
              let statusText = 'Pendiente'
              let statusColor = 'text-slate-400'

              if (fullyComplete) {
                statusIcon  = <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                iconBg      = 'bg-emerald-100'
                statusText  = 'Completo'
                statusColor = 'text-emerald-600'
              } else if (outboundDone && isRoundTrip) {
                statusIcon  = <ArrowRight className="w-4 h-4 text-blue-500" />
                iconBg      = 'bg-blue-100'
                statusText  = 'Ida ✓'
                statusColor = 'text-blue-600'
              }

              return (
                <div key={b.id} className="px-5 py-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    {statusIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {passengers[0]?.full_name || b.guest_email || '—'}
                        {passengers.length > 1 && <span className="text-slate-400 ml-1 font-normal">+{passengers.length - 1}</span>}
                      </p>
                      {isRoundTrip && (
                        <span className="shrink-0 flex items-center gap-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          <ArrowLeftRight className="w-2.5 h-2.5" /> I+V
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-slate-400 text-xs font-mono">{b.booking_number}</p>
                      {(b as { departure_time?: string }).departure_time && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-semibold">
                          <Bus className="w-2.5 h-2.5" />
                          {((b as { departure_time?: string }).departure_time ?? '').slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800 text-sm">${b.total_amount}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      {b.payment_method === 'cash'
                        ? <Banknote className="w-3 h-3 text-amber-500" />
                        : <CreditCard className="w-3 h-3 text-slate-400" />
                      }
                      <span className={`text-[10px] font-bold ${statusColor}`}>
                        {statusText}
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
