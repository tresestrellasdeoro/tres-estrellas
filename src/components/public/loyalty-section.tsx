import Link from 'next/link'
import { Star, Gift, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TIERS = [
  {
    name: 'Bronce',
    icon: '🥉',
    points: '100+',
    discount: '5%',
    perks: ['5% descuento', 'Boleto digital', 'Historial de viajes'],
    color: 'from-orange-800/30 to-amber-900/20',
    border: 'border-orange-800/30',
  },
  {
    name: 'Plata',
    icon: '🥈',
    points: '500+',
    discount: '10%',
    perks: ['10% descuento', 'Embarque prioritario', 'Cancelación flexible'],
    color: 'from-slate-600/30 to-slate-700/20',
    border: 'border-slate-500/30',
    featured: false,
  },
  {
    name: 'Oro',
    icon: '🥇',
    points: '2,000+',
    discount: '15%',
    perks: ['15% descuento', 'Embarque prioritario', 'Asiento preferencial', 'Cambios gratis'],
    color: 'from-[rgba(240,180,41,0.2)] to-[rgba(240,180,41,0.05)]',
    border: 'border-[rgba(240,180,41,0.4)]',
    featured: true,
  },
  {
    name: 'Platino',
    icon: '💎',
    points: '5,000+',
    discount: '20%',
    perks: ['20% descuento', 'VIP lounge', 'Asistente dedicado', 'Todo incluido'],
    color: 'from-purple-900/30 to-indigo-900/20',
    border: 'border-purple-500/30',
  },
]

export function LoyaltySection() {
  return (
    <section id="lealtad" className="py-20 bg-[#0a1628] bg-dot-pattern relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f0b429]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(240,180,41,0.1)] border border-[rgba(240,180,41,0.25)] mb-4">
            <Star className="w-3 h-3 text-[#f0b429]" />
            <span className="text-[#f0b429] text-xs font-bold tracking-wider uppercase">Programa de lealtad</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
            Gana puntos en cada viaje
          </h2>
          <p className="text-white/45 text-base mt-3 max-w-lg mx-auto">
            Cada dólar gastado = 1 punto. Sube de tier y desbloquea descuentos y beneficios exclusivos.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className={`relative rounded-2xl bg-gradient-to-b ${tier.color} border ${tier.border} p-5 ${tier.featured ? 'ring-1 ring-[#f0b429]/50 scale-105' : ''}`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f0b429] text-[#0a1628] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </div>
              )}
              <div className="text-3xl mb-3">{tier.icon}</div>
              <h3 className="text-white font-bold text-base mb-1">{tier.name}</h3>
              <p className="text-white/40 text-xs mb-3">{tier.points} puntos</p>
              <div className="text-[#f0b429] font-black text-2xl mb-4">{tier.discount}</div>
              <ul className="space-y-1.5">
                {tier.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-2 text-white/60 text-xs">
                    <span className="text-[#f0b429]">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-6 sm:p-8">
          <h3 className="text-white font-bold text-base mb-6 text-center">¿Cómo funciona?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: <Gift className="w-5 h-5" />, step: '1', title: 'Compra tu boleto', desc: 'Registra tu cuenta y compra en línea o en taquilla.' },
              { icon: <Star className="w-5 h-5" />, step: '2', title: 'Gana puntos', desc: '1 punto por cada dólar. Los puntos se acreditan al confirmar el viaje.' },
              { icon: <Zap className="w-5 h-5" />, step: '3', title: 'Canjea beneficios', desc: 'Usa tus puntos para descuentos o viajes gratis. Sin expiración.' },
            ].map(item => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[rgba(240,180,41,0.12)] border border-[rgba(240,180,41,0.25)] flex items-center justify-center text-[#f0b429] shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/auth/registro">
              <Button className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-black px-8 h-11 rounded-xl text-sm">
                Crear cuenta gratis
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
