import { Wifi, Wind, Bath, Usb, Armchair, Shield, Clock, SmartphoneNfc } from 'lucide-react'
import Image from 'next/image'

const AMENITIES = [
  { icon: <Wifi className="w-5 h-5" />,          title: 'Wi-Fi Gratis',          desc: 'Conexión a bordo en toda la ruta' },
  { icon: <Wind className="w-5 h-5" />,           title: 'Aire acondicionado',     desc: 'Temperatura ideal todo el viaje' },
  { icon: <Bath className="w-5 h-5" />,           title: 'Baño a bordo',          desc: 'Sin paradas obligadas' },
  { icon: <Usb className="w-5 h-5" />,            title: 'Carga USB',             desc: 'Carga tu dispositivo en tu asiento' },
  { icon: <Armchair className="w-5 h-5" />,       title: 'Asientos reclinables',  desc: 'Mayor comodidad en viajes largos' },
  { icon: <Shield className="w-5 h-5" />,         title: 'Seguridad 24/7',        desc: 'Conductores certificados y GPS' },
  { icon: <Clock className="w-5 h-5" />,          title: 'Puntualidad',           desc: 'Salidas garantizadas a tiempo' },
  { icon: <SmartphoneNfc className="w-5 h-5" />,  title: 'Boleto digital',        desc: 'Solo muestra tu QR al subir' },
]

export function AmenitiesSection() {
  return (
    <section id="amenidades" className="relative py-24 overflow-hidden">
      {/* Background photo */}
      <div className="absolute inset-0">
        <Image
          src="/amenities-bg.jpg"
          alt="Los Angeles skyline"
          fill
          className="object-cover object-center"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e42]/80 via-[#0a1628]/75 to-[#0a1e42]/85" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c8a951]/15 border border-[#c8a951]/35 mb-4">
            <span className="text-[#c8a951] text-xs font-bold tracking-wider uppercase">A bordo</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
            Viaja como mereces
          </h2>
          <p className="text-white/60 text-base mt-3 max-w-lg mx-auto">
            Nuestros autobuses están equipados con todo lo que necesitas para un viaje cómodo y agradable.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {AMENITIES.map(item => (
            <div
              key={item.title}
              className="bg-white/8 backdrop-blur-sm rounded-2xl p-5 border border-white/15 hover:bg-white/15 hover:border-[#c8a951]/50 transition-all group text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-[#c8a951]/15 border border-[#c8a951]/30 flex items-center justify-center text-[#c8a951] mx-auto mb-3 group-hover:bg-[#c8a951]/25 transition-colors">
                {item.icon}
              </div>
              <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
              <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
