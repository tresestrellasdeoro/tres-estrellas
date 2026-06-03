import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, AlertCircle } from 'lucide-react'

async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const cookieStore = await cookies()
  const session     = cookieStore.get('admin_session')
  const { error }   = await searchParams

  if (session?.value) redirect('/admin/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1e42] to-[#0f2c5c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-2xl shadow-black/40 inline-block">
              <Image
                src="/logo.png"
                alt="Tres Estrellas de Oro"
                width={160}
                height={108}
                className="h-24 w-auto object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        <h1 className="text-center font-black text-2xl text-white mb-1">Iniciar sesión</h1>
        <p className="text-center text-white/45 text-sm mb-6">Panel de administración</p>

        <div className="bg-white/8 border border-white/12 backdrop-blur-sm rounded-2xl p-6">

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">Correo o contraseña incorrectos.</p>
            </div>
          )}

          <form method="POST" action="/api/auth/admin-login" className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  name="email"
                  placeholder="tu@correo.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/6 border border-white/12 text-white placeholder:text-white/25 rounded-xl focus:outline-none focus:border-[#c8a951]/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/6 border border-white/12 text-white placeholder:text-white/25 rounded-xl focus:outline-none focus:border-[#c8a951]/50 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#c01515] hover:bg-[#a01010] text-white font-black rounded-xl h-11 text-sm transition-colors mt-2"
            >
              Iniciar sesión
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-white/25 text-xs hover:text-white/50 transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function Page(props: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense>
      <LoginPage {...props} />
    </Suspense>
  )
}
