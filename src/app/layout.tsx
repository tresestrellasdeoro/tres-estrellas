import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const SITE_URL = 'https://tresestrellasdeoroinc.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tres Estrellas de Oro | Autobús LA → Tijuana',
    template: '%s | Tres Estrellas de Oro',
  },
  description: 'Viaja cómodo de Los Angeles a Tijuana. Boletos en línea, 12 salidas diarias, programa de lealtad y puntos en cada viaje.',
  keywords: ['autobús Los Angeles Tijuana', 'bus LA TJ', 'Tres Estrellas de Oro', 'boletos autobús'],
  openGraph: {
    type:        'website',
    locale:      'es_MX',
    url:         SITE_URL,
    siteName:    'Tres Estrellas de Oro',
    title:       'Tres Estrellas de Oro | Autobús LA → Tijuana',
    description: 'Viaja cómodo de Los Angeles a Tijuana. Boletos en línea, 12 salidas diarias, programa de lealtad y puntos en cada viaje.',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Tres Estrellas de Oro | Autobús LA → Tijuana',
    description: 'Viaja cómodo de Los Angeles a Tijuana. Boletos en línea, 12 salidas diarias.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
