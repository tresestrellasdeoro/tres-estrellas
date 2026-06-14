import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Star, TrendingUp, Gift, ArrowRight, Bus, Clock } from 'lucide-react'
import type { Profile } from '@/lib/types/database'

export const metadata = { title: 'Mis puntos' }

const TIERS = [
  { key: 'bronze',   emoji: '🥉', name: 'Bronce',  min: 100,  max: 499,  discount: 5,  perks: ['5% descuento en boletos'] },
  { key: 'silver',   emoji: '🥈', name: 'Plata',   min: 500,  max: 1999, discount: 10, perks: ['10% descuento', 'Embarque prioritario'] },
  { key: 'gold',     emoji: '🥇', name: 'Oro',     min: 2000, max: 4999, discount: 15, perks: ['15% descuento', 'Embarque prioritario', 'Asiento preferencial'] },
  { key: 'platinum', emoji: '💎', name: 'Platino', min: 5000, max: 99999,discount: 20, perks: ['20% descuento', 'VIP Lounge', 'Asistente dedicado'] },
]

interface LoyaltyTx {
  id: string
  type: string
  points: number
  description: string
  created_at: string
}

export default async function PuntosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle() as { data: Profile | null }

  let transactions: LoyaltyTx[] = []
  try {
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data && data.length > 0) transactions = data as LoyaltyTx[]
  } catch {}

  const pts  = profile?.loyalty_points || 0
  const tier = profile?.loyalty_tier || 'none'

  const currentTier = TIERS.find(t => t.key === tier)
  const nextTier    = TIERS.find(t => t.min > pts)
  const ptsToNext   = nextTier ? nextTier.min - pts : 0
  const progress    = nextTier
    ? Math.min(100, ((pts - (currentTier?.min || 0)) / ((nextTier.min) - (currentTier?.min || 0))) * 100)
    : 100

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <Star className="w-6 h-6 text-[#d97706]" />
          Mis puntos
        </h1>
        <p className="text-slate-500 text-sm mt-1">Programa de lealtad Tres Estrellas de Oro</p>
      </div>

      {/* Points hero */}
      <div className="bg-[#0a1628] rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#f0b429]/5 rounded-full -translate-x-8 -translate-y-12 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Tus puntos</p>
              <div className="flex items-end gap-2">
                <Star className="w-6 h-6 text-[#f0b429] fill-current mb-1" />
                <p className="font-display font-black text-5xl text-white leading-none">{pts.toLocaleString()}</p>
              </div>
            </div>
            {currentTier && (
              <div className="text-right">
                <p className="text-4xl">{currentTier.emoji}</p>
                <p className="text-[#f0b429] font-bold text-sm">{currentTier.name}</p>
              </div>
            )}
          </div>

          {nextTier && (
            <>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-[#f0b429] to-[#fcd34d] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-white/40 text-xs">
                Faltan <span className="text-white font-bold">{ptsToNext} puntos</span> para {nextTier.emoji} {nextTier.name}
              </p>
            </>
          )}

          {!nextTier && (
            <p className="text-[#f0b429] font-bold text-sm">¡Estás en el nivel máximo! 🎉</p>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {TIERS.map(t => {
          const isCurrent = t.key === tier
          const isUnlocked = pts >= t.min
          return (
            <div key={t.key} className={`rounded-xl p-4 border text-center transition-all ${
              isCurrent
                ? 'bg-[rgba(240,180,41,0.1)] border-[rgba(240,180,41,0.4)] ring-1 ring-[#f0b429]/30'
                : isUnlocked
                ? 'bg-white border-slate-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <p className="text-2xl mb-1">{t.emoji}</p>
              <p className="font-bold text-slate-800 text-xs">{t.name}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{t.min.toLocaleString()} pts</p>
              <p className={`text-sm font-black mt-1.5 ${isCurrent ? 'text-[#d97706]' : 'text-slate-600'}`}>{t.discount}% off</p>
              {isCurrent && <p className="text-[#d97706] text-[9px] font-bold mt-1 uppercase tracking-wider">Tu nivel</p>}
            </div>
          )
        })}
      </div>

      {/* Beneficios actuales */}
      {currentTier && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#d97706]" />
            Tus beneficios actuales
          </h2>
          <ul className="space-y-2">
            {currentTier.perks.map(perk => (
              <li key={perk} className="flex items-center gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px] font-black shrink-0">✓</span>
                <span className="text-slate-700">{perk}</span>
              </li>
            ))}
          </ul>
          {nextTier && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-slate-400 text-xs mb-2">Próximos beneficios ({nextTier.name}):</p>
              <ul className="space-y-1">
                {nextTier.perks.filter(p => !currentTier.perks.includes(p)).map(perk => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-slate-400">
                    <ArrowRight className="w-3 h-3 text-[#f0b429]" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Historial de transacciones */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Historial de puntos</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="py-14 text-center px-6">
            <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-500 text-sm">Sin movimientos aún</p>
            <p className="text-slate-400 text-xs mt-1">Tus puntos aparecerán aquí después de cada viaje.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map(tx => (
              <div key={tx.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  tx.type === 'earned'   ? 'bg-emerald-50' :
                  tx.type === 'bonus'   ? 'bg-[rgba(240,180,41,0.1)]' :
                                          'bg-red-50'
                }`}>
                  {tx.type === 'earned'   && <Bus className="w-4 h-4 text-emerald-600" />}
                  {tx.type === 'bonus'    && <Star className="w-4 h-4 text-[#d97706]" />}
                  {tx.type === 'redeemed' && <Gift className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 text-sm">{tx.description}</p>
                  <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(tx.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div className={`font-black text-sm ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
