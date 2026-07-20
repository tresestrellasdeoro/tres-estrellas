'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, Loader2, AlertTriangle } from 'lucide-react'

export function CancelBookingButton({ bookingId, bookingNumber }: { bookingId: string; bookingNumber: string }) {
  const [step,    setStep]    = useState<'idle' | 'confirm' | 'loading'>('idle')
  const [error,   setError]   = useState('')
  const router = useRouter()

  const handleCancel = async () => {
    setStep('loading')
    setError('')
    const res  = await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al cancelar')
      setStep('confirm')
      return
    }
    router.refresh()
    setStep('idle')
  }

  if (step === 'idle') {
    return (
      <button onClick={() => setStep('confirm')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">
        <XCircle className="w-3.5 h-3.5" />
        Cancelar boleto
      </button>
    )
  }

  if (step === 'loading') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Cancelando...
      </span>
    )
  }

  // confirm
  return (
    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-red-700">¿Cancelar reservación {bookingNumber}?</p>
          <p className="text-xs text-red-500 mt-0.5">Si pagaste con tarjeta se procesará el reembolso. Esta acción no se puede deshacer.</p>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleCancel}
          className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">
          Sí, cancelar
        </button>
        <button onClick={() => { setStep('idle'); setError('') }}
          className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">
          No, mantener
        </button>
      </div>
    </div>
  )
}
