import { Suspense } from 'react'
import { BookingFlow } from './booking-flow'

export const metadata = { title: 'Completar compra' }

export default function ComprarPage({ params }: { params: { tripId: string } }) {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <Suspense fallback={<div className="p-10 text-center text-slate-400">Cargando...</div>}>
        <BookingFlow tripId={params.tripId} />
      </Suspense>
    </div>
  )
}
