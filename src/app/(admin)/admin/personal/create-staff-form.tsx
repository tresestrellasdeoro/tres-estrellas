'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function CreateStaffForm() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || password.length < 8) {
      setError('Completa todos los campos. Contraseña mínimo 8 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'cajero' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al crear usuario'); return }
      setSuccess(`Usuario "${name}" creado correctamente.`)
      setName(''); setEmail(''); setPassword('')
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre completo</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="María López"
          className="mt-1.5 rounded-xl border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20" />
      </div>
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cajero@empresa.com"
          className="mt-1.5 rounded-xl border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20" />
      </div>
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</Label>
        <div className="relative mt-1.5">
          <Input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="rounded-xl border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20 pr-10"
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <Button type="submit" disabled={loading}
        className="w-full bg-[#c01515] hover:bg-[#a01010] text-white font-black rounded-xl">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear usuario'}
      </Button>
    </form>
  )
}
