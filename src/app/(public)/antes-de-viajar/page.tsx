import { Metadata } from 'next'
import {
  Ticket, Clock, Luggage, Baby, Scale, ShieldAlert, Phone,
  CheckCircle2, XCircle, Info, AlertTriangle, MapPin,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Antes de viajar | Tres Estrellas de Oro',
  description: 'Información importante antes de tu viaje: boleto electrónico, equipaje, llegada y más.',
}

const Section = ({
  icon,
  title,
  color = 'red',
  children,
}: {
  icon: React.ReactNode
  title: string
  color?: 'red' | 'navy' | 'gold' | 'amber'
  children: React.ReactNode
}) => {
  const colors = {
    red:   { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-[#c01515] text-white', head: 'text-[#c01515]' },
    navy:  { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-[#0f2c5c] text-white', head: 'text-[#0f2c5c]' },
    gold:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'bg-[#c8a951] text-white', head: 'text-[#c8a951]' },
    amber: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-500 text-white', head: 'text-orange-600' },
  }
  const c = colors[color]
  return (
    <div className={`${c.bg} ${c.border} border rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`${c.icon} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <h2 className={`${c.head} font-black text-xl`}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function AntesDeViajarPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#0a1e42] to-[#0f2c5c] pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-5">
            <Info className="w-3.5 h-3.5 text-[#c8a951]" />
            <span className="text-white/80 text-xs font-bold tracking-wider uppercase">Información importante</span>
          </div>
          <h1 className="text-white font-black text-4xl sm:text-5xl tracking-tight mb-4">
            Antes de Viajar
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto leading-relaxed">
            Todo lo que necesitas saber para que tu viaje sea fácil, cómodo y sin sorpresas.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-6">

        {/* 1. Boleto electrónico */}
        <Section icon={<Ticket className="w-5 h-5" />} title="Tu boleto electrónico" color="red">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Al comprar en línea recibirás un correo electrónico con tu boleto digital. Asegúrate de tenerlo listo el día del viaje — no necesitas imprimirlo.
          </p>
          <div className="space-y-2">
            {[
              'Nombre completo del pasajero',
              'Número de confirmación único',
              'Código QR para escanear en terminal',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#c01515] shrink-0" />
                <span className="text-slate-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Llegada al terminal */}
        <Section icon={<Clock className="w-5 h-5" />} title="El día de tu viaje" color="navy">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Para garantizar tu lugar y un abordaje sin contratiempos, sigue estos pasos:
          </p>
          <ol className="space-y-3">
            {[
              { n: '1', text: 'Llega al terminal con 30 a 60 minutos de anticipación.' },
              { n: '2', text: 'Presenta tu boleto digital o número de confirmación al agente.' },
              { n: '3', text: 'Aborda únicamente en la terminal autorizada indicada en tu boleto.' },
            ].map(step => (
              <li key={step.n} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-[#0f2c5c] text-white text-xs font-black flex items-center justify-center shrink-0">
                  {step.n}
                </span>
                <span className="text-slate-700 text-sm leading-relaxed pt-0.5">{step.text}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* 3. Equipaje */}
        <Section icon={<Luggage className="w-5 h-5" />} title="Políticas de equipaje" color="gold">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Limits */}
            <div>
              <p className="font-bold text-slate-800 text-sm mb-3">Límites de peso</p>
              <div className="space-y-2">
                {[
                  { label: 'Adultos', value: 'Hasta 75 lbs' },
                  { label: 'Niños (3–9 años)', value: 'Hasta 35 lbs' },
                  { label: 'Exceso de peso', value: '$0.40 por libra extra' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                    <span className="text-slate-600 text-sm flex items-center gap-2">
                      <Scale className="w-3.5 h-3.5 text-[#c8a951]" />
                      {row.label}
                    </span>
                    <span className="font-bold text-[#0f2c5c] text-sm">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div>
              <p className="font-bold text-slate-800 text-sm mb-3">Reglas importantes</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 text-sm">Todo el equipaje debe llevar identificación con nombre y teléfono.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-red-100">
                  <XCircle className="w-4 h-4 text-[#c01515] shrink-0 mt-0.5" />
                  <span className="text-slate-600 text-sm">No se aceptan bolsas de papel o plástico como equipaje.</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 4. Artículos especiales */}
        <Section icon={<Baby className="w-5 h-5" />} title="Artículos especiales y electrodomésticos" color="amber">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Electrodomésticos, sillitas de bebé y artículos voluminosos tienen un cargo adicional según su tamaño y peso. Precio: <strong className="text-orange-600">$5 a $35 por artículo</strong>.
          </p>
          <div className="bg-white rounded-xl border border-orange-100 px-4 py-3">
            <p className="text-slate-500 text-xs">
              Consulta con el agente en terminal antes de viajar para confirmar el costo exacto de tu artículo.
            </p>
          </div>
        </Section>

        {/* 5. Responsabilidad por equipaje */}
        <Section icon={<ShieldAlert className="w-5 h-5" />} title="Responsabilidad por pérdida o daño" color="navy">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Tres Estrellas de Oro se responsabiliza por equipaje perdido o dañado dentro de los siguientes límites:
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Por boleto adulto', value: '$100' },
              { label: 'Por medio boleto', value: '$50' },
              { label: 'Máximo por pasajero', value: '$150' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-blue-100 px-4 py-3 text-center">
                <p className="font-black text-[#0f2c5c] text-2xl">{item.value}</p>
                <p className="text-slate-500 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2.5 bg-white rounded-xl border border-blue-100 px-4 py-3">
            <Info className="w-4 h-4 text-[#0f2c5c] shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm">
              Si tu equipaje tiene un valor mayor, puedes declararlo al momento de abordar para extender la cobertura.
            </p>
          </div>
        </Section>

        {/* Terminals map */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#c01515] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-[#0f2c5c] font-black text-xl">Nuestras terminales</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { city: 'Los Angeles, CA',       label: 'Terminal Los Angeles',    phone: '(213) 275-1402' },
              { city: 'Huntington Park, CA',   label: 'Terminal Huntington Park', phone: '(323) 588-9188' },
              { city: 'San Ysidro, CA',        label: 'Terminal San Ysidro',     phone: '(619) 428-5512' },
              { city: 'Tijuana, BC México',    label: 'Garita de Otay / Aeropuerto', phone: '(664) 208-8399' },
            ].map(t => (
              <div key={t.city} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <MapPin className="w-4 h-4 text-[#c01515] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{t.label}</p>
                  <p className="text-slate-500 text-xs">{t.city}</p>
                  <a href={`tel:${t.phone.replace(/\D/g, '')}`} className="text-[#c01515] text-xs font-semibold hover:underline flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {t.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#0f2c5c] to-[#0a1e42] rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-[#c8a951] mx-auto mb-3" />
          <h3 className="text-white font-black text-xl mb-2">¿Tienes alguna duda?</h3>
          <p className="text-white/65 text-sm mb-5">
            Llámanos antes de tu viaje. Estamos disponibles todos los días del año.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:+18003378735">
              <Button className="bg-[#c8a951] hover:bg-[#b8994a] text-[#0f2c5c] font-bold">
                <Phone className="w-4 h-4 mr-2" />
                (800) 337-8735
              </Button>
            </a>
            <Link href="/buscar">
              <Button className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold">
                Comprar mi boleto
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
