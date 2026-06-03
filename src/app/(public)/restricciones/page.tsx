import { Metadata } from 'next'
import {
  Ticket, RefreshCcw, Banknote, CalendarX, AlertTriangle,
  XCircle, CheckCircle2, Clock, Info, Phone, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Restricciones | Tres Estrellas de Oro',
  description: 'Restricciones y validaciones de boletos, reembolsos y políticas de cambio.',
}

function Card({
  icon,
  title,
  accent = 'red',
  children,
}: {
  icon: React.ReactNode
  title: string
  accent?: 'red' | 'navy' | 'amber' | 'slate'
  children: React.ReactNode
}) {
  const styles = {
    red:   { border: 'border-red-200',   bg: 'bg-red-50',    iconBg: 'bg-[#c01515]', title: 'text-[#c01515]' },
    navy:  { border: 'border-blue-200',  bg: 'bg-blue-50',   iconBg: 'bg-[#0f2c5c]', title: 'text-[#0f2c5c]' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50',  iconBg: 'bg-amber-500',  title: 'text-amber-700' },
    slate: { border: 'border-slate-200', bg: 'bg-slate-50',  iconBg: 'bg-slate-600',  title: 'text-slate-700' },
  }
  const s = styles[accent]
  return (
    <div className={`${s.bg} ${s.border} border rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`${s.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white`}>
          {icon}
        </div>
        <h2 className={`${s.title} font-black text-xl`}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Rule({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-white rounded-xl px-4 py-3 border border-slate-100">
      {ok === false
        ? <XCircle className="w-4 h-4 text-[#c01515] shrink-0 mt-0.5" />
        : ok === true
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        : <Info className="w-4 h-4 text-[#0f2c5c] shrink-0 mt-0.5" />
      }
      <span className="text-slate-700 text-sm leading-relaxed">{text}</span>
    </div>
  )
}

export default function RestriccionesPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0a1e42] to-[#0f2c5c] pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#c8a951]" />
            <span className="text-white/80 text-xs font-bold tracking-wider uppercase">Políticas de boletos</span>
          </div>
          <h1 className="text-white font-black text-4xl sm:text-5xl tracking-tight mb-4">
            Restricciones
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto leading-relaxed">
            Validaciones, reembolsos y condiciones de uso de tus boletos de viaje.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-6">

        {/* 1. Validez del boleto */}
        <Card icon={<Ticket className="w-5 h-5" />} title="Validez de los boletos" accent="navy">
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarX className="w-4 h-4 text-[#0f2c5c]" />
                  <span className="font-bold text-[#0f2c5c] text-sm">Boleto de ida</span>
                </div>
                <p className="text-slate-600 text-sm">Válido por <strong>1 mes</strong> a partir de la fecha de salida.</p>
                <div className="mt-2 inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
                  <AlertTriangle className="w-3 h-3" /> 30% de penalización por cancelación
                </div>
              </div>
              <div className="bg-white rounded-xl border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarX className="w-4 h-4 text-[#0f2c5c]" />
                  <span className="font-bold text-[#0f2c5c] text-sm">Boleto de ida y vuelta</span>
                </div>
                <p className="text-slate-600 text-sm">Válido por <strong>3 meses</strong> desde el primer viaje.</p>
                <div className="mt-2 inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
                  <XCircle className="w-3 h-3" /> Sin cancelaciones en boleto de promoción
                </div>
              </div>
            </div>
            <Rule ok={false} text="Los boletos con alteraciones o modificaciones no son válidos." />
            <Rule ok={false} text="Los boletos son inválidos después de la fecha y hora de salida impresa." />
          </div>
        </Card>

        {/* 2. No transferibles / No reembolsables */}
        <Card icon={<Banknote className="w-5 h-5" />} title="No transferibles · No reembolsables" accent="red">
          <div className="space-y-3">
            <Rule ok={false} text="Los boletos de cortesía no se pueden cambiar por efectivo." />
            <Rule ok={false} text="Los boletos prepagados no pueden ser cancelados." />
            <Rule ok={false} text="La empresa no se hace responsable por boletos perdidos. Si pierdes tu boleto deberás adquirir uno nuevo." />
            <Rule ok={false} text="Los boletos no son transferibles a otra persona." />
          </div>
        </Card>

        {/* 3. Limitación de responsabilidad por retrasos */}
        <Card icon={<Clock className="w-5 h-5" />} title="Retrasos y responsabilidad" accent="amber">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Tres Estrellas de Oro no se hace responsable por retrasos causados por factores externos fuera de su control:
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {['Condiciones climáticas', 'Descomposturas mecánicas', 'Malas condiciones de carretera'].map(item => (
              <div key={item} className="bg-white rounded-xl border border-amber-100 px-4 py-3 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <p className="text-slate-700 text-xs font-semibold">{item}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Rule ok={false} text="No hay reembolso ni compensación por retrasos." />
            <Rule ok={false} text="La empresa no cubre boletos de avión ni gastos adicionales causados por retrasos." />
          </div>
        </Card>

        {/* 4. Reembolsos y cambios */}
        <Card icon={<RefreshCcw className="w-5 h-5" />} title="Reembolsos y cambios de fecha" accent="slate">
          <div className="space-y-3">
            <Rule ok={false} text="No se realizan reembolsos por retrasos del servicio." />
            <Rule ok={false} text="La empresa no reembolsa boletos de avión ni otros transportes adquiridos por el pasajero." />
            <Rule ok={false} text="No se asume responsabilidad por gastos o pérdidas derivados de un retraso." />
            <Rule ok={true}  text="Para cambios de fecha contacta a la terminal con anticipación sujeto a disponibilidad y penalización aplicable." />
          </div>
        </Card>

        {/* 5. Conexiones */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0f2c5c] flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-[#0f2c5c] font-black text-xl">Recomendaciones para conexiones</h2>
          </div>
          <div className="space-y-3">
            <Rule ok={true}  text="Verifica la hora de salida de tu conexión antes de viajar." />
            <Rule ok={true}  text="Llega al punto de conexión con un mínimo de 4 horas de anticipación." />
            <Rule ok={false} text="La empresa no se responsabiliza por boletos robados, perdidos o dañados en el trayecto." />
          </div>
        </div>

        {/* Warning banner */}
        <div className="bg-[#c01515] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-white shrink-0" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm mb-1">¿Tienes preguntas sobre tu boleto?</p>
            <p className="text-white/75 text-sm">Comunícate con nosotros antes de la fecha de salida para resolver cualquier duda.</p>
          </div>
          <a href="tel:+18003378735">
            <Button className="bg-white text-[#c01515] hover:bg-white/90 font-bold shrink-0">
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
          <Link href="/politicas" className="group flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#0f2c5c]/40 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-[#0f2c5c] transition-colors">
              <Ticket className="w-4 h-4 text-[#0f2c5c] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Regulaciones y políticas</p>
              <p className="text-slate-500 text-xs">Normas en terminales y autobuses</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#0f2c5c] transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  )
}
