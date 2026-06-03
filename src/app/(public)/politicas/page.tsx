import { Metadata } from 'next'
import {
  ShieldCheck, Cigarette, Wine, Siren, UserCheck, Luggage,
  MessageSquareX, Info, ArrowRight, Phone, BadgeAlert,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Regulaciones y Políticas | Tres Estrellas de Oro',
  description: 'Normas y políticas en terminales y autobuses de Tres Estrellas de Oro.',
}

function PolicyItem({
  icon,
  title,
  desc,
  type = 'prohibited',
}: {
  icon: React.ReactNode
  title: string
  desc: string
  type?: 'prohibited' | 'required' | 'info'
}) {
  const styles = {
    prohibited: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      iconBg: 'bg-[#c01515]',
      badge: 'bg-red-100 text-[#c01515] border-red-200',
      badgeText: 'PROHIBIDO',
    },
    required: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      iconBg: 'bg-[#0f2c5c]',
      badge: 'bg-blue-100 text-[#0f2c5c] border-blue-200',
      badgeText: 'OBLIGATORIO',
    },
    info: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      badgeText: 'IMPORTANTE',
    },
  }
  const s = styles[type]
  return (
    <div className={`${s.bg} ${s.border} border rounded-2xl p-5 flex gap-4`}>
      <div className={`${s.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          <span className={`${s.badge} border text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider`}>
            {s.badgeText}
          </span>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function PoliticasPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0a1e42] to-[#0f2c5c] pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c8a951]" />
            <span className="text-white/80 text-xs font-bold tracking-wider uppercase">Regulaciones</span>
          </div>
          <h1 className="text-white font-black text-4xl sm:text-5xl tracking-tight mb-4">
            Regulaciones y Políticas
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto leading-relaxed">
            Normas de conducta y políticas de la empresa en terminales y autobuses.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-8">

        {/* Intro statement */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0f2c5c] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-[#0f2c5c] text-lg mb-2">
              Regulaciones de la Compañía
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Estas normas aplican en todas las terminales y autobuses de <strong>Tres Estrellas de Oro Inc.</strong>{' '}
              El cumplimiento garantiza un viaje seguro y cómodo para todos los pasajeros.
              <br />
              <span className="text-slate-400 text-xs mt-1 inline-block italic">
                These regulations apply at all Tres Estrellas de Oro Inc. terminals and buses.
              </span>
            </p>
          </div>
        </div>

        {/* Políticas obligatorias */}
        <div>
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0f2c5c]" /> Requisitos obligatorios
          </h3>
          <div className="space-y-3">
            <PolicyItem
              type="required"
              icon={<UserCheck className="w-5 h-5" />}
              title="Verificación de identidad"
              desc="La empresa puede solicitar identificación para confirmar que el pasajero es quien aparece en el boleto. No está obligada a hacerlo, pero se recomienda llevar ID vigente. — The company may ask but is not obligated to ask for ID."
            />
            <PolicyItem
              type="required"
              icon={<Luggage className="w-5 h-5" />}
              title="Documentación de equipaje"
              desc="Todos los pasajeros están sujetos a presentar su equipaje para ser documentado antes de abordar. — All passengers are subject to presenting their luggage for registration."
            />
          </div>
        </div>

        {/* Prohibiciones */}
        <div>
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c01515]" /> Estrictamente prohibido
          </h3>
          <div className="space-y-3">
            <PolicyItem
              type="prohibited"
              icon={<MessageSquareX className="w-5 h-5" />}
              title="Comportamiento y lenguaje grosero"
              desc="Se prohíbe el comportamiento y el lenguaje grosero, agresivo o abusivo hacia el personal o hacia otros pasajeros. — Rude, aggressive, or abusive behavior or language is prohibited."
            />
            <PolicyItem
              type="prohibited"
              icon={<Cigarette className="w-5 h-5" />}
              title="Fumar"
              desc="Está estrictamente prohibido fumar dentro de los autobuses y en las instalaciones de la terminal. — Smoking is strictly prohibited on buses and terminal facilities."
            />
            <PolicyItem
              type="prohibited"
              icon={<Wine className="w-5 h-5" />}
              title="Bebidas alcohólicas y drogas"
              desc="El consumo de bebidas alcohólicas y drogas está estrictamente prohibido. — Alcoholic beverages and illegal substances are strictly prohibited."
            />
            <PolicyItem
              type="prohibited"
              icon={<Siren className="w-5 h-5" />}
              title="Armas de fuego y armas"
              desc="Está estrictamente prohibido portar armas de fuego, municiones o cualquier tipo de arma. — Firearms, ammunition, and weapons of any kind are strictly prohibited."
            />
            <PolicyItem
              type="prohibited"
              icon={<BadgeAlert className="w-5 h-5" />}
              title="Holgazanear y solicitar favores"
              desc="Está prohibido ofrecer o solicitar favores dentro de las instalaciones y holgazanear en terminales. — Soliciting or loitering is strictly prohibited."
            />
          </div>
        </div>

        {/* Bilingüal note */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#0f2c5c] shrink-0 mt-0.5" />
          <p className="text-slate-500 text-sm leading-relaxed">
            El incumplimiento de estas normas puede resultar en la negación del servicio sin derecho a reembolso.{' '}
            <span className="text-slate-400 italic">Failure to comply with these regulations may result in denial of service without a refund.</span>
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#0f2c5c] to-[#0a1e42] rounded-2xl p-8 text-center">
          <ShieldCheck className="w-8 h-8 text-[#c8a951] mx-auto mb-3" />
          <h3 className="text-white font-black text-xl mb-2">¿Alguna duda sobre las políticas?</h3>
          <p className="text-white/65 text-sm mb-5">
            Nuestro equipo en terminal puede orientarte antes de abordar.
          </p>
          <a href="tel:+18003378735">
            <Button className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold">
              <Phone className="w-4 h-4 mr-2" />
              (800) 337-8735
            </Button>
          </a>
        </div>

        {/* Navigation links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/antes-de-viajar" className="group flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#c01515]/40 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-[#c01515] transition-colors">
              <Info className="w-4 h-4 text-[#c01515] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Antes de viajar</p>
              <p className="text-slate-500 text-xs">Equipaje, horarios y terminales</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#c01515] transition-colors" />
          </Link>
          <Link href="/restricciones" className="group flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#0f2c5c]/40 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-[#0f2c5c] transition-colors">
              <ShieldCheck className="w-4 h-4 text-[#0f2c5c] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Restricciones</p>
              <p className="text-slate-500 text-xs">Validaciones y reembolsos de boletos</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#0f2c5c] transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  )
}
