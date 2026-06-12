'use client'

import { useState } from 'react'
import { MapPin, Phone, Building2, Navigation } from 'lucide-react'

const TERMINALS = [
  {
    id:      'LA',
    city:    'Los Angeles',
    label:   'Terminal Principal',
    address: '614 E. 7th San Pedro St, Los Angeles, CA',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'terminal',
    region:  'ca',
    mapQ:    '614+E+7th+St+Los+Angeles+CA',
  },
  {
    id:      'HP',
    city:    'Huntington Park',
    label:   'Oficina',
    address: '2414 E. Florence Ave, Huntington Park, CA',
    phone:   '(323) 588-9188',
    tel:     '+13235889188',
    type:    'office',
    region:  'ca',
    mapQ:    '2414+E+Florence+Ave+Huntington+Park+CA',
  },
  {
    id:      'SYS',
    city:    'San Ysidro',
    label:   'Terminal',
    address: '710 E. San Ysidro Blvd. #C, San Ysidro, CA',
    phone:   '(619) 428-5512',
    tel:     '+16194285512',
    type:    'terminal',
    region:  'ca',
    mapQ:    '710+E+San+Ysidro+Blvd+San+Ysidro+CA',
  },
  {
    id:      'BAK',
    city:    'Bakersfield',
    label:   'Parada',
    address: 'Bakersfield, CA',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'stop',
    region:  'ca',
    mapQ:    'Bakersfield+CA',
  },
  {
    id:      'FRE',
    city:    'Fresno',
    label:   'Parada',
    address: 'Fresno, CA',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'stop',
    region:  'ca',
    mapQ:    'Fresno+CA',
  },
  {
    id:      'SAC',
    city:    'Sacramento',
    label:   'Parada',
    address: 'Sacramento, CA',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'stop',
    region:  'ca',
    mapQ:    'Sacramento+CA',
  },
  {
    id:      'OTY',
    city:    'Garita de Otay',
    label:   'Terminal Tijuana',
    address: '2493 Roll Dr. Local 201, Plaza Mayor, Tijuana, B.C.',
    phone:   '(664) 208-8399',
    tel:     '+526642088399',
    type:    'terminal',
    region:  'mx',
    mapQ:    'Garita+Otay+Tijuana+BC+Mexico',
  },
  {
    id:      'TIJ',
    city:    'Aeropuerto Tijuana',
    label:   'Terminal Aeropuerto',
    address: 'Aeropuerto Internacional Abelardo L. Rodríguez, Tijuana, B.C.',
    phone:   '(664) 208-8399',
    tel:     '+526642088399',
    type:    'terminal',
    region:  'mx',
    mapQ:    'Aeropuerto+Internacional+Tijuana+BC',
  },
  {
    id:      'STJ',
    city:    'Sentri — Línea Tijuana',
    label:   'Parada frontera',
    address: 'Rampa Xicotencatl 229-1, Puente Frontera, Col. Libertad, Tijuana, B.C.',
    phone:   '(664) 208-8399',
    tel:     '+526642088399',
    type:    'stop',
    region:  'mx',
    mapQ:    'Xicotencatl+229+Tijuana+BC+Mexico',
  },
  {
    id:      'PHX',
    city:    'Phoenix',
    label:   'Parada',
    address: 'Phoenix, AZ',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'stop',
    region:  'other',
    mapQ:    'Phoenix+AZ',
  },
  {
    id:      'TUC',
    city:    'Tucson',
    label:   'Parada',
    address: 'Tucson, AZ',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'stop',
    region:  'other',
    mapQ:    'Tucson+AZ',
  },
  {
    id:      'EPT',
    city:    'El Paso, Texas',
    label:   'Parada',
    address: 'El Paso, TX',
    phone:   '(213) 624-5524',
    tel:     '+12136245524',
    type:    'stop',
    region:  'other',
    mapQ:    'El+Paso+TX',
  },
]

const TYPE_STYLES = {
  terminal: { bg: 'bg-[#c01515]',  text: 'text-white',     icon: 'bg-[#c01515]'  },
  office:   { bg: 'bg-[#0f2c5c]',  text: 'text-white',     icon: 'bg-[#0f2c5c]'  },
  stop:     { bg: 'bg-slate-200',   text: 'text-slate-600', icon: 'bg-slate-400'  },
}

const REGIONS = [
  { key: 'ca',    label: 'California',       color: 'bg-[#0f2c5c]' },
  { key: 'mx',    label: 'Tijuana · México',  color: 'bg-[#c01515]' },
  { key: 'other', label: 'Arizona · Texas',   color: 'bg-slate-500' },
]

export function TerminalsSection() {
  const [selected, setSelected] = useState(TERMINALS[0])

  return (
    <section id="terminales" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 mb-4">
            <MapPin className="w-3 h-3 text-[#c01515]" />
            <span className="text-[#c01515] text-xs font-bold tracking-wider uppercase">Dónde encontrarnos</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-[#0f2c5c] tracking-tight">
            Terminales y paradas
          </h2>
          <p className="text-slate-500 text-base mt-3 max-w-xl mx-auto">
            Tenemos terminales, oficinas y puntos de abordaje en California, Tijuana y el suroeste de EE.UU.
          </p>
        </div>

        {/* Full-width map */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-10" style={{ height: '360px' }}>
          <iframe
            key={selected.id}
            src={`https://maps.google.com/maps?q=${selected.mapQ}&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={selected.city}
          />
        </div>

        {/* All terminals by region — grid layout */}
        {REGIONS.map(region => {
          const locations = TERMINALS.filter(t => t.region === region.key)
          return (
            <div key={region.key} className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-slate-200" />
                <div className={`${region.color} text-white text-xs font-bold px-4 py-1.5 rounded-full`}>
                  {region.label}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {locations.map(t => {
                  const ts = TYPE_STYLES[t.type as keyof typeof TYPE_STYLES]
                  const isActive = selected.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelected(t)
                        document.getElementById('terminales')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`w-full text-left flex flex-col gap-3 p-4 rounded-2xl border transition-all group ${
                        isActive
                          ? 'bg-red-50 border-[#c01515] shadow-md'
                          : 'bg-white border-slate-200 hover:border-[#c01515]/40 hover:shadow-md'
                      }`}
                    >
                      {/* Icon + badge */}
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-[#c01515]' : ts.icon
                        }`}>
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-[#c01515] text-white' : `${ts.bg} ${ts.text}`
                        }`}>
                          {t.label}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <p className="font-black text-[#0f2c5c] text-sm leading-tight mb-1">{t.city}</p>
                        <p className="text-slate-400 text-xs leading-relaxed">{t.address}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 mt-auto">
                        {t.type !== 'stop' && (
                          <a
                            href={`tel:${t.tel}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-[#c01515] text-xs font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3 shrink-0" /> {t.phone}
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${t.mapQ}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-slate-400 text-xs hover:text-[#0f2c5c] transition-colors"
                        >
                          <Navigation className="w-3 h-3 shrink-0" /> Cómo llegar
                        </a>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

      </div>
    </section>
  )
}
