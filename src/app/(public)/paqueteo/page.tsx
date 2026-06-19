import { Metadata } from 'next'
import {
  Package, Zap, MessageCircle, MapPin, Phone, CheckCircle2,
  ArrowRight, Star, Truck, Clock, Shield,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaqueteoInteractive } from '@/components/public/paqueteo-interactive'
import { HeroTracker } from '@/components/public/hero-tracker'

export const metadata: Metadata = {
  title: 'Paqueteo | Tres Estrellas de Oro',
  description: 'Envío de paquetes y encomiendas entre Los Angeles y Tijuana. Servicio confiable por más de 30 años.',
}

const SERVICES = [
  {
    icon: <Package className="w-6 h-6" />,
    title: 'Envío',
    desc: 'Envía paquetes y encomiendas de Los Angeles a Tijuana y viceversa con total seguridad.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Express',
    desc: 'Servicio de entrega express personalizado para paquetes urgentes que no pueden esperar.',
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'Asesoría',
    desc: 'Consulta personalizada para determinar el mejor servicio según el tamaño y destino de tu paquete.',
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: 'Entrega en terminal',
    desc: 'Entrega disponible en todas nuestras sucursales en Los Angeles, Huntington Park, San Ysidro y Tijuana.',
  },
]

const TERMINALS = [
  { city: 'Los Angeles, CA',     phone: '(213) 624-5524', tel: '+12136245524' },
  { city: 'Huntington Park, CA', phone: '(323) 588-9188', tel: '+13235889188' },
  { city: 'San Ysidro, CA',      phone: '(619) 428-5512', tel: '+16194285512' },
  { city: 'Garita de Otay, MX',  phone: '(664) 208-8399', tel: '+526642088399' },
]

