'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, Lock, Bell, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  userId: string
  defaultName: string
  defaultEmail: string
  defaultPhone: string
}

export default function PerfilForm({ userId, defaultName, defaultEmail, defaultPhone }: Props) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)

  const [name, setName]       = useState(defaultName)
  const [phone, setPhone]     = useState(defaultPhone)
  const [password, setPassword] = useState('')
  const notifications = {
    email_bookings:   true,
    email_promotions: false,
    sms_reminders:    true,
  }

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileUpdate = await (supabase.from('profiles') as any)
        .update({ full_name: name.trim(), phone: phone.trim() || null })
        .eq('id', userId)

      if (profileUpdate.error) {
        setError('Error al guardar el perfil. Intenta de nuevo.')
        return
      }

      if (password.length > 0) {
        if (password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres.')
          return
        }
        const passUpdate = await supabase.auth.updateUser({ password })
        if (passUpdate.error) {
          setError('Error al cambiar la contraseña: ' + passUpdate.error.message)
          return
        }
        setPassword('')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <>
      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f0b429] to-[#d97706] flex items-center justify-center text-[#0a1628] font-black text-3xl shadow-lg">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{name}</h2>
            <p className="text-slate-400 text-sm">{defaultEmail}</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-[#d97706]" />
          Información personal
        </h2>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre completo</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              className="mt-1.5 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo electrónico</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={defaultEmail} readOnly type="email"
                className="pl-10 rounded-xl border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <p className="text-slate-400 text-xs mt-1">El correo no se puede cambiar desde aquí.</p>
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</Label>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                className="pl-10 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#d97706]" />
          Cambiar contraseña
        </h2>
        <div>
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nueva contraseña</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={password} onChange={e => setPassword(e.target.value)}
              type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
              className="pl-10 pr-10 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20" />
            <button onClick={() => setShowPass(!showPass)} type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-slate-400 text-xs mt-1">Deja en blanco para no cambiar la contraseña.</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm opacity-75">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#d97706]" />
            Notificaciones
          </h2>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">Próximamente</span>
        </div>
        <div className="space-y-4">
          {[
            { key: 'email_bookings',   label: 'Confirmaciones de reservación', desc: 'Recibe tu boleto por correo al comprar' },
            { key: 'email_promotions', label: 'Promociones y ofertas',          desc: 'Descuentos exclusivos para miembros' },
            { key: 'sms_reminders',    label: 'Recordatorios por SMS',          desc: '2 horas antes de cada viaje' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-slate-700 text-sm">{n.label}</p>
                <p className="text-slate-400 text-xs mt-0.5">{n.desc}</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative cursor-not-allowed ${notifications[n.key as keyof typeof notifications] ? 'bg-[#f0b429]/50' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${notifications[n.key as keyof typeof notifications] ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-4 border-t border-slate-100 pt-3">
          La gestión de preferencias de notificación estará disponible en una próxima actualización.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-4 text-sm text-red-600 font-medium">{error}</p>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={pending}
          className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-black rounded-xl px-8 h-11">
          {pending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Guardando...
            </span>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Guardar cambios</>
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Guardado
          </span>
        )}
      </div>
    </>
  )
}
