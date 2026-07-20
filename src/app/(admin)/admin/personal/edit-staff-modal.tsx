'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, X } from 'lucide-react'

const DEPARTAMENTOS = [
  'Contabilidad', 'Coordinación', 'Equipaje', 'Flota',
  'Gerencia', 'Sistemas', 'Ventas', 'Webmaster',
]
const ROLES = [
  { value: 'cajero',      label: 'Cajero',         desc: 'Acceso según permisos asignados' },
  { value: 'admin',       label: 'Administrador',   desc: 'Acceso completo al panel admin' },
  { value: 'super_admin', label: 'Super Admin',     desc: 'Control total del sistema' },
]
const PERMISOS = [
  { value: 'ventas',    label: 'Ventas',           desc: 'Venta de boletos y reservaciones' },
  { value: 'checkin',   label: 'Check-in',          desc: 'Validar y registrar pasajeros' },
  { value: 'reportes',  label: 'Reportes',          desc: 'Ver reportes y estadísticas' },
  { value: 'paquetes',  label: 'Paquetes / Envíos', desc: 'Gestión de envíos y paquetes' },
  { value: 'clientes',  label: 'Clientes',          desc: 'Ver y gestionar clientes' },
  { value: 'personal',  label: 'Personal',          desc: 'Gestión de usuarios del sistema' },
  { value: 'all',       label: 'Acceso total',      desc: 'Todos los permisos anteriores' },
]

interface Sucursal { id: string; name: string; code: string }
interface StaffUser {
  id: string; full_name: string; email: string
  role: string; sucursal_id: string | null
  departamento: string | null; permisos: string[]
}

export function EditStaffButton({ user, sucursales }: { user: StaffUser; sucursales: Sucursal[] }) {
  const [open,       setOpen]       = useState(false)
  const [role,       setRole]       = useState(user.role)
  const [sucursalId, setSucursalId] = useState(user.sucursal_id ?? '')
  const [depto,      setDepto]      = useState(user.departamento ?? '')
  const [permisos,   setPermisos]   = useState<string[]>(user.permisos ?? [])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
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

  const handleSave = async () => {
    if (role === 'cajero' && !sucursalId) {
      setError('Los cajeros deben tener una sucursal asignada.')
      return
    }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/update-staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:      user.id,
        role,
        sucursal_id:  sucursalId  || null,
        departamento: depto       || null,
        permisos,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al guardar'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        title={`Editar a ${user.full_name}`}
        className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
        <Pencil className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Editar usuario</h2>
                <p className="text-slate-400 text-sm">{user.full_name} · {user.email}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sucursal */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Sucursal {role === 'cajero' && <span className="text-[#c01515]">*</span>}
              </label>
              <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]">
                <option value="">{role === 'cajero' ? '— Selecciona una sucursal —' : '— Sin sucursal —'}</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* Departamento */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Departamento</label>
              <select value={depto} onChange={e => setDepto(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515]">
                <option value="">— Sin departamento —</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Rol */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Rol del sistema</label>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <label key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      role === r.value ? 'border-[#c01515] bg-red-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <input type="radio" name={`role-${user.id}`} value={r.value} checked={role === r.value}
                      onChange={() => setRole(r.value)} className="accent-[#c01515]" />
                    <div>
                      <p className="text-sm font-bold text-slate-700">{r.label}</p>
                      <p className="text-xs text-slate-400">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Permisos (solo relevantes para cajeros) */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Permisos de acceso</label>
              {role !== 'cajero' && (
                <p className="text-xs text-slate-400 mb-2">Los admins tienen acceso total automáticamente.</p>
              )}
              <div className="space-y-2">
                {PERMISOS.map(p => {
                  const checked = permisos.includes(p.value) || (p.value !== 'all' && permisos.includes('all'))
                  return (
                    <label key={p.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        checked ? 'border-[#0a1e42] bg-[#0a1e42]/5' : 'border-slate-200 hover:border-slate-300'
                      } ${p.value === 'all' ? 'border-dashed' : ''} ${role !== 'cajero' ? 'opacity-40 pointer-events-none' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => togglePermiso(p.value)}
                        disabled={role !== 'cajero'} className="accent-[#0a1e42] rounded" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">{p.label}</p>
                        <p className="text-xs text-slate-400">{p.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
