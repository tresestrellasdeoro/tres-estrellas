'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bus, Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const router = useRouter()

  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  const passwordStrength = password.length >= 8 ? (password.match(/[A-Z]/) && password.match(/[0-9]/) ? 'strong' : 'medium') : 'weak'
  const strengthColor    = { weak: 'bg-red-400', medium: 'bg-amber-400', strong: 'bg-emerald-400' }[passwordStrength]
  const strengthWidth    = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' }[passwordStrength]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone } },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a1628] bg-dot-pattern flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="font-display font-black text-2xl text-white mb-2">¡Cuenta creada!</h2>
          <p className="text-white/50 text-sm mb-6">Revisa tu correo para confirmar tu cuenta y empezar a ganar puntos.</p>
          <Link href="/auth/login">
            <Button className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold rounded-xl w-full">
              Ir al login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a1628] bg-dot-pattern flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f0b429]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f0b429] to-[#d97706] flex items-center justify-center shadow-xl">
              <Bus className="w-6 h-6 text-[#0a1628]" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <div className="text-white font-black text-base font-display tracking-tight">Tres Estrellas</div>
              <div className="text-[#f0b429]/60 text-[10px] tracking-widest uppercase">de Oro Inc</div>
            </div>
          </Link>
          <h1 className="font-display font-black text-2xl text-white">Crear cuenta</h1>
          <p className="text-white/45 text-sm mt-1">Gratis · Gana puntos desde el primer viaje</p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs font-bold uppercase tracking-wider">Nombre completo</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Juan García" required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20" />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs font-bold uppercase tracking-wider">Correo electrónico</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20" />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs font-bold uppercase tracking-wider">Teléfono (opcional)</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (213) 000-0000"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20" />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs font-bold uppercase tracking-wider">Contraseña</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strengthColor} ${strengthWidth}`} />
                </div>
              )}
            </div>

            <div>
              <Label className="text-white/60 text-xs font-bold uppercase tracking-wider">Confirmar contraseña</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" required
                  className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20 ${confirm && confirm !== password ? 'border-red-500/50' : ''}`} />
              </div>
            </div>

            <p className="text-white/30 text-xs">
              Al registrarte aceptas nuestros{' '}
              <Link href="/terminos" className="text-[#f0b429]/60 hover:text-[#f0b429]">Términos de servicio</Link>
              {' '}y{' '}
              <Link href="/privacidad" className="text-[#f0b429]/60 hover:text-[#f0b429]">Política de privacidad</Link>.
            </p>

            <Button type="submit" disabled={loading} className="w-full bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-black rounded-xl h-11 text-sm">
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/35 text-sm mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-[#f0b429] font-semibold hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
