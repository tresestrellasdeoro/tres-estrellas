'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Store, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Sucursal {
  id: string
  name: string
  code: string
  city: string | null
  address: string | null
  active: boolean
  qb_cash_account_id: string | null
  qb_item_id: string | null
}

const EMPTY: Omit<Sucursal, 'id'> = {
  name: '', code: '', city: '', address: '', active: true,
  qb_cash_account_id: '', qb_item_id: '',
}

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Sucursal | null>(null)
  const [form, setForm]             = useState<Omit<Sucursal, 'id'>>(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [expandedQB, setExpandedQB] = useState<string | null>(null)
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/sucursales')
    const data = await res.json()
    setSucursales(data.sucursales ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  const openEdit = (s: Sucursal) => {
    setEditing(s)
    setForm({ name: s.name, code: s.code, city: s.city ?? '', address: s.address ?? '',
              active: s.active, qb_cash_account_id: s.qb_cash_account_id ?? '',
              qb_item_id: s.qb_item_id ?? '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        qb_cash_account_id: form.qb_cash_account_id || null,
        qb_item_id: form.qb_item_id || null,
        ...(editing ? { id: editing.id } : {}),
      }
      const res = await fetch('/api/admin/sucursales', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setToast({ type: 'success', msg: editing ? 'Sucursal actualizada' : 'Sucursal creada' })
      setModalOpen(false)
      load()
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la sucursal "${name}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch('/api/admin/sucursales', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setToast({ type: 'success', msg: 'Sucursal eliminada' })
      load()
    } else {
      setToast({ type: 'error', msg: 'Error al eliminar' })
    }
  }

  const qbComplete = (s: Sucursal) => !!(s.qb_cash_account_id && s.qb_item_id)

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Sucursales</h1>
          <p className="text-slate-400 text-sm mt-1">Puntos de venta y configuración QuickBooks por sucursal</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0a1e42] hover:bg-[#0d2654] text-white font-bold rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Nueva sucursal
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando sucursales...</div>
        ) : sucursales.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay sucursales registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Sucursal</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Ciudad</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">QB</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sucursales.map(s => (
                <>
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0a1e42]/8 flex items-center justify-center shrink-0">
                        <Store className="w-3.5 h-3.5 text-[#0a1e42]" />
                      </div>
                      {s.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{s.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedQB(expandedQB === s.id ? null : s.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          qbComplete(s)
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {qbComplete(s) ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {qbComplete(s) ? 'Configurado' : 'Pendiente'}
                        {expandedQB === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {s.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-[#0a1e42] hover:bg-slate-100 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedQB === s.id && (
                    <tr key={`${s.id}-qb`} className="bg-slate-50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="text-xs space-y-1 text-slate-500">
                          <div><span className="font-semibold text-slate-600">QB Cash Account ID:</span> {s.qb_cash_account_id || <span className="text-amber-600 italic">No configurado</span>}</div>
                          <div><span className="font-semibold text-slate-600">QB Item ID:</span> {s.qb_item_id || <span className="text-amber-600 italic">No configurado</span>}</div>
                          <p className="text-slate-400 mt-1">
                            Estos IDs se obtienen desde QuickBooks una vez conectado. El Cash Account ID es el de la cuenta "Cash on hand" de esta sucursal. El Item ID es el ítem de ventas de boletos de esta sucursal.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-black text-slate-800 mb-5">
              {editing ? 'Editar sucursal' : 'Nueva sucursal'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nombre *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Huntington Park" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Código *</label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="HP" className="rounded-xl font-mono" maxLength={10} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ciudad</label>
                <Input value={form.city ?? ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Huntington Park, CA" className="rounded-xl" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dirección</label>
                <Input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="6901 Pacific Blvd" className="rounded-xl" />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">QuickBooks IDs</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Cash Account ID <span className="font-normal text-slate-400">(cuenta "Cash on hand" en QB)</span></label>
                    <Input value={form.qb_cash_account_id ?? ''} onChange={e => setForm(f => ({ ...f, qb_cash_account_id: e.target.value }))}
                      placeholder="Ej: 123" className="rounded-xl font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Item ID <span className="font-normal text-slate-400">(ítem de ventas de boletos en QB)</span></label>
                    <Input value={form.qb_item_id ?? ''} onChange={e => setForm(f => ({ ...f, qb_item_id: e.target.value }))}
                      placeholder="Ej: 456" className="rounded-xl font-mono text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="active" checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="active" className="text-sm text-slate-600 font-medium">Sucursal activa</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border-slate-200">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.code}
                className="flex-1 bg-[#0a1e42] hover:bg-[#0d2654] text-white font-bold rounded-xl">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
