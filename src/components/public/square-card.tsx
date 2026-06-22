'use client'

import { useRef, useState, forwardRef, useImperativeHandle, useEffect, useId } from 'react'
import Script from 'next/script'

export interface SquareCardHandle {
  tokenize: () => Promise<string>
}

export const SquareCard = forwardRef<SquareCardHandle, { onReady?: () => void }>(function SquareCard({ onReady }, ref) {
  const cardRef            = useRef<any>(null)
  const mountedRef         = useRef(true)
  const [ready, setReady]  = useState(false)
  const [error, setError]  = useState('')
  const uid                = useId().replace(/:/g, '')
  const containerId        = `sq-card-${uid}`

  const initSquare = async () => {
    // Component may have unmounted while awaiting
    if (!mountedRef.current) return
    // Already initialized
    if (cardRef.current) return

    const Square = (window as any).Square
    if (!Square) return

    try {
      const payments = Square.payments(
        process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!,
      )
      const card = await payments.card({
        style: {
          input: { fontSize: '14px', fontFamily: 'inherit', color: '#1e293b' },
          '.input-container':          { borderColor: '#e2e8f0', borderRadius: '12px' },
          '.input-container.is-focus': { borderColor: '#c01515' },
          '.input-container.is-error': { borderColor: '#ef4444' },
        },
      })
      await card.attach(`#${containerId}`)
      if (!mountedRef.current) {
        // Unmounted while attaching — destroy to avoid leak
        card.destroy?.()
        return
      }
      cardRef.current = card
      setReady(true)
      onReady?.()
    } catch (e: any) {
      if (mountedRef.current) {
        setError('No se pudo cargar el formulario de tarjeta. Recarga la página.')
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // If Square SDK is already on the page (script cached), onLoad won't fire
    // so we call initSquare directly here
    if ((window as any).Square) {
      initSquare()
    }

    // Timeout fallback
    const t = setTimeout(() => {
      if (mountedRef.current && !cardRef.current) {
        setError('No se pudo cargar el formulario de tarjeta. Verifica tu conexión.')
      }
    }, 15_000)

    return () => {
      mountedRef.current = false
      clearTimeout(t)
      // Destroy Square card instance on unmount to free the DOM element
      cardRef.current?.destroy?.()
      cardRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {/* Only load the script once globally — if already loaded, onLoad won't fire (handled above) */}
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
      <div id={containerId} className={ready ? '' : 'hidden'} />
      {error && (
        <p className="text-red-600 text-sm mt-2">⚠️ {error}</p>
      )}
    </>
  )
})
