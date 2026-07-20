'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const DEPARTAMENTOS = [
  'Contabilidad', 'Coordinación', 'Equipaje', 'Flota',
  'Gerencia', 'Sistemas', 'Ventas', 'Webmaster',
]

const ROLES = [
  { value: 'cajero',      label: 'Cajero',      desc: 'Acceso según permisos asignados' },
  { value: 'admin',       label: 'Administrador', desc: 'Acceso completo al panel admin' },
  { value: 'super_admin', label: 'Super Admin',  desc: 'Control total del sistema' },
]

const PERMISOS = [
  { value: 'ventas',    label: 'Ventas',            desc: 'Venta de boletos y reservaciones' },
  { value: 'checkin',   label: 'Check-in',           desc: 'Validar y registrar pasajeros' },
  { value: 'reportes',  label: 'Reportes',           desc: 'Ver reportes y estadísticas' },
  { value: 'paquetes',  label: 'Paquetes / Envíos',  desc: 'Gestión de envíos y paquetes' },
  { value: 'clientes',  label: 'Clientes',           desc: 'Ver y gestionar clientes' },
  { value: 'personal',  label: 'Personal',           desc: 'Gestión de usuarios del sistema' },
  { value: 'all',       label: 'Acceso total',       desc: 'Todos los permisos anteriores' },
]

interface Sucursal { id: string; name: string; code: string }

interface Props { sucursales: Sucursal[] }

export function CreateStaffForm({ sucursales }: Props) {
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [role,        setRole]        = useState('cajero')
  const [sucursalId,  setSucursalId]  = useState('')
  const [depto,       setDepto]       = useState('')
  const [permisos,    setPermisos]    = useState<string[]>([])
  const [showPwd,     setShowPwd]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState('')
  const [error,       setError]       = useState('')
  const router = useRouter()

  const togglePermiso = (val: string) => {
    if (val === 'all') {
      setPermisos(prev => prev.includes('all') ? [] : ['all'])
      return
    }
    setPermisos(prev =>
      prev.includes(val)
        ? prev.filter(p => p !== val && p !== 'all')
        : [...prev.filter(p => p !== 'all'), val]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || password.length < 8) {
      setError('Completa todos los campos. Contraseña mínimo 8 caracteres.')
      return
    }
    if (role === 'cajero' && !sucursalId) {
      setError('Los cajeros deben tener una sucursal asignada.')
      return
    }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, password, role,
          sucursal_id:  sucursalId  || null,
          departamento: depto       || null,
          permisos,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al crear usuario'); return }
      setSuccess(`Usuario "${name}" creado correctamente.`)
      setName(''); setEmail(''); setPassword(''); setSucursalId('')
      setDepto(''); setPermisos([])
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const effectivePermisos = permisos.includes('all')
    ? PERMISOS.map(p => p.value)
    : permisos

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Nombre */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre completo *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="María López"
          className="mt-1.5 rounded-xl border-slate-200" />
      </div>

      {/* Correo */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo *</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cajero@empresa.com"
          className="mt-1.5 rounded-xl border-slate-200" />
      </div>

      {/* Contraseña */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña *</Label>
        <div className="relative mt-1.5">
          <Input type={showPwd ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
            className="rounded-xl border-slate-200 pr-10" />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sucursal */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Sucursal {role === 'cajero' && <span className="text-[#c01515]">*</span>}
        </Label>
        <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}
          className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] ${
            role === 'cajero' && !sucursalId ? 'border-amber-300' : 'border-slate-200'
          }`}>
          <option value="">{role === 'cajero' ? '— Selecciona una sucursal —' : '— Sin sucursal (opcional) —'}</option>
          {sucursales.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
          ))}
        </select>
        {role === 'cajero' && !sucursalId && (
          <p className="text-amber-600 text-xs mt-1 font-semibold">Requerido para cajeros — define en qué sucursal trabaja</p>
        )}
      </div>

      {/* Departamento */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</Label>
        <select value={depto} onChange={e => setDepto(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]">
          <option value="">— Selecciona departamento —</option>
          {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Rol */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Rol del sistema</Label>
        <div className="space-y-2">
          {ROLES.map(r => (
            <label key={r.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                role === r.value
                  ? 'border-[#c01515] bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
              <input type="radio" name="role" value={r.value} checked={role === r.value}
                onChange={() => setRole(r.value)} className="accent-[#c01515]" />
              <div>
                <p className="text-sm font-bold text-slate-700">{r.label}</p>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Permisos */}
      <div>
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Permisos de acceso</Label>
        <div className="space-y-2">
          {PERMISOS.map(p => {
            const checked = permisos.includes(p.value) || (p.value !== 'all' && permisos.includes('all'))
            return (
              <label key={p.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? 'border-[#0a1e42] bg-[#0a1e42]/5'
                    : 'border-slate-200 hover:border-slate-300'
                } ${p.value === 'all' ? 'border-dashed' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => togglePermiso(p.value)}
                  className="accent-[#0a1e42] rounded" />
                <div>
                  <p className="text-sm font-bold text-slate-700">{p.label}</p>
                  <p className="text-xs text-slate-400">{p.desc}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {error   && <p className="text-red-600 text-xs font-semibold">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      <Button type="submit"
        disabled={loading || !name || !email || password.length < 8 || (role === 'cajero' && !sucursalId)}
        className="w-full bg-[#c01515] hover:bg-[#a01010] text-white font-black rounded-xl">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear usuario'}
      </Button>
    </form>
  )
}
