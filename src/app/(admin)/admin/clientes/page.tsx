import { createClient } from '@/lib/supabase/server'
import { Users, Search, Star, Bus, ArrowUpRight } from 'lucide-react'
import type { Profile } from '@/lib/types/database'

export const metadata = { title: 'Clientes — Admin' }

const TIER_COLORS: Record<string, string> = {
  none:     'bg-slate-100 text-slate-500',
  bronze:   'bg-orange-100 text-orange-700',
  silver:   'bg-slate-200 text-slate-700',
  gold:     'bg-[rgba(240,180,41,0.15)] text-[#d97706]',
  platinum: 'bg-purple-100 text-purple-700',
}
const TIER_EMOJIS: Record<string, string> = { none:'', bronze:'🥉', silver:'🥈', gold:'🥇', platinum:'💎' }

// Demo data cuando no hay Supabase conectado
const DEMO_CLIENTS: Partial<Profile>[] = [
  { id:'1', full_name:'María García',    email:'maria@ejemplo.com',  phone:'(213) 555-0001', loyalty_tier:'gold',     loyalty_points:2450, total_trips:18, created_at:'2024-01-15T00:00:00Z' },
  { id:'2', full_name:'Juan Hernández',  email:'juan@ejemplo.com',   phone:'(213) 555-0002', loyalty_tier:'silver',   loyalty_points:720,  total_trips:8,  created_at:'2024-03-20T00:00:00Z' },
  { id:'3', full_name:'Ana Rodríguez',   email:'ana@ejemplo.com',    phone:'(213) 555-0003', loyalty_tier:'platinum', loyalty_points:5800, total_trips:42, created_at:'2023-11-05T00:00:00Z' },
  { id:'4', full_name:'Carlos López',    email:'carlos@ejemplo.com', phone:'(213) 555-0004', loyalty_tier:'bronze',   loyalty_points:180,  total_trips:3,  created_at:'2024-05-10T00:00:00Z' },
  { id:'5', full_name:'Sofía Martínez',  email:'sofia@ejemplo.com',  phone:'(213) 555-0005', loyalty_tier:'none',     loyalty_points:0,    total_trips:1,  created_at:'2024-06-01T00:00:00Z' },
  { id:'6', full_name:'Roberto Flores',  email:'roberto@ejemplo.com',phone:'(213) 555-0006', loyalty_tier:'gold',     loyalty_points:3100, total_trips:27, created_at:'2024-02-28T00:00:00Z' },
  { id:'7', full_name:'Isabella Torres', email:'isa@ejemplo.com',    phone:'(213) 555-0007', loyalty_tier:'silver',   loyalty_points:540,  total_trips:6,  created_at:'2024-04-14T00:00:00Z' },
  { id:'8', full_name:'Miguel Sánchez',  email:'miguel@ejemplo.com', phone:'(213) 555-0008', loyalty_tier:'bronze',   loyalty_points:110,  total_trips:2,  created_at:'2024-05-25T00:00:00Z' },
]

export default async function ClientesPage() {
  const supabase = await createClient()

  let clients: Partial<Profile>[] = DEMO_CLIENTS
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('loyalty_points', { ascending: false })
    if (data && data.length > 0) clients = data as Profile[]
  } catch {}

  const tierCounts = clients.reduce((acc, c) => {
    acc[c.loyalty_tier || 'none'] = (acc[c.loyalty_tier || 'none'] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <Users className="w-6 h-6 text-[#d97706]" />
          Clientes
        </h1>
        <p className="text-slate-500 text-sm mt-1">{clients.length} clientes registrados</p>
      </div>

      {/* Tier summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {(['none','bronze','silver','gold','platinum'] as const).map(tier => (
          <div key={tier} className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
            <p className="text-2xl mb-1">{TIER_EMOJIS[tier] || '—'}</p>
            <p className="font-black text-lg text-[#0a1628]">{tierCounts[tier] || 0}</p>
            <p className="text-slate-400 text-[10px] font-medium capitalize">{tier === 'none' ? 'Sin tier' : tier}</p>
          </div>
        ))}
      </div>

      {/* Clients table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Tier</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Puntos</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Viajes</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Miembro desde</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[rgba(240,180,41,0.1)] border border-[rgba(240,180,41,0.2)] flex items-center justify-center text-[#d97706] font-black text-sm shrink-0">
                        {client.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{client.full_name}</p>
                        <p className="text-slate-400 text-xs">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${TIER_COLORS[client.loyalty_tier || 'none']}`}>
                      {TIER_EMOJIS[client.loyalty_tier || 'none']}
                      <span className="capitalize">{client.loyalty_tier === 'none' ? 'Sin tier' : client.loyalty_tier}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="flex items-center gap-1 font-bold text-[#d97706]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {(client.loyalty_points || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-slate-600 font-semibold">
                      <Bus className="w-3.5 h-3.5 text-slate-400" />
                      {client.total_trips || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-slate-400 text-xs">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString('es-MX') : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
