import { Suspense } from 'react'
import { SearchForm } from './search-form'
import { TripResults } from './trip-results'

export const metadata = {
  title: 'Buscar viajes',
  description: 'Encuentra y compra tu boleto de autobús de Los Angeles a San Diego.',
}

export default function BuscarPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">

      {/* Header */}
      <div className="bg-[#0a1628] pt-10 pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
            Buscar viajes
          </h1>
          <p className="text-white/45 text-sm">Selecciona tu viaje ideal</p>
        </div>
        <Suspense>
          <SearchForm />
        </Suspense>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Suspense fallback={<TripResultsSkeleton />}>
          <TripResults />
        </Suspense>
      </div>
    </div>
  )
}

function TripResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton h-28 rounded-2xl" />
      ))}
    </div>
  )
}
