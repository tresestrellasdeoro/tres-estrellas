import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Ticket, Star, Bus, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/types/database'

export const metadata = { title: 'Mi dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, trip:trips(departure_date, departure_time, schedule:schedules(route:routes(origin_stop:stops!routes_origin_stop_id_fkey(name), destination_stop:stops!routes_destination_stop_id_fkey(name))))')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const pointsToNextTier = () => {
    const pts = profile?.loyalty_points || 0
    if (pts < 100)  return { label: 'Bronce', needed: 100 - pts,  progress: (pts/100)*100 }
    if (pts < 500)  return { label: 'Plata',  needed: 500 - pts,  progress: ((pts-100)/400)*100 }
    if (pts < 2000) return { label: 'Oro',    needed: 2000 - pts, progress: ((pts-500)/1500)*100 }
    if (pts < 5000) return { label: 'Platino',needed: 5000 - pts, progress: ((pts-2000)/3000)*100 }
    return { label: '¡Platino!', needed: 0, progress: 100 }
  }

  const nextTier = pointsToNextTier()
  const name     = profile?.full_name?.split(' ')[0] || 'Viajero'

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628]">
          Hola, {name} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Bienvenido a tu panel de viajes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[rgba(240,180,41,0.1)] flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-[#d97706]" />
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Puntos</p>
          <p className="font-black text-2xl text-[#0a1628]">{(profile?.loyalty_points || 0).toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Bus className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Viajes</p>
          <p className="font-black text-2xl text-[#0a1628]">{profile?.total_trips || 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Ticket className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Reservaciones</p>
          <p className="font-black text-2xl text-[#0a1620]">{bookings?.length || 0}</p>
        </div>
      </div>

      {/* Loyalty progress */}
      <div className="bg-[#0a1628] rounded-2xl p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">Progreso hacia {nextTier.label}</p>
            <p className="text-[#f0b429] font-black text-lg">{(profile?.loyalty_points || 0).toLocaleString()} pts</p>
          </div>
          {nextTier.needed > 0 && (
            <p className="text-white/40 text-xs text-right">
              Faltan <span className="text-white font-bold">{nextTier.needed}</span> pts<br />para {nextTier.label}
            </p>
          )}
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#f0b429] to-[#fcd34d] rounded-full transition-all"
            style={{ width: `${nextTier.progress}%` }}
          />
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Reservaciones recientes</h2>
          <Link href="/mis-tickets" className="text-[#d97706] text-sm font-semibold hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bookings && bookings.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {bookings.map((b: any) => (
              <div key={b.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Bus className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {b.trip?.schedule?.route?.origin_stop?.name} → {b.trip?.schedule?.route?.destination_stop?.name}
                  </p>
                  <div className="flex gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.trip?.departure_date}</span>
                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">{b.status}</span>
                  </div>
                </div>
                <div className="font-black text-slate-800">${b.total_amount}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm mb-4">No tienes reservaciones aún.</p>
            <Link href="/buscar">
              <Button className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold rounded-xl text-sm">
                Buscar viajes
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link href="/buscar">
        <div className="bg-gradient-to-r from-[#f0b429] to-[#d97706] rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:shadow-xl hover:shadow-[#f0b429]/20 transition-all">
          <div>
            <p className="text-[#0a1628] font-black text-base">¿Listo para tu próximo viaje?</p>
            <p className="text-[#0a1628]/60 text-xs mt-0.5">10 salidas diarias LA → San Diego</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#0a1628]/10 flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-[#0a1628]" />
          </div>
        </div>
      </Link>
    </div>
  )
}
