'use client'

import { useState } from 'react'
import { Map, Plus, Search, ArrowRight, Clock, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const STOPS_LIST = [
  { code: 'LA',  name: 'Los Angeles — Terminal Central' },
  { code: 'HP',  name: 'Huntington Park' },
  { code: 'LTI', name: 'San Ysidro — LTI Terminal' },
  { code: 'ATI', name: 'San Diego — ATI Terminal' },
  { code: 'CAT', name: 'Otay — CAT Terminal' },
]

const DEMO_ROUTES = [
  { id: '1', code: 'LA-LTI', name: 'Los Angeles → San Ysidro (LTI)', origin: 'LA', destination: 'LTI', duration: 150, schedules: 10, is_active: true },
  { id: '2', code: 'LA-ATI', name: 'Los Angeles → San Diego (ATI)',   origin: 'LA', destination: 'ATI', duration: 155, schedules: 10, is_active: true },
  { id: '3', code: 'LA-CAT', name: 'Los Angeles → Otay (CAT)',        origin: 'LA', destination: 'CAT', duration: 160, schedules: 10, is_active: true },
]

export default function RutasPage() {
  const [routes, setRoutes] = useState(DEMO_ROUTES)
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<typeof DEMO_ROUTES[0] | null>(null)

  const [form, setForm] = useState({ code: '', name: '', origin: 'LA', destination: 'LTI', duration: 150 })

  const filtered = routes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditing(null)
    setForm({ code: '', name: '', origin: 'LA', destination: 'LTI', duration: 150 })
    setOpen(true)
  }

  const openEdit = (r: typeof DEMO_ROUTES[0]) => {
    setEditing(r)
    setForm({ code: r.code, name: r.name, origin: r.origin, destination: r.destination, duration: r.duration })
    setOpen(true)
  }

  const save = () => {
    if (editing) {
      setRoutes(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r))
    } else {
      setRoutes(prev => [...prev, { ...form, id: String(Date.now()), schedules: 0, is_active: true }])
    }
    setOpen(false)
  }

  const toggleActive = (id: string) =>
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r))

  const deleteRoute = (id: string) =>
    setRoutes(prev => prev.filter(r => r.id !== id))

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Map className="w-6 h-6 text-[#d97706]" />
            Rutas
          </h1>
          <p className="text-slate-500 text-sm mt-1">{routes.length} rutas configuradas</p>
        </div>
        <Button onClick={openNew} className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Nueva ruta
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ruta..."
          className="pl-10 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ruta</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Duración</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Horarios</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(route => (
                <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{route.code}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">{route.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      <span className="font-semibold text-xs bg-[rgba(240,180,41,0.1)] text-[#d97706] px-2 py-0.5 rounded-lg">{route.destination}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{route.name}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.floor(route.duration / 60)}h {route.duration % 60 > 0 ? `${route.duration % 60}m` : ''}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-slate-600 font-semibold text-xs">{route.schedules} salidas/día</span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleActive(route.id)} className="transition-colors">
                      {route.is_active
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(route)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteRoute(route.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0a1628]">
              {editing ? 'Editar ruta' : 'Nueva ruta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código</Label>
                <Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))}
                  placeholder="LA-LTI" className="mt-1.5 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20 uppercase" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duración (min)</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(p => ({...p, duration: Number(e.target.value)}))}
                  className="mt-1.5 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</Label>
              <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                placeholder="Los Angeles → San Ysidro" className="mt-1.5 rounded-xl border-slate-200 focus:border-[#f0b429] focus:ring-[#f0b429]/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Origen</Label>
                <select value={form.origin} onChange={e => setForm(p => ({...p, origin: e.target.value}))}
                  className="w-full mt-1.5 appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f0b429]/30 focus:border-[#f0b429]">
                  {STOPS_LIST.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name.split('—')[0]}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destino</Label>
                <select value={form.destination} onChange={e => setForm(p => ({...p, destination: e.target.value}))}
                  className="w-full mt-1.5 appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f0b429]/30 focus:border-[#f0b429]">
                  {STOPS_LIST.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name.split('—')[0]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={save} className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold rounded-xl">
                {editing ? 'Guardar cambios' : 'Crear ruta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
