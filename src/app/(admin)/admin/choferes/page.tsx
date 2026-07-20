'use client'

import { useState, useEffect } from 'react'
import { UserCheck, Plus, Pencil, Trash2, Loader2, Phone, CreditCard, CheckCircle2, XCircle } from 'lucide-react'

interface Driver {
  id:        string
  name:      string
  phone:     string | null
  license:   string | null
  notes:     string | null
  is_active: boolean
  created_at: string
}

const EMPTY = { name: '', phone: '', license: '', notes: '', is_active: true }

export default function ChoferesPage() {
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error,    setError]    = useState('')

  const fetchDrivers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/drivers')
    const d   = await res.json()
    setDrivers(d.drivers ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchDrivers() }, [])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setShowForm(true)
  }

  const openEdit = (dr: Driver) => {
    setEditing(dr.id)
    setForm({ name: dr.name, phone: dr.phone ?? '', license: dr.license ?? '', notes: dr.notes ?? '', is_active: dr.is_active })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    const method = editing ? 'PATCH' : 'POST'
    const body   = editing ? { id: editing, ...form } : form
    const res    = await fetch('/api/admin/drivers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data   = await res.json()
    if (!res.ok) { setError(data.error || 'Error al guardar'); setSaving(false); return }
    setShowForm(false)
    fetchDrivers()
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar chofer "${name}"? Esta acción no se puede deshacer.`)) return
    await fetch('/api/admin/drivers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchDrivers()
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#c01515]" />
            Choferes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Conductores asignados a corridas</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Nuevo chofer
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-black text-lg text-[#0a1628]">{editing ? 'Editar chofer' : 'Nuevo chofer'}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(xxx) xxx-xxxx"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nº Licencia</label>
                  <input value={form.license} onChange={e => setForm(f => ({ ...f, license: e.target.value }))}
                    placeholder="A1234567"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Información adicional..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c01515]/20 focus:border-[#c01515] bg-slate-50 resize-none" />
              </div>
              {editing && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded" />
                  <span className="text-sm font-semibold text-slate-600">Activo</span>
                </label>
              )}
            </div>

            {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing ? 'Guardar cambios' : 'Crear chofer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay choferes registrados</p>
          <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Licencia</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map(dr => (
                <tr key={dr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{dr.name}</p>
                    {dr.notes && <p className="text-xs text-slate-400 mt-0.5">{dr.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {dr.phone
                      ? <span className="flex items-center gap-1 text-slate-600 text-xs"><Phone className="w-3 h-3" />{dr.phone}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {dr.license
                      ? <span className="flex items-center gap-1 text-slate-600 text-xs font-mono"><CreditCard className="w-3 h-3" />{dr.license}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {dr.is_active
                      ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />Activo</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Inactivo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(dr)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(dr.id, dr.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
