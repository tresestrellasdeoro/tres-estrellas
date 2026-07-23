import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Ticket, CheckCircle2, QrCode, ArrowRight, ArrowLeft, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CancelBookingButton } from './cancel-button'

export const metadata = { title: 'Mis boletos' }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  used:      { label: 'Usado',       color: 'bg-slate-50 text-slate-500 border-slate-200' },
  cancelled: { label: 'Cancelado',   color: 'bg-red-50 text-red-600 border-red-200' },
  refunded:  { label: 'Reembolsado', color: 'bg-blue-50 text-blue-600 border-blue-200' },
}

export default async function MisTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_number, status, ticket_type, total_amount, payment_method, guest_email, return_date, origin_name, destination_name, departure_time, created_at, passengers(id, full_name, passenger_type, price, checked_in, return_checked_in)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <Ticket className="w-6 h-6 text-[#d97706]" />
          Mis boletos
        </h1>
        <p className="text-slate-500 text-sm mt-1">{bookings?.length || 0} reservaciones</p>
      </div>

      {bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const statusCfg    = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
            const isRoundTrip  = booking.ticket_type === 'round_trip'
            const passengers   = booking.passengers || []
            const outboundDone = passengers.length > 0 && passengers.every((p: any) => p.checked_in)
            const returnDone   = isRoundTrip && passengers.length > 0 && passengers.every((p: any) => p.return_checked_in)

            return (
              <div key={booking.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                {/* Header */}
                <div className="bg-[#0a1628] px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[#f0b429] font-black text-sm tracking-widest">{booking.booking_number}</p>
                    <p className="text-white/40 text-xs">{new Date(booking.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRoundTrip && (
                      <span className="text-white/70 text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
                        IDA Y VUELTA
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">

                  {/* Round-trip legs summary */}
                  {isRoundTrip && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className={`rounded-xl p-3 border ${outboundDone ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ArrowRight className={`w-3.5 h-3.5 ${outboundDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${outboundDone ? 'text-emerald-700' : 'text-slate-500'}`}>Ida</span>
                          {outboundDone && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" />}
                        </div>
                        <p className="text-slate-400 text-[10px]">{booking.origin_name || 'Los Angeles'} → {booking.destination_name || 'Tijuana'}</p>
                      </div>
                      <div className={`rounded-xl p-3 border ${returnDone ? 'bg-blue-50 border-blue-200' : outboundDone ? 'bg-blue-50/40 border-blue-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ArrowLeft className={`w-3.5 h-3.5 ${returnDone ? 'text-blue-600' : outboundDone ? 'text-blue-400' : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${returnDone ? 'text-blue-700' : outboundDone ? 'text-blue-500' : 'text-slate-400'}`}>Regreso</span>
                          {returnDone && <CheckCircle2 className="w-3 h-3 text-blue-500 ml-auto" />}
                        </div>
                        {booking.return_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            <p className="text-slate-500 text-[10px] font-semibold">{booking.return_date}</p>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-[10px]">{booking.destination_name || 'Tijuana'} → {booking.origin_name || 'Los Angeles'}</p>
                        )}
                        {!returnDone && outboundDone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-blue-400" />
                            <p className="text-blue-500 text-[10px]">Hora abierta</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Passengers list */}
                  <div className="space-y-2 mb-4">
                    {passengers.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                          {p.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{p.full_name}</p>
                          <p className="text-slate-400 text-xs capitalize">
                            {p.passenger_type === 'adult' ? 'Adulto' : p.passenger_type === 'senior' ? 'Senior' : 'Menor'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.checked_in ? (
                            <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isRoundTrip ? 'Ida ✓' : 'Abordó'}
                            </span>
                          ) : (
                            <QrCode className="w-4 h-4 text-slate-300" />
                          )}
                          {isRoundTrip && p.return_checked_in && (
                            <span className="flex items-center gap-1 text-blue-500 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reg ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs">Total</p>
                      <p className="font-black text-lg text-[#0a1628]">${booking.total_amount}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>Tu boleto fue enviado por</p>
                      <p className="font-semibold text-slate-600">correo electrónico</p>
                    </div>
                  </div>

                  {booking.status === 'confirmed' && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <CancelBookingButton bookingId={booking.id} bookingNumber={booking.booking_number} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h3 className="font-bold text-slate-800 mb-2">Sin boletos aún</h3>
          <p className="text-slate-400 text-sm mb-6">Compra tu primer boleto y aparecerá aquí.</p>
          <Link href="/buscar">
            <Button className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold rounded-xl">
              Buscar viajes
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
