import Link from 'next/link'
import { Phone, Mail, MapPin, Star, ExternalLink } from 'lucide-react'
import { TresEstrellasLogo } from './logo'

const PHONES = [
  { num: '+1 (213) 275-1402', loc: 'Los Angeles',    href: 'tel:+12132751402' },
  { num: '+1 (323) 588-9188', loc: 'Huntington Park',href: 'tel:+13235889188' },
  { num: '+1 (619) 428-5512', loc: 'San Ysidro',     href: 'tel:+16194285512' },
  { num: '+52 (664) 208-8399',loc: 'Tijuana, México', href: 'tel:+526642088399' },
]

export function Footer() {
  return (
    <footer className="bg-[#0a1e42] border-t border-white/8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* Logo & Brand */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-4 inline-block mb-4">
              <TresEstrellasLogo size="sm" href="/" />
            </div>
            <p className="text-white/45 text-xs leading-relaxed">
              Transporte seguro y cómodo entre Los Angeles y Tijuana. 12 salidas diarias, todos los días del año.
            </p>
            <div className="flex items-center gap-1 mt-3">
              {[1,2,3].map(i => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#c8a951] text-[#c8a951]" />
              ))}
              <span className="text-white/40 text-xs ml-1">Viaja con confianza</span>
            </div>
          </div>

          {/* Rutas LA → TJ */}
          <div>
            <h3 className="text-white/90 text-xs font-bold tracking-widest uppercase mb-4 border-b border-white/10 pb-2">
              LA → Tijuana
            </h3>
            <ul className="space-y-2">
              {['3:20 AM', '7:20 AM', '9:20 AM', '11:20 AM', '1:20 PM', '3:20 PM', '5:20 PM', '7:20 PM'].map(t => (
                <li key={t}>
                  <Link href="/buscar?origin=LA&destination=OTY" className="text-white/45 text-xs hover:text-[#c8a951] transition-colors flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#c01515]" />
                    Salida {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Rutas TJ → LA */}
          <div>
            <h3 className="text-white/90 text-xs font-bold tracking-widest uppercase mb-4 border-b border-white/10 pb-2">
              Tijuana → LA
            </h3>
            <ul className="space-y-2">
              {['11:30 AM', '1:30 PM', '3:30 PM', '7:30 PM'].map(t => (
                <li key={t}>
                  <Link href="/buscar?origin=OTY&destination=LA" className="text-white/45 text-xs hover:text-[#c8a951] transition-colors flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#c8a951]" />
                    Salida {t}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-white/90 text-xs font-bold tracking-widest uppercase mt-5 mb-3 border-b border-white/10 pb-2">
              Info
            </h3>
            <ul className="space-y-2">
              {[
                { label: 'Horarios', href: '/buscar' },
                { label: 'Puntos de lealtad', href: '/#lealtad' },
                { label: 'Antes de viajar', href: '#' },
                { label: 'Restricciones', href: '#' },
                { label: 'Envío de paquetes', href: '#' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/45 text-xs hover:text-white/80 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Teléfonos */}
          <div className="md:col-span-2">
            <h3 className="text-white/90 text-xs font-bold tracking-widest uppercase mb-4 border-b border-white/10 pb-2">
              Teléfonos de contacto
            </h3>
            <ul className="space-y-3">
              {PHONES.map(p => (
                <li key={p.href} className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#c01515] mt-0.5 shrink-0" />
                  <div>
                    <a href={p.href} className="text-white/80 text-sm font-bold hover:text-white transition-colors block">{p.num}</a>
                    <span className="text-white/35 text-[11px]">{p.loc}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 p-4 bg-[#c01515]/15 border border-[#c01515]/25 rounded-xl">
              <p className="text-white/70 text-xs font-semibold mb-1">¿Necesitas ayuda?</p>
              <p className="text-white/45 text-[11px] leading-relaxed">
                Llama a cualquiera de nuestros números o visita nuestra terminal más cercana.
              </p>
              <a
                href="https://mediumaquamarine-raven-425194.hostingersite.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-[#c8a951] text-xs hover:text-[#e8c97a] transition-colors"
              >
                Sitio web oficial <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/6 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Tres Estrellas de Oro Inc. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <Link href="/privacidad" className="text-white/25 text-xs hover:text-white/50 transition-colors">Privacidad</Link>
            <Link href="/terminos" className="text-white/25 text-xs hover:text-white/50 transition-colors">Términos</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
