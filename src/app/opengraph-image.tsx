import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const alt         = 'Tres Estrellas de Oro — Autobús Los Angeles · Tijuana'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a1e42 0%, #0f2c5c 60%, #0a1e42 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background circle decoration */}
        <div style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(240,180,41,0.06)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'rgba(192,21,21,0.08)',
          display: 'flex',
        }} />

        {/* Red top bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: '#c01515',
          display: 'flex',
        }} />
        {/* Gold bottom bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: '#f0b429',
          display: 'flex',
        }} />

        {/* Stars */}
        <div style={{
          fontSize: 56,
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          letterSpacing: 8,
        }}>
          ⭐⭐⭐
        </div>

        {/* Company name */}
        <div style={{
          fontSize: 80,
          fontWeight: 900,
          color: '#f0b429',
          textAlign: 'center',
          lineHeight: 1,
          marginBottom: 12,
          letterSpacing: -2,
          display: 'flex',
        }}>
          Tres Estrellas de Oro
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 40,
          letterSpacing: 3,
          textTransform: 'uppercase',
          display: 'flex',
        }}>
          Transporte de pasajeros
        </div>

        {/* Route pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          background: 'rgba(255,255,255,0.07)',
          border: '2px solid rgba(240,180,41,0.3)',
          borderRadius: 60,
          padding: '18px 48px',
          marginBottom: 40,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#f0b429', fontWeight: 700, fontSize: 30 }}>Los Angeles</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>California, USA</span>
          </div>
          <div style={{
            fontSize: 36,
            color: '#c01515',
            fontWeight: 900,
            display: 'flex',
          }}>
            🚌 →
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#f0b429', fontWeight: 700, fontSize: 30 }}>Tijuana</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>Baja California, MX</span>
          </div>
        </div>

        {/* Features */}
        <div style={{
          display: 'flex',
          gap: 24,
        }}>
          {['12 salidas diarias', 'Boletos en línea', 'Programa de lealtad'].map(f => (
            <div key={f} style={{
              background: '#c01515',
              color: 'white',
              fontSize: 20,
              fontWeight: 700,
              padding: '8px 20px',
              borderRadius: 40,
              display: 'flex',
            }}>
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute',
          bottom: 28,
          fontSize: 20,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: 1,
          display: 'flex',
        }}>
          tresestrellasdeoroinc.com
        </div>
      </div>
    ),
    { ...size }
  )
}
