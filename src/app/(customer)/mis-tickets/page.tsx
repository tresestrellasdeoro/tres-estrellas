import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Ticket, Clock, MapPin, QrCode, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    .select('*, passengers(*)')
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
            const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
            return (
              <div key={booking.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Ticket header */}
                <div className="bg-[#0a1628] px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[#f0b429] font-black text-sm tracking-widest">{booking.booking_number}</p>
                    <p className="text-white/40 text-xs">{new Date(booking.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Ticket body */}
                <div className="p-5">
                  {/* Passengers list */}
                  <div className="space-y-2 mb-4">
                    {booking.passengers?.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                          {p.full_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{p.full_name}</p>
                          <p className="text-slate-400 text-xs capitalize">{p.passenger_type}</p>
                        </div>
                        {p.checked_in ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <QrCode className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs">Total</p>
                      <p className="font-black text-lg text-[#0a1628]">${booking.total_amount}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs border-slate-200">
                        <QrCode className="w-3.5 h-3.5 mr-1.5" />
                        Ver QR
                      </Button>
                      {booking.status === 'confirmed' && (
                        <Button size="sm" className="rounded-xl text-xs bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold">
                          Descargar PDF
                        </Button>
                      )}
                    </div>
                  </div>
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
