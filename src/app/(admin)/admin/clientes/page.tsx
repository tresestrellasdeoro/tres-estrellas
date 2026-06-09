import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Users, Star, Bus, ArrowUpRight, Package } from 'lucide-react'
import type { Profile } from '@/lib/types/database'

export const metadata = { title: 'Clientes — Admin' }
export const revalidate = 60

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const TIER_COLORS: Record<string, string> = {
  none:     'bg-slate-100 text-slate-500',
  bronze:   'bg-orange-100 text-orange-700',
  silver:   'bg-slate-200 text-slate-700',
  gold:     'bg-[rgba(240,180,41,0.15)] text-[#d97706]',
  platinum: 'bg-purple-100 text-purple-700',
  guest:    'bg-slate-50 text-slate-400',
}
const TIER_EMOJIS: Record<string, string> = {
  none: '', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', guest: '',
}

interface GuestClient {
  kind: 'guest'
  id: string
  email: string
  name: string
  totalBookings: number
  totalSpent: number
  lastBooking: string
}

interface ProfileClient {
  kind: 'profile'
  id: string
  email: string
  name: string
  tier: string
  points: number
  trips: number
  memberSince: string
}

type Client = GuestClient | ProfileClient

export default async function ClientesPage() {
  const service = getService()

  // Traer bookings con pasajeros para construir lista de guests
  const { data: rawBookings } = await service
    .from('bookings')
    .select('id, guest_email, total_amount, created_at, passengers(full_name)')
    .order('created_at', { ascending: false }) as {
      data: Array<{
        id: string
        guest_email: string | null
        total_amount: number
        created_at: string
        passengers: Array<{ full_name: string }> | null
      }> | null
    }

  // Traer profiles con role customer
  const { data: rawProfiles } = await service
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('loyalty_points', { ascending: false }) as { data: Profile[] | null }

  const bookings = rawBookings ?? []
  const profiles = rawProfiles ?? []

  // Construir map de emails de profiles para no duplicar
  const profileEmails = new Set(profiles.map(p => p.email.toLowerCase()))

  // Agrupar bookings por guest_email
  const guestMap = new Map<
    string,
    { name: string; totalBookings: number; totalSpent: number; lastBooking: string }
  >()

  for (const b of bookings) {
    const email = b.guest_email?.toLowerCase()
    if (!email) continue
    if (profileEmails.has(email)) continue // ya está en profiles, no duplicar

    const firstName = b.passengers?.[0]?.full_name ?? ''
    const existing = guestMap.get(email)
    if (!existing) {
      guestMap.set(email, {
        name: firstName,
        totalBookings: 1,
        totalSpent: b.total_amount || 0,
        lastBooking: b.created_at,
      })
    } else {
      existing.totalBookings += 1
      existing.totalSpent += b.total_amount || 0
      // lastBooking ya es el más reciente porque ordenamos desc
    }
  }

  // Construir lista unificada
  const guestClients: GuestClient[] = Array.from(guestMap.entries()).map(([email, data], i) => ({
    kind: 'guest',
    id: `guest-${i}`,
    email,
    name: data.name,
    totalBookings: data.totalBookings,
    totalSpent: Math.round(data.totalSpent),
    lastBooking: data.lastBooking,
  }))

  const profileClients: ProfileClient[] = profiles.map(p => ({
    kind: 'profile',
    id: p.id,
    email: p.email,
    name: p.full_name,
    tier: p.loyalty_tier || 'none',
    points: p.loyalty_points || 0,
    trips: p.total_trips || 0,
    memberSince: p.created_at,
  }))

  // Ordenar guests por total gastado desc
  guestClients.sort((a, b) => b.totalSpent - a.totalSpent)

  const allClients: Client[] = [...profileClients, ...guestClients]

  // Tier counts (solo de profiles)
  const tierCounts = profiles.reduce((acc, p) => {
    const t = p.loyalty_tier || 'none'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalGuests = guestClients.length
  const totalProfiles = profileClients.length
  const totalClientes = allClients.length

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <Users className="w-6 h-6 text-[#d97706]" />
          Clientes
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {totalClientes === 0
            ? 'Sin clientes registrados aún'
            : `${totalClientes} cliente${totalClientes !== 1 ? 's' : ''} — ${totalProfiles} con cuenta · ${totalGuests} invitados`}
        </p>
      </div>

      {/* Tier summary — solo aplica a profiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {(['none','bronze','silver','gold','platinum'] as const).map(tier => (
          <div key={tier} className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
            <p className="text-2xl mb-1">{TIER_EMOJIS[tier] || '—'}</p>
            <p className="font-black text-lg text-[#0a1628]">{tierCounts[tier] || 0}</p>
            <p className="text-slate-400 text-[10px] font-medium capitalize">
              {tier === 'none' ? 'Sin tier' : tier}
            </p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-800 text-sm">Todos los clientes</h2>
          {totalGuests > 0 && (
            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              {totalGuests} invitado{totalGuests !== 1 ? 's' : ''} sin cuenta
            </span>
          )}
        </div>

        {allClients.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-600 text-base mb-1">Sin clientes todavía</p>
            <p className="text-slate-400 text-sm max-w-xs">
              Los clientes aparecerán aquí una vez que realicen su primera reservación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Tipo / Tier</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Reservaciones</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Total gastado</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Última / Desde</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allClients.map(client => {
                  const initial = (client.name || client.email).charAt(0).toUpperCase()

                  if (client.kind === 'guest') {
                    return (
                      <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-sm shrink-0">
                              {initial}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {client.name || <span className="text-slate-400 italic">Sin nombre</span>}
                              </p>
                              <p className="text-slate-400 text-xs">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${TIER_COLORS.guest}`}>
                            Invitado
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-right">
                          <span className="flex items-center justify-end gap-1 text-slate-600 font-semibold">
                            <Bus className="w-3.5 h-3.5 text-slate-400" />
                            {client.totalBookings}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-right">
                          <span className="font-bold text-emerald-600">
                            ${client.totalSpent.toLocaleString('es-MX')}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-slate-400 text-xs">
                            {new Date(client.lastBooking).toLocaleDateString('es-MX')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  }

                  // Profile client
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[rgba(240,180,41,0.1)] border border-[rgba(240,180,41,0.2)] flex items-center justify-center text-[#d97706] font-black text-sm shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{client.name}</p>
                            <p className="text-slate-400 text-xs">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${TIER_COLORS[client.tier] ?? TIER_COLORS.none}`}>
                          {TIER_EMOJIS[client.tier]}
                          <span className="capitalize">{client.tier === 'none' ? 'Sin tier' : client.tier}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell text-right">
                        <span className="flex items-center justify-end gap-1 text-slate-600 font-semibold">
                          <Bus className="w-3.5 h-3.5 text-slate-400" />
                          {client.trips}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell text-right">
                        <span className="flex items-center justify-end gap-1 font-bold text-[#d97706]">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {client.points.toLocaleString('es-MX')} pts
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">
                          Desde {new Date(client.memberSince).toLocaleDateString('es-MX')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
