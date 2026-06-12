'use client'

import { useState, useEffect } from 'react'
import {
  Bus, Plus, Search, Wifi, Wind, Bath, Usb, Tv2, Pencil, ToggleLeft,
  ToggleRight, Trash2, MapPin, DollarSign, Luggage, Clock, Save, X, ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { BUS_ROUTES, ALL_STOPS, ROUTE_PRICES, LUGGAGE_OPTIONS, type BusRoute, type LuggageOption, type StopCode } from '@/lib/data/bus-config'

type Tab = 'flota' | 'rutas' | 'tarifas' | 'equipaje'

const AMENITY_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi:            { icon: <Wifi className="w-3.5 h-3.5" />,     label: 'Wi-Fi' },
  ac:              { icon: <Wind className="w-3.5 h-3.5" />,     label: 'A/C' },
  restroom:        { icon: <Bath className="w-3.5 h-3.5" />,     label: 'Baño' },
  usb:             { icon: <Usb className="w-3.5 h-3.5" />,      label: 'USB' },
  entertainment:   { icon: <Tv2 className="w-3.5 h-3.5" />,      label: 'Entretenimiento' },
  reclining_seats: { icon: <span className="text-xs">🪑</span>,   label: 'Reclinables' },
}

const INIT_FLEET: { id: string; plate: string; model: string; brand: string; year: number; capacity: number; amenities: string[]; is_active: boolean }[] = []

