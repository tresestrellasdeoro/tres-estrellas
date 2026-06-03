import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Tres Estrellas de Oro | Autobús LA – San Diego',
    template: '%s | Tres Estrellas de Oro',
  },
  description: 'Viaja cómodo de Los Angeles a San Diego. Boletos en línea, 10 salidas diarias, programa de lealtad y puntos en cada viaje.',
  keywords: ['autobús Los Angeles San Diego', 'bus LA SD', 'Tres Estrellas de Oro', 'boletos autobús'],
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Tres Estrellas de Oro',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
