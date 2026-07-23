'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function LoginForm() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const nextPath      = searchParams.get('next') || ''
  const urlError      = searchParams.get('error')
  const adminFormRef  = useRef<HTMLFormElement>(null)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(urlError ? 'Correo o contraseña incorrectos.' : '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Try Supabase auth first (cajeros, buseros, customers)
      // Race with 8-second timeout so it never hangs indefinitely
      const supabase = createClient()
      const timeout = new Promise<{ data: { user: null }, error: Error }>(resolve =>
        setTimeout(() => resolve({ data: { user: null }, error: new Error('timeout') }), 8000)
      )
      const { data } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])

      if (data?.user) {
        // Get role via server API (bypasses RLS, guaranteed to read correct role)
        const res = await fetch('/api/auth/me')
        const json = await res.json()
        const role = json?.role

        if (role === 'cajero' || role === 'driver') {
          router.push('/personal/validar')
        } else if (role === 'admin' || role === 'super_admin') {
          router.push('/admin/dashboard')
        } else if (role === 'developer') {
          router.push('/developer/dashboard')
        } else {
          router.push(nextPath || '/dashboard')
        }
        return
      }
    } catch {
      // Supabase unavailable — fall through to admin login below
    }

    // 2. Fallback to admin env-var login (native form POST so cookie is set properly)
    adminFormRef.current?.submit()
    // Don't setLoading(false) here — page will navigate away if admin login succeeds
    // But reset after 10s in case the form redirect comes back with an error
    setTimeout(() => setLoading(false), 10_000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1e42] to-[#0f2c5c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

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
        <p className="text-center text-white/45 text-sm mb-6">Viajeros, personal y administración</p>

        <div className="bg-white/8 border border-white/12 backdrop-blur-sm rounded-2xl p-6">

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-white/6 border border-white/12 text-white placeholder:text-white/25 rounded-xl focus:outline-none focus:border-[#c8a951]/50 text-sm"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c01515] hover:bg-[#a01010] disabled:opacity-50 text-white font-black rounded-xl h-11 text-sm transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Iniciando...
                </>
              ) : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-white/45 text-sm">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/registro" className="text-[#c8a951] font-bold hover:text-[#e0b95c] transition-colors">
              Crear cuenta
            </Link>
          </p>
          <Link href="/" className="text-white/25 text-xs hover:text-white/50 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>

      {/* Hidden native form for admin cookie login fallback */}
      <form ref={adminFormRef} method="POST" action="/api/auth/admin-login" style={{ display: 'none' }}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />
      </form>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