export default function BusesPage() {
  const [tab, setTab] = useState<Tab>('flota')

  // Flota state
  const [fleet, setFleet]       = useState(INIT_FLEET)
  const [fleetLoading, setFleetLoading] = useState(true)
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<typeof INIT_FLEET[0] | null>(null)
  const [form, setForm]         = useState({ plate: '', model: '', brand: '', year: 2024, capacity: 56, amenities: ['wifi','ac','restroom'] as string[] })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    supabase.from('buses').select('id, plate, model, brand, year, capacity, amenities, is_active').order('created_at', { ascending: true })
      .then(({ data }: { data: typeof INIT_FLEET | null }) => {
        if (data) setFleet(data)
        setFleetLoading(false)
      })
  }, [])

  // Tarifas state
  const [prices, setPrices] = useState(ROUTE_PRICES)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceForm, setPriceForm]       = useState({ adult: 0, child: 0 })

  // Equipaje state
  const [luggageOpts, setLuggageOpts] = useState<LuggageOption[]>(LUGGAGE_OPTIONS)
  const [editingLuggage, setEditingLuggage] = useState<string | null>(null)
  const [luggageForm, setLuggageForm]       = useState<LuggageOption>(LUGGAGE_OPTIONS[0])

  // Routes state (display only — edit via stops modal)
  const [routes] = useState(BUS_ROUTES)
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null)

  const filtered = fleet.filter(b =>
    b.plate.toLowerCase().includes(search.toLowerCase()) ||
    b.model.toLowerCase().includes(search.toLowerCase())
  )

  const toggleAmenity = (a: string) =>
    setForm(p => ({ ...p, amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a] }))

  const saveFleet = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    if (editing) {
      await supabase.from('buses').update(form).eq('id', editing.id)
      setFleet(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b))
    } else {
      const { data } = await supabase.from('buses').insert({ ...form, is_active: true }).select('id, plate, model, brand, year, capacity, amenities, is_active').single()
      if (data) setFleet(prev => [...prev, data as typeof INIT_FLEET[0]])
    }
    setOpen(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    await supabase.from('buses').update({ is_active: !current }).eq('id', id)
    setFleet(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b))
  }

  const deleteBus = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    await supabase.from('buses').delete().eq('id', id)
    setFleet(prev => prev.filter(b => b.id !== id))
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'flota',   label: 'Flota de buses',    icon: <Bus className="w-4 h-4" /> },
    { id: 'rutas',   label: 'Rutas y horarios',  icon: <Clock className="w-4 h-4" /> },
    { id: 'tarifas', label: 'Tarifas por parada',icon: <DollarSign className="w-4 h-4" /> },
    { id: 'equipaje',label: 'Equipaje',           icon: <Luggage className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="font-display font-black text-2xl text-[#0f2c5c] flex items-center gap-2">
          <Bus className="w-6 h-6 text-[#c01515]" />
          Gestión de autobuses
        </h1>
        <p className="text-slate-500 text-sm mt-1">Edita la flota, rutas, tarifas y opciones de equipaje.</p>
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

      {/* ── FLOTA ── */}
      {tab === 'flota' && (
        <>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por placa o modelo..."
                className="pl-10 rounded-xl border-slate-200" />
            </div>
            <Button onClick={() => { setEditing(null); setForm({ plate:'',model:'',brand:'',year:2024,capacity:56,amenities:['wifi','ac','restroom'] }); setOpen(true) }}
              className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Agregar autobús
            </Button>
          </div>

          {fleetLoading && (
            <div className="text-center py-16 text-slate-400 text-sm">Cargando flota...</div>
          )}

          {!fleetLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              No hay autobuses registrados. Agrega el primero con el botón de arriba.
            </div>
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
                        {AMENITY_ICONS[a]?.icon}{AMENITY_ICONS[a]?.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button onClick={() => toggleActive(bus.id, bus.is_active)}
                      className="text-slate-400 hover:text-slate-700 transition-colors">
                      {bus.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { setEditing(bus); setForm({ plate:bus.plate,model:bus.model,brand:bus.brand,year:bus.year,capacity:bus.capacity,amenities:[...bus.amenities] }); setOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteBus(bus.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
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
                    <Input value={form.plate} onChange={e => setForm(p => ({...p, plate: e.target.value.toUpperCase()}))}
                      placeholder="CA-TEO-004" className="mt-1.5 rounded-xl border-slate-200 font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Año</Label>
                    <Input type="number" value={form.year} onChange={e => setForm(p => ({...p, year: Number(e.target.value)}))}
                      className="mt-1.5 rounded-xl border-slate-200" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marca</Label>
                    <Input value={form.brand} onChange={e => setForm(p => ({...p, brand: e.target.value}))}
                      placeholder="Prevost" className="mt-1.5 rounded-xl border-slate-200" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo</Label>
                    <Input value={form.model} onChange={e => setForm(p => ({...p, model: e.target.value}))}
                      placeholder="X3-45" className="mt-1.5 rounded-xl border-slate-200" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacidad</Label>
                  <Input type="number" value={form.capacity} onChange={e => setForm(p => ({...p, capacity: Number(e.target.value)}))}
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
                  <Button onClick={saveFleet} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                    {editing ? 'Guardar cambios' : 'Agregar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── RUTAS Y HORARIOS ── */}
      {tab === 'rutas' && (
        <div className="space-y-4">
          {routes.map(route => (
            <div key={route.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0f2c5c] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#c8a951]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{route.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{route.stops.length} paradas · Capacidad {route.capacity} pax</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${route.direction === 'LA_TO_TJ' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-red-50 text-[#c01515] border border-red-200'}`}>
                    {route.direction === 'LA_TO_TJ' ? 'LA → TJ' : 'TJ → LA'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${selectedRoute?.id === route.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {selectedRoute?.id === route.id && (
                <div className="border-t border-slate-100 p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Paradas y horarios</p>
                  <div className="relative">
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-slate-200" />
                    <div className="space-y-4">
                      {route.stops.map((stop, i) => {
                        const isFirst = i === 0
                        const isLast  = i === route.stops.length - 1
                        return (
                          <div key={stop.code} className="flex items-start gap-4 relative">
                            <div className={`w-5 h-5 rounded-full border-2 shrink-0 z-10 mt-0.5 flex items-center justify-center ${
                              stop.type === 'boarding' ? 'bg-[#c01515] border-[#c01515]' :
                              stop.type === 'dropping' ? 'bg-[#0f2c5c] border-[#0f2c5c]' :
                              'bg-amber-500 border-amber-500'
                            }`}>
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                            <div className="flex-1 flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{ALL_STOPS[stop.code]?.name}</p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                  {stop.type === 'boarding' ? '🟥 Solo abordaje' :
                                   stop.type === 'dropping' ? '🟦 Solo bajada' :
                                   '🟨 Abordaje y bajada'}
                                </p>
                              </div>
                              <p className="font-mono font-bold text-slate-700 text-sm">{stop.time}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-3 h-3 rounded-full bg-[#c01515]" /> Solo abordaje
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-3 h-3 rounded-full bg-[#0f2c5c]" /> Solo bajada
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-3 h-3 rounded-full bg-amber-500" /> Abordaje y bajada
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TARIFAS ── */}
      {tab === 'tarifas' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex gap-2">
            <DollarSign className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-blue-700 text-sm">
              Las tarifas se calculan por la combinación de parada de abordaje → parada de bajada. Haz click en cualquier tarifa para editarla.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0f2c5c] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Origen (aborda)</th>
                  <th className="px-4 py-3 text-left">Destino (baja)</th>
                  <th className="px-4 py-3 text-center">Adulto</th>
                  <th className="px-4 py-3 text-center">Menor</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(prices).map(([key, val]) => {
                  const [orig, dest] = key.split(':') as [StopCode, StopCode]
                  const isEditing = editingPrice === key
                  return (
                    <tr key={key} className={`border-t border-slate-100 ${isEditing ? 'bg-red-50' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#c01515]" />
                          <span className="font-medium text-slate-700">{ALL_STOPS[orig]?.name || orig}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#0f2c5c]" />
                          <span className="font-medium text-slate-700">{ALL_STOPS[dest]?.name || dest}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <Input type="number" value={priceForm.adult} onChange={e => setPriceForm(p => ({...p, adult: Number(e.target.value)}))}
                            className="w-20 mx-auto text-center rounded-lg border-[#c01515]/40 focus:border-[#c01515] h-8 text-sm" />
                        ) : (
                          <span className="font-bold text-[#0f2c5c]">${val.adult}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <Input type="number" value={priceForm.child} onChange={e => setPriceForm(p => ({...p, child: Number(e.target.value)}))}
                            className="w-20 mx-auto text-center rounded-lg border-[#c01515]/40 focus:border-[#c01515] h-8 text-sm" />
                        ) : (
                          <span className="font-bold text-slate-600">${val.child}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => { setPrices(p => ({...p, [key]: priceForm})); setEditingPrice(null) }}
                              className="p-1.5 rounded-lg bg-[#c01515] text-white hover:bg-[#a01010] transition-colors">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingPrice(null)} className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingPrice(key); setPriceForm({ adult: val.adult, child: val.child }) }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EQUIPAJE ── */}
      {tab === 'equipaje' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2">
            <Luggage className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-700 text-sm">
              Define las opciones de equipaje que los pasajeros pueden agregar al comprar su boleto.
            </p>
          </div>

          {luggageOpts.map(opt => {
            const isEditing = editingLuggage === opt.id
            return (
              <div key={opt.id} className={`bg-white rounded-2xl border p-5 transition-all ${isEditing ? 'border-[#c01515]/30 bg-red-50/30' : 'border-slate-200'}`}>
                {isEditing ? (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800">Editando: {opt.label}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</Label>
                        <Input value={luggageForm.label} onChange={e => setLuggageForm(p => ({...p, label: e.target.value}))}
                          className="mt-1.5 rounded-xl border-slate-200" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio ($)</Label>
                        <Input type="number" value={luggageForm.price} onChange={e => setLuggageForm(p => ({...p, price: Number(e.target.value)}))}
                          className="mt-1.5 rounded-xl border-slate-200" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</Label>
                      <Input value={luggageForm.description} onChange={e => setLuggageForm(p => ({...p, description: e.target.value}))}
                        className="mt-1.5 rounded-xl border-slate-200" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        setLuggageOpts(prev => prev.map(o => o.id === opt.id ? luggageForm : o))
                        setEditingLuggage(null)
                      }} className="bg-[#c01515] hover:bg-[#a01010] text-white font-bold rounded-xl">
                        <Save className="w-4 h-4 mr-1.5" /> Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setEditingLuggage(null)} className="rounded-xl">Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{opt.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800">{opt.label}</p>
                        <p className="text-slate-500 text-sm">{opt.description}</p>
                        {opt.maxKg && <p className="text-slate-400 text-xs mt-0.5">Máx. {opt.maxKg} kg</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-black text-2xl text-[#0f2c5c]">
                          {opt.price === 0 ? <span className="text-emerald-600 text-lg">Gratis</span> : `$${opt.price}`}
                        </p>
                        {opt.price > 0 && <p className="text-slate-400 text-xs">por persona</p>}
                      </div>
                      <button
                        onClick={() => { setEditingLuggage(opt.id); setLuggageForm({...opt}) }}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
