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
  terminal: { bg: 'bg-[#c01515]', text: 'text-white',     label: 'Terminal' },
  office:   { bg: 'bg-[#0f2c5c]', text: 'text-white',     label: 'Oficina'  },
  stop:     { bg: 'bg-slate-200',  text: 'text-slate-600', label: 'Parada'   },
}

const REGIONS = [
  { key: 'ca',    label: 'California',       color: 'bg-[#0f2c5c]' },
  { key: 'mx',    label: 'Tijuana · México',  color: 'bg-[#c01515]' },
  { key: 'other', label: 'Arizona · Texas',   color: 'bg-slate-600' },
]

export function TerminalsSection() {
  const [selected, setSelected] = useState(TERMINALS[0])

  return (
    <section id="terminales" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
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

        {/* Map + main terminals */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Embedded map — updates on selection */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-72 lg:h-auto">
            <iframe
              key={selected.id}
              src={`https://maps.google.com/maps?q=${selected.mapQ}&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '280px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={selected.city}
            />
          </div>

          {/* Main terminals — clickable to update map */}
          <div className="space-y-3">
            {TERMINALS.filter(t => t.type === 'terminal').map(t => {
              const isActive = selected.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left flex items-start gap-4 rounded-2xl p-4 border transition-all group ${
                    isActive
                      ? 'bg-red-50 border-[#c01515] shadow-md'
                      : 'bg-slate-50 border-slate-200 hover:border-[#c01515]/40 hover:shadow-md'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-[#c01515]' : 'bg-slate-200 group-hover:bg-[#c01515]'
                  }`}>
                    <Building2 className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-[#0f2c5c] text-sm">{t.city}</p>
                      <span className="text-[10px] font-bold bg-[#c01515] text-white px-2 py-0.5 rounded-full">{t.label}</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed mb-2">{t.address}</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${t.tel}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[#c01515] text-xs font-semibold hover:underline"
                      >
                        <Phone className="w-3 h-3" /> {t.phone}
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${t.mapQ}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-slate-400 text-xs hover:text-[#0f2c5c] transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> Cómo llegar
                      </a>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* All locations by region */}
        {REGIONS.map(region => {
          const locations = TERMINALS.filter(t => t.region === region.key)
          return (
            <div key={region.key} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-slate-200" />
                <div className={`${region.color} text-white text-xs font-bold px-4 py-1.5 rounded-full`}>
                  {region.label}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all group ${
                        isActive
                          ? 'bg-red-50 border-[#c01515] shadow-md'
                          : 'bg-white border-slate-200 hover:border-[#c01515]/40 hover:shadow-md'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-[#c01515]' : ts.bg}`}>
                        <MapPin className={`w-4 h-4 ${isActive ? 'text-white' : ts.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <p className="font-bold text-slate-800 text-sm">{t.city}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#c01515] text-white' : `${ts.bg} ${ts.text}`}`}>
                            {ts.label}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{t.address}</p>
                        {t.type !== 'stop' && (
                          <p className="text-[#c01515] text-xs font-semibold mt-1">{t.phone}</p>
                        )}
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
