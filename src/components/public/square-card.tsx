'use client'

import { useRef, useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import Script from 'next/script'

export interface SquareCardHandle {
  tokenize: () => Promise<string>
}

const LOAD_TIMEOUT_MS = 15_000

export const SquareCard = forwardRef<SquareCardHandle, { onReady?: () => void }>(function SquareCard({ onReady }, ref) {
  const cardRef              = useRef<any>(null)
  const [ready, setReady]   = useState(false)
  const [error, setError]   = useState('')

  // Timeout: si después de 15s el formulario no cargó, mostrar error
  useEffect(() => {
    const t = setTimeout(() => {
      if (!cardRef.current) {
        setError('No se pudo cargar el formulario de tarjeta. Verifica tu conexión y recarga la página.')
      }
    }, LOAD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [])

  const initSquare = async () => {
    const Square = (window as any).Square
    if (!Square) return
    try {
      const payments = Square.payments(
        process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!,
      )
      const card = await payments.card({
        style: {
          input: {
            fontSize: '14px',
            fontFamily: 'inherit',
            color: '#1e293b',
          },
          '.input-container': {
            borderColor: '#e2e8f0',
            borderRadius: '12px',
          },
          '.input-container.is-focus': {
            borderColor: '#c01515',
          },
          '.input-container.is-error': {
            borderColor: '#ef4444',
          },
        },
      })
      await card.attach('#sq-card-container')
      cardRef.current = card
      setReady(true)
      onReady?.()
    } catch {
      setError('No se pudo cargar el formulario de tarjeta. Recarga la página.')
    }
  }

  useImperativeHandle(ref, () => ({
    tokenize: async () => {
      if (!cardRef.current) throw new Error('Formulario de tarjeta no listo')
      const result = await cardRef.current.tokenize()
      if (result.status === 'OK') return result.token as string
      const msg = result.errors?.map((e: any) => e.message).join('. ') || 'Datos de tarjeta inválidos'
      throw new Error(msg)
    },
  }))

  return (
    <>
      <Script
        src="https://web.squarecdn.com/v1/square.js"
        onLoad={initSquare}
        strategy="afterInteractive"
      />
      {!ready && !error && (
        <div className="h-14 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
          <span className="text-slate-400 text-xs">Cargando formulario seguro...</span>
        </div>
      )}
      <div id="sq-card-container" className={ready ? '' : 'hidden'} />
      {error && (
        <p className="text-red-600 text-sm mt-2">⚠️ {error}</p>
      )}
    </>
  )
})
