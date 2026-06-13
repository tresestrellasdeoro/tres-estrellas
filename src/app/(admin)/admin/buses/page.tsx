'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bus, Plus, Search, Wifi, Wind, Bath, Usb, Tv2, Pencil,
  ToggleLeft, ToggleRight, Trash2, MapPin, DollarSign, Luggage,
  Clock, Save, X, ChevronDown, Route,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'flota' | 'paradas' | 'rutas' | 'horarios' | 'tarifas' | 'equipaje'

interface BusRow {
  id: string
  plate: string
  model: string
  brand: string
  year: number
  capacity: number
  amenities: string[]
  is_active: boolean
}

interface StopRow {
  id: string
  code: string
  name: string
  city: string
  state: string
  terminal_name: string | null
  sort_order: number
  is_active: boolean
}

interface ScheduleRow {
  id: string
  departure_time: string
  days_of_week: number[]
  is_active: boolean
}

interface RouteRow {
  id: string
  code: string
  name: string
  origin_stop_id: string
  destination_stop_id: string
  duration_minutes: number
  is_active: boolean
  origin_stop: { id: string; code: string; name: string }
  destination_stop: { id: string; code: string; name: string }
  schedules: ScheduleRow[]
}

interface PricingRow {
  id: string
  route_id: string
  terminal_id: string
  passenger_type: 'adult' | 'child' | 'senior'
  ticket_type: 'one_way' | 'round_trip'
  price: number
  route: { code: string; name: string }
  stop: { code: string; name: string }
}

interface LuggageRow {
  id: string
  name: string
  description: string | null
  max_weight_lbs: number
  extra_fee: number
  is_active: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi:            { icon: <Wifi className="w-3.5 h-3.5" />,   label: 'Wi-Fi' },
  ac:              { icon: <Wind className="w-3.5 h-3.5" />,   label: 'A/C' },
  restroom:        { icon: <Bath className="w-3.5 h-3.5" />,   label: 'Baño' },
  usb:             { icon: <Usb className="w-3.5 h-3.5" />,    label: 'USB' },
  entertainment:   { icon: <Tv2 className="w-3.5 h-3.5" />,    label: 'Entretenimiento' },
  reclining_seats: { icon: <span className="text-xs">🪑</span>, label: 'Reclinables' },
}