export default function PaqueteoPage() {
  return (
    <div className="bg-slate-50 min-h-screen">

      {/* Hero */}
      <div className="pt-28 pb-20 px-4 relative overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://ibsbvkcisqkghrpflrvc.supabase.co/storage/v1/object/public/imagenes/ChatGPT%20Image%208%20jun%202026,%2011_09_53%20p.m..png"
            alt=""
            className="hidden sm:block w-full h-full object-cover object-top"
          />
          <img
            src="https://ibsbvkcisqkghrpflrvc.supabase.co/storage/v1/object/public/imagenes/Screen-Shot-2025-06-27-at-9.15.40-PM.png"
            alt=""
            className="block sm:hidden w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e42]/80 to-[#0f2c5c]/75" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-5">
            <Package className="w-3.5 h-3.5 text-[#c8a951]" />
            <span className="text-white/80 text-xs font-bold tracking-wider uppercase">Envío de paquetes</span>
          </div>
          <h1 className="text-white font-black text-4xl sm:text-5xl tracking-tight mb-4">
            Paqueteo
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Más de <strong className="text-white">30 años</strong> conectando familias, comunidades y oportunidades entre Los Angeles y Tijuana.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-2">
            <a href="#cotizar">
              <Button className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold px-6">
                <ArrowRight className="w-4 h-4 mr-2" />
                Cotizar ahora
              </Button>
            </a>
          </div>

          {/* Tracking search embedded in hero */}
          <div className="mt-2">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Rastrear mi paquete</p>
            <HeroTracker />
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="bg-[#c01515] py-4 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 sm:gap-10">
          {[
            { icon: <Shield className="w-4 h-4" />,  text: 'Envío seguro y confiable' },
            { icon: <Clock className="w-4 h-4" />,   text: 'Entrega en el mismo día de salida' },
            { icon: <Truck className="w-4 h-4" />,   text: 'Servicio diario todos los días' },
            { icon: <Star className="w-4 h-4 fill-white" />, text: '+30 años de experiencia' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 text-white/90 text-sm font-semibold">
              {item.icon} {item.text}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-12">

        {/* Services */}
        <div>
          <div className="text-center mb-8">
            <h2 className="font-black text-[#0f2c5c] text-3xl tracking-tight mb-2">Nuestros servicios</h2>
            <p className="text-slate-500 text-sm">Soluciones de envío adaptadas a tus necesidades</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SERVICES.map(s => (
              <div key={s.title} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#c01515]/30 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-red-50 group-hover:bg-[#c01515] flex items-center justify-center mb-3 transition-colors text-[#c01515] group-hover:text-white">
                  {s.icon}
                </div>
                <h3 className="font-black text-[#0f2c5c] text-lg mb-1.5">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive: tracking + price calculator */}
        <PaqueteoInteractive />

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-sm leading-relaxed">
            <strong>¿Paquete fuera de medida?</strong> Contáctanos para una cotización personalizada. Manejamos artículos especiales, electrodomésticos y envíos de alto volumen.
          </p>
        </div>

        {/* How it works */}
        <div>
          <div className="text-center mb-8">
            <h2 className="font-black text-[#0f2c5c] text-3xl tracking-tight mb-2">¿Cómo funciona?</h2>
            <p className="text-slate-500 text-sm">Proceso sencillo en tres pasos</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Lleva tu paquete', desc: 'Llega a cualquiera de nuestras terminales con tu paquete bien empacado y etiquetado con nombre y teléfono del destinatario.' },
              { n: '2', title: 'Paga la tarifa', desc: 'Elige el tamaño correspondiente y paga en caja. Recibirás un comprobante de envío con número de seguimiento.' },
              { n: '3', title: 'Tu paquete viaja ese día', desc: 'El paquete viaja en el mismo autobús del día. El destinatario lo recoge en la terminal de destino presentando ID.' },
            ].map(step => (
              <div key={step.n} className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-[#0f2c5c] text-white font-black text-xl flex items-center justify-center mx-auto mb-3">
                  {step.n}
                </div>
                <h3 className="font-bold text-[#0f2c5c] text-base mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What's included */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-black text-[#0f2c5c] text-xl mb-4">Incluido en cada envío</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              'Manejo cuidadoso del paquete',
              'Comprobante de envío con folio',
              'Contacto directo con el personal para seguimiento',
              'Cotización gratuita sin compromiso',
              'Entrega disponible en todas las sucursales',
              'Servicio disponible todos los días del año',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#c01515] shrink-0" />
                <span className="text-slate-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminals */}
        <div>
          <div className="text-center mb-6">
            <h2 className="font-black text-[#0f2c5c] text-3xl tracking-tight mb-2">Puntos de entrega y recepción</h2>
            <p className="text-slate-500 text-sm">Lleva o recoge tu paquete en cualquiera de nuestras terminales</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {TERMINALS.map(t => (
              <div key={t.city} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 hover:border-[#c01515]/30 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#0f2c5c] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm mb-1">{t.city}</p>
                  <a href={`tel:${t.tel}`} className="flex items-center gap-1.5 text-[#c01515] text-sm font-semibold hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {t.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#0f2c5c] to-[#0a1e42] rounded-2xl p-8 text-center">
          <Package className="w-10 h-10 text-[#c8a951] mx-auto mb-3" />
          <h3 className="text-white font-black text-2xl mb-2">¿Listo para enviar?</h3>
          <p className="text-white/65 text-sm mb-6 max-w-sm mx-auto">
            Llámanos para una cotización gratuita o visita cualquier terminal con tu paquete.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:+12136245524">
              <Button className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold px-6">
                <Phone className="w-4 h-4 mr-2" />
                (213) 624-5524 · LA
              </Button>
            </a>
            <a href="tel:+13235889188">
              <Button variant="outline" className="border-white/25 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold px-6">
                <Phone className="w-4 h-4 mr-2" />
                (323) 588-9188 · HP
              </Button>
            </a>
          </div>
        </div>

        {/* Breadcrumb links */}
        <div className="flex gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-[#c01515] text-sm font-medium transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" /> Inicio
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/buscar" className="text-slate-500 hover:text-[#c01515] text-sm font-medium transition-colors">
            Comprar boleto
          </Link>
        </div>

      </div>
    </div>
  )
}
