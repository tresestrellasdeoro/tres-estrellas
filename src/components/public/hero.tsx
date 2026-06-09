'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Users, ArrowRight, ArrowLeftRight, Phone, ShieldCheck, Smartphone, Star, Wifi, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'

const STOPS = [
  { value: 'LA',  label: 'Los Angeles' },
  { value: 'HP',  label: 'Huntington Park' },
  { value: 'SYS', label: 'San Ysidro' },
  { value: 'TIJ', label: 'Aeropuerto Tijuana' },
  { value: 'OTY', label: 'Garita de Otay — Tijuana' },
]

export function Hero() {
  const router = useRouter()
  const [origin, setOrigin]           = useState('LA')
  const [destination, setDestination] = useState('OTY')
  const [date, setDate]               = useState(format(new Date(), 'yyyy-MM-dd'))
  const [passengers, setPassengers]   = useState(1)
  const [tripType, setTripType]       = useState<'one_way' | 'round_trip'>('one_way')

  const swapStops = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  const handleSearch = () => {
    const params = new URLSearchParams({ origin, destination, date, passengers: String(passengers), tripType })
    router.push(`/buscar?${params.toString()}`)
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Background photo */}
      <div className="absolute inset-0">
        <Image
          src="/hero-bg.jpg"
          alt="Bus Tres Estrellas de Oro"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e42]/85 via-[#0a1e42]/75 to-[#0a1e42]/90" />
      </div>

      {/* Red accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#cc1a1a] z-10" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">

        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-up">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Tres Estrellas de Oro"
              width={200}
              height={160}
              className="h-36 w-auto object-contain drop-shadow-2xl"
              priority
            />
          </Link>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mb-2 animate-fade-up-1">
          Transporte Los Angeles ↔ Tijuana
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto mb-3 animate-fade-up-2">
          12 salidas diarias · Todos los días del año
        </p>

        {/* Phones */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 animate-fade-up-2">
          {[
            { num: '(213) 275-1402', loc: 'Los Angeles' },
            { num: '(323) 588-9188', loc: 'Huntington Park' },
            { num: '(619) 428-5512', loc: 'San Ysidro' },
            { num: '(664) 208-8399', loc: 'México' },
          ].map(p => (
            <a key={p.num} href={`tel:+1${p.num.replace(/\D/g,'')}`}
              className="flex items-center gap-1.5 text-white/55 hover:text-[#c8a951] text-xs transition-colors">
              <Phone className="w-3 h-3" />
              {p.num} <span className="text-white/30">·</span> {p.loc}
            </a>
          ))}
        </div>

        {/* Trip type toggle */}
        <div className="inline-flex items-center bg-white/8 border border-white/15 rounded-xl p-1 mb-5 animate-fade-up-3">
          {(['one_way', 'round_trip'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTripType(type)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tripType === type
                  ? 'bg-[#c01515] text-white shadow-lg'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              {type === 'one_way' ? 'Solo ida' : 'Ida y vuelta'}
            </button>
          ))}
        </div>

        {/* Search form */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 p-4 sm:p-6 max-w-3xl mx-auto animate-fade-up-3 border-t-4 border-[#cc1a1a]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

            {/* Origin */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#c01515]" />
                Origen
              </label>
              <div className="relative">
                <select
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] pr-8 cursor-pointer"
                >
                  {STOPS.filter(s => s.value !== destination).map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▾</span>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#c01515]" />
                Destino
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] pr-8 cursor-pointer"
                  >
                    {STOPS.filter(s => s.value !== origin).map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▾</span>
                </div>
                <button
                  onClick={swapStops}
                  className="shrink-0 w-11 h-11 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-[#c01515]/40 flex items-center justify-center transition-all group"
                  title="Intercambiar"
                >
                  <ArrowLeftRight className="w-4 h-4 text-slate-400 group-hover:text-[#c01515] transition-colors" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#c01515]" />
                Fecha de salida
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c01515]/30 focus:border-[#c01515] cursor-pointer"
              />
            </div>

            {/* Passengers */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-[#c01515]" />
                Pasajeros
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  className="px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold transition-colors text-lg leading-none"
                >−</button>
                <span className="flex-1 text-center text-sm font-bold text-slate-800">{passengers}</span>
                <button
                  onClick={() => setPassengers(Math.min(10, passengers + 1))}
                  className="px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold transition-colors text-lg leading-none"
                >+</button>
              </div>
            </div>

            {/* Search button */}
            <div className="flex flex-col justify-end">
              <Button
                onClick={handleSearch}
                className="w-full h-11 bg-[#c01515] hover:bg-[#a01010] text-white font-black text-sm rounded-xl shadow-lg hover:shadow-red-900/30 hover:shadow-xl transition-all group"
              >
                Buscar horarios
                <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 animate-fade-up-4">
          {[
            { icon: <ShieldCheck className="w-4 h-4" />, text: 'Pago seguro'        },
            { icon: <Smartphone   className="w-4 h-4" />, text: 'Boleto digital QR' },
            { icon: <Star         className="w-4 h-4" />, text: 'Puntos en cada viaje' },
            { icon: <Wifi         className="w-4 h-4" />, text: 'Wi-Fi a bordo'     },
            { icon: <Package      className="w-4 h-4" />, text: 'Envío de paquetes' },
          ].map(b => (
            <div
              key={b.text}
              className="flex items-center gap-2 bg-white/8 border border-white/12 backdrop-blur-sm rounded-full px-4 py-2 text-white/80 text-xs font-medium"
            >
              <span className="text-[#c8a951]">{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent z-0" />
    </section>
  )
}