const DAYS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const PASSENGER_LABELS: Record<string, string> = { adult: 'Adulto', child: 'Menor', senior: 'Senior' }
const TICKET_LABELS: Record<string, string>    = { one_way: 'Sencillo', round_trip: 'Redondo' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function amenitiesFromDB(raw: Record<string, boolean> | null): string[] {
  return Object.entries(raw || {}).filter(([, v]) => v).map(([k]) => k)
}

function amenitiesToDB(arr: string[]): Record<string, boolean> {
  return arr.reduce<Record<string, boolean>>((acc, a) => ({ ...acc, [a]: true }), {})
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BusesPage() {
  const [tab, setTab] = useState<Tab>('flota')

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'flota',    label: 'Flota',    icon: <Bus className="w-4 h-4" /> },
    { id: 'paradas',  label: 'Paradas',  icon: <MapPin className="w-4 h-4" /> },
    { id: 'rutas',    label: 'Rutas',    icon: <Route className="w-4 h-4" /> },
    { id: 'horarios', label: 'Horarios', icon: <Clock className="w-4 h-4" /> },
    { id: 'tarifas',  label: 'Tarifas',  icon: <DollarSign className="w-4 h-4" /> },
    { id: 'equipaje', label: 'Equipaje', icon: <Luggage className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="font-display font-black text-2xl text-[#0f2c5c] flex items-center gap-2">
          <Bus className="w-6 h-6 text-[#c01515]" />
          Gestión de autobuses
        </h1>
        <p className="text-slate-500 text-sm mt-1">Edita la flota, paradas, rutas, horarios, tarifas y equipaje.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-7 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-white text-[#0f2c5c] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'flota'    && <FlotaTab />}
      {tab === 'paradas'  && <ParadasTab />}
      {tab === 'rutas'    && <RutasTab />}
      {tab === 'horarios' && <HorariosTab />}
      {tab === 'tarifas'  && <TarifasTab />}
      {tab === 'equipaje' && <EquipajeTab />}
    </div>
  )
}

// ─── FLOTA ───────────────────────────────────────────────────────────────────

function FlotaTab() {
  const [fleet, setFleet]           = useState<BusRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [open, setOpen]             = useState(false)
  const [editing, setEditing]       = useState<BusRow | null>(null)
  const [form, setForm]             = useState({ plate: '', model: '', brand: '', year: 2024, capacity: 56, amenities: ['wifi', 'ac', 'restroom'] as string[] })
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    supabase
      .from('buses')
      .select('id, plate, model, brand, year, capacity, amenities, is_active')
      .order('created_at', { ascending: true })
      .then(({ data }: { data: Array<{ id: string; plate: string; model: string; brand: string; year: number; capacity: number; amenities: Record<string, boolean> | null; is_active: boolean }> | null }) => {
        if (data) {
          setFleet(data.map(b => ({ ...b, amenities: amenitiesFromDB(b.amenities) })))
        }
        setLoading(false)
      })
  }, [])

  const toggleAmenity = (a: string) =>
    setForm(p => ({ ...p, amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a] }))

  const openAdd = () => {
    setEditing(null)
    setForm({ plate: '', model: '', brand: '', year: 2024, capacity: 56, amenities: ['wifi', 'ac', 'restroom'] })
    setOpen(true)
  }

  const openEdit = (bus: BusRow) => {
    setEditing(bus)
    setForm({ plate: bus.plate, model: bus.model, brand: bus.brand, year: bus.year, capacity: bus.capacity, amenities: [...bus.amenities] })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const payload = { ...form, amenities: amenitiesToDB(form.amenities) }

    if (editing) {
      await supabase.from('buses').update(payload).eq('id', editing.id)
      setFleet(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b))
    } else {
      const { data } = await supabase
        .from('buses')
        .insert({ ...payload, is_active: true })
        .select('id, plate, model, brand, year, capacity, amenities, is_active')
        .single()
      if (data) {
        setFleet(prev => [...prev, { ...data, amenities: amenitiesFromDB(data.amenities) }])
      }
    }
    setSaving(false)
    setOpen(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    await supabase.from('buses').update({ is_active: !current }).eq('id', id)
    setFleet(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b))
  }

  const deleteBus = async (id: string) => {
    if (!confirm('¿Eliminar este autobús?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    await supabase.from('buses').delete().eq('id', id)
    setFleet(prev => prev.filter(b => b.id !== id))
  }

  const filtered = fleet.filter(b =>
    b.plate.toLowerCase().includes(search.toLowerCase()) ||
    b.model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por placa o modelo..."
            className="pl-10 rounded-xl border-slate-200" />
        </div>
        <Button onClick={openAdd} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Agregar autobús
        </Button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando flota...</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">No hay autobuses registrados.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(bus => (
          <div key={bus.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${bus.is_active ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-60'}`}>
            <div className="bg-[#0f2c5c] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[#c8a951] font-black text-sm font-mono">{bus.plate}</p>
                <p className="text-white/50 text-xs">{bus.brand} · {bus.year}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bus.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {bus.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-1">{bus.model}</h3>
              <p className="text-slate-400 text-xs mb-4">Capacidad: <span className="font-bold text-slate-600">{bus.capacity} asientos</span></p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {bus.amenities.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-medium">
                    {AMENITY_ICONS[a]?.icon}{AMENITY_ICONS[a]?.label ?? a}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => toggleActive(bus.id, bus.is_active)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {bus.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => openEdit(bus)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteBus(bus.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">
              {editing ? 'Editar autobús' : 'Agregar autobús'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Placa</Label>
                <Input value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                  placeholder="CA-TEO-004" className="mt-1.5 rounded-xl border-slate-200 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Año</Label>
                <Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                  className="mt-1.5 rounded-xl border-slate-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marca</Label>
                <Input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
                  placeholder="Prevost" className="mt-1.5 rounded-xl border-slate-200" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo</Label>
                <Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                  placeholder="X3-45" className="mt-1.5 rounded-xl border-slate-200" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacidad</Label>
              <Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amenidades</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(AMENITY_ICONS).map(([key, val]) => (
                  <button key={key} onClick={() => toggleAmenity(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.amenities.includes(key) ? 'bg-red-50 border-[#c01515]/40 text-[#c01515]' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}>
                    {val.icon}{val.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                {editing ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── PARADAS ─────────────────────────────────────────────────────────────────

function ParadasTab() {
  const [stops, setStops]     = useState<StopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<StopRow | null>(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({ code: '', name: '', city: '', state: '', terminal_name: '', sort_order: 0 })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/stops')
      .then(r => r.json())
      .then(({ stops: data }) => { if (Array.isArray(data)) setStops(data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ code: '', name: '', city: '', state: '', terminal_name: '', sort_order: stops.length * 10 })
    setOpen(true)
  }

  const openEdit = (s: StopRow) => {
    setEditing(s)
    setForm({ code: s.code, name: s.name, city: s.city, state: s.state, terminal_name: s.terminal_name ?? '', sort_order: s.sort_order })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    const body = { ...form, code: form.code.toUpperCase(), terminal_name: form.terminal_name || null }
    if (editing) {
      await fetch('/api/admin/stops', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...body }) })
    } else {
      await fetch('/api/admin/stops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  const toggleActive = async (s: StopRow) => {
    await fetch('/api/admin/stops', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, is_active: !s.is_active }) })
    setStops(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x))
  }

  const deleteStop = async (id: string) => {
    if (!confirm('¿Eliminar esta parada?')) return
    await fetch(`/api/admin/stops?id=${id}`, { method: 'DELETE' })
    setStops(prev => prev.filter(s => s.id !== id))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-slate-500 text-sm">{stops.length} paradas registradas</p>
        <Button onClick={openAdd} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Agregar parada
        </Button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando paradas...</div>}
      {!loading && stops.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">No hay paradas registradas.</div>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {stops.map((s, i) => (
          <div key={s.id} className={`flex items-center justify-between px-5 py-4 gap-4 ${i > 0 ? 'border-t border-slate-100' : ''} hover:bg-slate-50 transition-colors`}>
            <div className="flex items-center gap-4 min-w-0">
              <span className="shrink-0 w-12 text-center font-mono text-xs font-bold bg-[#0f2c5c] text-[#c8a951] px-2 py-1 rounded-lg">{s.code}</span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                <p className="text-slate-400 text-xs">{s.city}, {s.state}{s.terminal_name ? ` · ${s.terminal_name}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                {s.is_active ? 'Activa' : 'Inactiva'}
              </span>
              <button onClick={() => toggleActive(s)} className="text-slate-400 hover:text-slate-700 transition-colors">
                {s.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteStop(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">
              {editing ? 'Editar parada' : 'Agregar parada'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código</Label>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="LA" className="mt-1.5 rounded-xl border-slate-200 font-mono uppercase" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orden</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                  className="mt-1.5 rounded-xl border-slate-200" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Los Angeles" className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciudad</Label>
                <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="Los Angeles" className="mt-1.5 rounded-xl border-slate-200" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</Label>
                <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                  placeholder="CA" className="mt-1.5 rounded-xl border-slate-200" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terminal (opcional)</Label>
              <Input value={form.terminal_name} onChange={e => setForm(p => ({ ...p, terminal_name: e.target.value }))}
                placeholder="Terminal Central" className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                {editing ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── RUTAS ───────────────────────────────────────────────────────────────────

function RutasTab() {
  const [routes, setRoutes]   = useState<RouteRow[]>([])
  const [stops, setStops]     = useState<StopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<RouteRow | null>(null)
  const [saving, setSaving]   = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', name: '', origin_stop_id: '', destination_stop_id: '', duration_minutes: 120 })

  const load = useCallback(async () => {
    setLoading(true)
    const [rRes, sRes] = await Promise.all([
      fetch('/api/admin/routes').then(r => r.json()),
      fetch('/api/admin/stops').then(r => r.json()),
    ])
    if (Array.isArray(rRes.routes)) setRoutes(rRes.routes)
    if (Array.isArray(sRes.stops)) setStops(sRes.stops)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ code: '', name: '', origin_stop_id: stops[0]?.id ?? '', destination_stop_id: stops[1]?.id ?? '', duration_minutes: 120 })
    setOpen(true)
  }

  const openEdit = (r: RouteRow) => {
    setEditing(r)
    setForm({ code: r.code, name: r.name, origin_stop_id: r.origin_stop_id, destination_stop_id: r.destination_stop_id, duration_minutes: r.duration_minutes })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    if (editing) {
      await fetch('/api/admin/routes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form }) })
    } else {
      await fetch('/api/admin/routes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  const toggleActive = async (r: RouteRow) => {
    await fetch('/api/admin/routes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, is_active: !r.is_active }) })
    setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x))
  }

  const deleteRoute = async (id: string) => {
    if (!confirm('¿Eliminar esta ruta? También se eliminarán sus horarios.')) return
    await fetch(`/api/admin/routes?id=${id}`, { method: 'DELETE' })
    setRoutes(prev => prev.filter(r => r.id !== id))
  }

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}`.trim() : `${m}min`
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-slate-500 text-sm">{routes.length} rutas registradas</p>
        <Button onClick={openAdd} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Agregar ruta
        </Button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando rutas...</div>}
      {!loading && routes.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">No hay rutas registradas.</div>}

      <div className="space-y-3">
        {routes.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 gap-4">
              <button className="flex items-center gap-4 min-w-0 flex-1 text-left" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                <div className="w-10 h-10 rounded-xl bg-[#0f2c5c] flex items-center justify-center shrink-0">
                  <Route className="w-5 h-5 text-[#c8a951]" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{r.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {r.origin_stop?.name} → {r.destination_stop?.name} · {formatDuration(r.duration_minutes)}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} />
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                  {r.is_active ? 'Activa' : 'Inactiva'}
                </span>
                <button onClick={() => toggleActive(r)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {r.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteRoute(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {expanded === r.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Horarios ({r.schedules?.length ?? 0})</p>
                {(r.schedules ?? []).length === 0 ? (
                  <p className="text-slate-400 text-xs">Sin horarios. Agrégalos en la pestaña Horarios.</p>
                ) : (
                  <div className="space-y-2">
                    {r.schedules.map(sch => (
                      <div key={sch.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                        <span className="font-mono font-bold text-sm text-[#0f2c5c]">{sch.departure_time.slice(0, 5)}</span>
                        <span className="text-slate-400 text-xs">{sch.days_of_week.map(d => DAYS_LABELS[d]).join(', ')}</span>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${sch.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          {sch.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">
              {editing ? 'Editar ruta' : 'Agregar ruta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código</Label>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="LA-TJ" className="mt-1.5 rounded-xl border-slate-200 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duración (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                  className="mt-1.5 rounded-xl border-slate-200" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Los Angeles → Tijuana" className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parada origen</Label>
              <select value={form.origin_stop_id} onChange={e => setForm(p => ({ ...p, origin_stop_id: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {stops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parada destino</Label>
              <select value={form.destination_stop_id} onChange={e => setForm(p => ({ ...p, destination_stop_id: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {stops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                {editing ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── HORARIOS ────────────────────────────────────────────────────────────────

function HorariosTab() {
  const [routes, setRoutes]               = useState<RouteRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [addOpen, setAddOpen]             = useState(false)
  const [editOpen, setEditOpen]           = useState(false)
  const [saving, setSaving]               = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [addForm, setAddForm]             = useState({ route_id: '', departure_time: '08:00', days_of_week: [0, 1, 2, 3, 4, 5, 6] as number[] })
  const [editTarget, setEditTarget]       = useState<{ id: string; routeId: string } | null>(null)
  const [editForm, setEditForm]           = useState({ departure_time: '08:00', days_of_week: [] as number[] })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/routes')
      .then(r => r.json())
      .then(({ routes: data }) => { if (Array.isArray(data)) setRoutes(data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const toggleAddDay = (day: number) =>
    setAddForm(p => ({
      ...p,
      days_of_week: p.days_of_week.includes(day)
        ? p.days_of_week.filter(d => d !== day)
        : [...p.days_of_week, day].sort(),
    }))

  const toggleEditDay = (day: number) =>
    setEditForm(p => ({
      ...p,
      days_of_week: p.days_of_week.includes(day)
        ? p.days_of_week.filter(d => d !== day)
        : [...p.days_of_week, day].sort(),
    }))

  const openAdd = () => {
    setAddForm({ route_id: selectedRouteId || routes[0]?.id || '', departure_time: '08:00', days_of_week: [0, 1, 2, 3, 4, 5, 6] })
    setAddOpen(true)
  }

  const openEdit = (sch: ScheduleRow, routeId: string) => {
    setEditTarget({ id: sch.id, routeId })
    setEditForm({ departure_time: sch.departure_time.slice(0, 5), days_of_week: [...sch.days_of_week] })
    setEditOpen(true)
  }

  const saveAdd = async () => {
    if (!addForm.route_id || addForm.days_of_week.length === 0) return
    setSaving(true)
    await fetch('/api/admin/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: addForm.route_id, departure_time: addForm.departure_time, days_of_week: addForm.days_of_week }),
    })
    setSaving(false)
    setAddOpen(false)
    load()
  }

  const saveEdit = async () => {
    if (!editTarget || editForm.days_of_week.length === 0) return
    setSaving(true)
    const res = await fetch('/api/admin/schedules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editTarget.id, departure_time: editForm.departure_time, days_of_week: editForm.days_of_week }),
    })
    const { schedule } = await res.json()
    if (schedule) {
      setRoutes(prev => prev.map(r => r.id === editTarget.routeId
        ? { ...r, schedules: r.schedules.map(s => s.id === editTarget.id ? { ...s, ...schedule } : s) }
        : r
      ))
    }
    setSaving(false)
    setEditOpen(false)
    setEditTarget(null)
  }

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('¿Eliminar este horario?')) return
    await fetch(`/api/admin/schedules?id=${scheduleId}`, { method: 'DELETE' })
    setRoutes(prev => prev.map(r => ({ ...r, schedules: r.schedules.filter(s => s.id !== scheduleId) })))
  }

  const toggleScheduleActive = async (scheduleId: string, current: boolean, routeId: string) => {
    await fetch('/api/admin/schedules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: scheduleId, is_active: !current }) })
    setRoutes(prev => prev.map(r => r.id === routeId
      ? { ...r, schedules: r.schedules.map(s => s.id === scheduleId ? { ...s, is_active: !current } : s) }
      : r
    ))
  }

  const filteredRoutes = selectedRouteId ? routes.filter(r => r.id === selectedRouteId) : routes

  const DayPicker = ({ days, onToggle }: { days: number[]; onToggle: (d: number) => void }) => (
    <div className="flex gap-2 flex-wrap">
      {DAYS_LABELS.map((label, idx) => (
        <button key={idx} type="button" onClick={() => onToggle(idx)}
          className={`w-12 h-10 rounded-xl text-xs font-bold border transition-all ${
            days.includes(idx)
              ? 'bg-[#0f2c5c] text-white border-[#0f2c5c]'
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-[#0f2c5c]/40 hover:text-[#0f2c5c]'
          }`}>{label}</button>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <select value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
          <option value="">Todas las rutas</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Button onClick={openAdd} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Agregar horario
        </Button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando horarios...</div>}

      <div className="space-y-4">
        {filteredRoutes.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0f2c5c] px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">{r.name}</p>
                <p className="text-white/50 text-xs">{r.origin_stop?.name} → {r.destination_stop?.name} / {r.code}</p>
              </div>
              <span className="text-[#c8a951] font-bold text-xs">{r.schedules?.length ?? 0} horarios</span>
            </div>
            {(r.schedules ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Sin horarios para esta ruta.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {r.schedules.map(sch => (
                  <div key={sch.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-mono font-black text-[#0f2c5c] text-lg shrink-0">{sch.departure_time.slice(0, 5)}</span>
                      <div className="flex gap-1 flex-wrap">
                        {DAYS_LABELS.map((label, idx) => (
                          <span key={idx} className={`text-[10px] font-bold w-7 h-7 rounded-lg flex items-center justify-center ${
                            sch.days_of_week.includes(idx)
                              ? 'bg-[#0f2c5c] text-white'
                              : 'bg-slate-100 text-slate-300'
                          }`}>{label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleScheduleActive(sch.id, sch.is_active, r.id)} className="text-slate-400 hover:text-slate-700 transition-colors">
                        {sch.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => openEdit(sch, r.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0f2c5c] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteSchedule(sch.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialog: Agregar */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">Agregar horario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ruta</Label>
              <select value={addForm.route_id} onChange={e => setAddForm(p => ({ ...p, route_id: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hora de salida</Label>
              <Input type="time" value={addForm.departure_time} onChange={e => setAddForm(p => ({ ...p, departure_time: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200 font-mono" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Días de operación <span className="text-slate-400 font-normal normal-case tracking-normal">(selecciona los activos)</span>
              </Label>
              <DayPicker days={addForm.days_of_week} onToggle={toggleAddDay} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={saveAdd} disabled={saving || addForm.days_of_week.length === 0}
                className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                {saving ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setEditTarget(null) }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">Editar horario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hora de salida</Label>
              <Input type="time" value={editForm.departure_time} onChange={e => setEditForm(p => ({ ...p, departure_time: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200 font-mono text-lg" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Días de operación <span className="text-slate-400 font-normal normal-case tracking-normal">(clic para activar/desactivar)</span>
              </Label>
              <DayPicker days={editForm.days_of_week} onToggle={toggleEditDay} />
              {editForm.days_of_week.length === 0 && (
                <p className="text-red-500 text-xs mt-2 font-semibold">Selecciona al menos un día.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null) }} className="rounded-xl">Cancelar</Button>
              <Button onClick={saveEdit} disabled={saving || editForm.days_of_week.length === 0}
                className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                {saving ? 'Guardando...' : <><Save className="w-4 h-4 mr-1.5" />Guardar cambios</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── TARIFAS ─────────────────────────────────────────────────────────────────

interface PricingFormState { route_id: string; terminal_id: string; passenger_type: string; ticket_type: string; price: string }

function TarifasTab() {
  const [pricing, setPricing]       = useState<PricingRow[]>([])
  const [stops, setStops]           = useState<StopRow[]>([])
  const [routes, setRoutes]         = useState<RouteRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [saving, setSaving]         = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editPrice, setEditPrice]   = useState('')
  const [form, setForm]             = useState<PricingFormState>({ route_id: '', terminal_id: '', passenger_type: 'adult', ticket_type: 'one_way', price: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [pRes, sRes, rRes] = await Promise.all([
      fetch('/api/admin/pricing').then(r => r.json()),
      fetch('/api/admin/stops').then(r => r.json()),
      fetch('/api/admin/routes').then(r => r.json()),
    ])
    if (Array.isArray(pRes.pricing)) setPricing(pRes.pricing)
    if (Array.isArray(sRes.stops)) setStops(sRes.stops)
    if (Array.isArray(rRes.routes)) setRoutes(rRes.routes)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (p: PricingRow) => { setEditingId(p.id); setEditPrice(String(p.price)) }
  const cancelEdit = () => { setEditingId(null); setEditPrice('') }

  const saveEdit = async (id: string) => {
    setSaving(true)
    const res = await fetch('/api/admin/pricing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, price: Number(editPrice) }) })
    const { pricing: updated } = await res.json()
    if (updated) setPricing(prev => prev.map(p => p.id === id ? updated : p))
    setSaving(false)
    cancelEdit()
  }

  const savePricing = async () => {
    setSaving(true)
    await fetch('/api/admin/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: Number(form.price) }) })
    setSaving(false)
    setOpen(false)
    load()
  }

  const deletePricing = async (id: string) => {
    if (!confirm('¿Eliminar esta tarifa?')) return
    await fetch(`/api/admin/pricing?id=${id}`, { method: 'DELETE' })
    setPricing(prev => prev.filter(p => p.id !== id))
  }

  // Group pricing by route
  const grouped = pricing.reduce<Record<string, PricingRow[]>>((acc, p) => {
    const key = `${p.route_id}__${p.route?.name ?? p.route_id}`
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 flex-1 mr-4">
          <DollarSign className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-blue-700 text-xs">Las tarifas combinan ruta, parada de abordaje, tipo de pasajero y tipo de boleto. Haz clic en el precio para editarlo.</p>
        </div>
        <Button onClick={() => { setForm({ route_id: routes[0]?.id ?? '', terminal_id: stops[0]?.id ?? '', passenger_type: 'adult', ticket_type: 'one_way', price: '' }); setOpen(true) }}
          className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Agregar tarifa
        </Button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando tarifas...</div>}
      {!loading && pricing.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">No hay tarifas registradas.</div>}

      <div className="space-y-4">
        {Object.entries(grouped).map(([groupKey, items]) => {
          const routeName = groupKey.split('__')[1]
          return (
            <div key={groupKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#0f2c5c] px-5 py-3">
                <p className="text-white font-bold text-sm">{routeName}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Terminal</th>
                    <th className="px-4 py-2.5 text-left">Pasajero</th>
                    <th className="px-4 py-2.5 text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-center">Precio</th>
                    <th className="px-4 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => {
                    const isEditing = editingId === p.id
                    return (
                      <tr key={p.id} className={`border-t border-slate-100 ${isEditing ? 'bg-red-50/40' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="px-4 py-3 font-medium text-slate-700">{p.stop?.name ?? p.terminal_id}</td>
                        <td className="px-4 py-3 text-slate-600">{PASSENGER_LABELS[p.passenger_type] ?? p.passenger_type}</td>
                        <td className="px-4 py-3 text-slate-600">{TICKET_LABELS[p.ticket_type] ?? p.ticket_type}</td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                              className="w-24 mx-auto text-center rounded-lg h-8 text-sm border-[#c01515]/40" />
                          ) : (
                            <span className="font-bold text-[#0f2c5c]">${p.price}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={() => saveEdit(p.id)} disabled={saving}
                                className="p-1.5 rounded-lg bg-[#c01515] text-white hover:bg-[#a01010] transition-colors disabled:opacity-50">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deletePricing(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">Agregar tarifa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ruta</Label>
              <select value={form.route_id} onChange={e => setForm(p => ({ ...p, route_id: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terminal de abordaje</Label>
              <select value={form.terminal_id} onChange={e => setForm(p => ({ ...p, terminal_id: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                {stops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo pasajero</Label>
                <select value={form.passenger_type} onChange={e => setForm(p => ({ ...p, passenger_type: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                  <option value="adult">Adulto</option>
                  <option value="child">Menor</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo boleto</Label>
                <select value={form.ticket_type} onChange={e => setForm(p => ({ ...p, ticket_type: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c01515]/30">
                  <option value="one_way">Sencillo</option>
                  <option value="round_trip">Redondo</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio ($)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0.00" className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={savePricing} disabled={saving} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── EQUIPAJE ────────────────────────────────────────────────────────────────

function EquipajeTab() {
  const [luggage, setLuggage]       = useState<LuggageRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [editing, setEditing]       = useState<LuggageRow | null>(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({ name: '', description: '', max_weight_lbs: 0, extra_fee: 0 })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/luggage')
      .then(r => r.json())
      .then(({ luggage: data }) => { if (Array.isArray(data)) setLuggage(data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', max_weight_lbs: 0, extra_fee: 0 })
    setOpen(true)
  }

  const openEdit = (l: LuggageRow) => {
    setEditing(l)
    setForm({ name: l.name, description: l.description ?? '', max_weight_lbs: l.max_weight_lbs, extra_fee: l.extra_fee })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    if (editing) {
      await fetch('/api/admin/luggage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form }) })
    } else {
      await fetch('/api/admin/luggage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  const toggleActive = async (l: LuggageRow) => {
    await fetch('/api/admin/luggage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, is_active: !l.is_active }) })
    setLuggage(prev => prev.map(x => x.id === l.id ? { ...x, is_active: !l.is_active } : x))
  }

  const deleteLuggage = async (id: string) => {
    if (!confirm('¿Eliminar este tipo de equipaje?')) return
    await fetch(`/api/admin/luggage?id=${id}`, { method: 'DELETE' })
    setLuggage(prev => prev.filter(l => l.id !== id))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 flex-1 mr-4">
          <Luggage className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-700 text-xs">Define las opciones de equipaje que los pasajeros pueden agregar al comprar su boleto.</p>
        </div>
        <Button onClick={openAdd} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Agregar
        </Button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Cargando equipaje...</div>}
      {!loading && luggage.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">No hay tipos de equipaje registrados.</div>}

      <div className="space-y-3">
        {luggage.map(l => (
          <div key={l.id} className={`bg-white rounded-2xl border p-5 transition-all ${l.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0f2c5c]/8 flex items-center justify-center shrink-0">
                  <Luggage className="w-5 h-5 text-[#0f2c5c]" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{l.name}</p>
                  {l.description && <p className="text-slate-500 text-sm">{l.description}</p>}
                  <p className="text-slate-400 text-xs mt-0.5">Máx. {l.max_weight_lbs} lbs</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-black text-2xl text-[#0f2c5c]">
                    {l.extra_fee === 0 ? <span className="text-emerald-600 text-lg">Gratis</span> : `$${l.extra_fee}`}
                  </p>
                  {l.extra_fee > 0 && <p className="text-slate-400 text-xs">por persona</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(l)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {l.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(l)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteLuggage(l.id)} className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-[#0f2c5c]">
              {editing ? 'Editar equipaje' : 'Agregar tipo de equipaje'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="1 maleta" className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Una maleta hasta 25 kg" className="mt-1.5 rounded-xl border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peso máx (lbs)</Label>
                <Input type="number" value={form.max_weight_lbs} onChange={e => setForm(p => ({ ...p, max_weight_lbs: Number(e.target.value) }))}
                  className="mt-1.5 rounded-xl border-slate-200" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo extra ($)</Label>
                <Input type="number" value={form.extra_fee} onChange={e => setForm(p => ({ ...p, extra_fee: Number(e.target.value) }))}
                  className="mt-1.5 rounded-xl border-slate-200" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                {editing ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
