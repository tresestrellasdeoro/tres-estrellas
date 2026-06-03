'use client'

import { useState } from 'react'
import { User, Users, UserCheck, Info } from 'lucide-react'

// 14 rows × 4 columns (A B | aisle | C D)
const ROWS    = 14
const COLUMNS = ['A', 'B', 'C', 'D'] as const
type Column   = typeof COLUMNS[number]

// Some seats are pre-occupied (demo) — replace with real DB data
const DEMO_OCCUPIED = [
  'A1','B1','C1',
  'A2','D2',
  'B3','C3','D3',
  'A5','B5',
  'C6','D6',
  'A7','B7','C7','D7',
  'A9','D9',
  'B10','C10',
  'A11','B11','C11',
  'D12',
  'A13',
  'B14','C14',
]

export type SeatId = string // e.g. "A3", "C12"

interface SeatMapProps {
  passengers:    { name: string; type: string }[]
  occupiedSeats?: SeatId[]
  onChange?:     (seats: Record<number, SeatId>) => void
  onComplete?:   (seats: Record<number, SeatId>) => void
}

export function SeatMap({ passengers, occupiedSeats = DEMO_OCCUPIED, onChange, onComplete }: SeatMapProps) {
  // selectedSeats[passengerIndex] = seatId
  const [selectedSeats, setSelectedSeats] = useState<Record<number, SeatId>>({})
  const [activePassenger, setActivePassenger] = useState(0)

  const totalPassengers  = passengers.length
  const allSeatsSelected = Object.keys(selectedSeats).length === totalPassengers

  const getSeatStatus = (seatId: SeatId): 'occupied' | 'selected' | 'mine' | 'available' => {
    if (occupiedSeats.includes(seatId)) return 'occupied'
    const passengerIdx = Object.entries(selectedSeats).find(([, s]) => s === seatId)?.[0]
    if (passengerIdx !== undefined) {
      return Number(passengerIdx) === activePassenger ? 'mine' : 'selected'
    }
    return 'available'
  }

  const handleSeatClick = (seatId: SeatId) => {
    const status = getSeatStatus(seatId)
    if (status === 'occupied') return

    if (status === 'mine') {
      setSelectedSeats(prev => {
        const next = { ...prev }
        delete next[activePassenger]
        onChange?.(next)
        return next
      })
      return
    }

    if (status === 'selected') return

    const next = { ...selectedSeats, [activePassenger]: seatId }
    setSelectedSeats(next)
    onChange?.(next)

    const totalAfter = Object.keys(next).length
    if (totalAfter === passengers.length) {
      onComplete?.(next)
    }

    // Auto-advance to next unselected passenger
    const nextUnselected = passengers.findIndex((_, i) => i !== activePassenger && !next[i])
    if (nextUnselected !== -1) setActivePassenger(nextUnselected)
  }

  const passengerColors = [
    { bg: 'bg-[#c01515]',     border: 'border-[#a01010]',    text: 'text-white', label: 'bg-[#c01515] text-white' },
    { bg: 'bg-blue-500',      border: 'border-blue-600',     text: 'text-white',     label: 'bg-blue-500 text-white' },
    { bg: 'bg-emerald-500',   border: 'border-emerald-600',  text: 'text-white',     label: 'bg-emerald-500 text-white' },
    { bg: 'bg-purple-500',    border: 'border-purple-600',   text: 'text-white',     label: 'bg-purple-500 text-white' },
    { bg: 'bg-rose-500',      border: 'border-rose-600',     text: 'text-white',     label: 'bg-rose-500 text-white' },
  ]

  const getPassengerColor = (idx: number) => passengerColors[idx % passengerColors.length]

  return (
    <div className="space-y-6">

      {/* Passenger selector */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Seleccionando asiento para:
        </p>
        <div className="flex flex-wrap gap-2">
          {passengers.map((p, i) => {
            const seat   = selectedSeats[i]
            const color  = getPassengerColor(i)
            const active = activePassenger === i
            return (
              <button
                key={i}
                onClick={() => setActivePassenger(i)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  active
                    ? `${color.bg} ${color.border} ${color.text} shadow-lg scale-105`
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${active ? 'bg-black/20' : 'bg-slate-100'}`}>
                  {i + 1}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-none">{p.name || `Pasajero ${i+1}`}</p>
                  <p className={`text-[10px] mt-0.5 ${active ? 'opacity-70' : 'text-slate-400'}`}>
                    {seat ? `Asiento ${seat}` : 'Sin asiento'}
                  </p>
                </div>
                {seat && (
                  <span className={`text-xs font-black ml-1 px-1.5 py-0.5 rounded-lg ${active ? 'bg-black/20' : 'bg-slate-100 text-slate-700'}`}>
                    {seat}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bus map */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Bus body */}
          <div className="bg-gradient-to-b from-slate-100 to-slate-50 border-2 border-slate-300 rounded-[32px] p-4 shadow-xl relative overflow-hidden"
            style={{ minWidth: 260 }}>

            {/* Bus front / driver */}
            <div className="bg-[#0a1628] rounded-2xl px-4 py-2.5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[rgba(240,180,41,0.3)] border border-[rgba(240,180,41,0.5)] flex items-center justify-center">
                  <span className="text-[#f0b429] text-[8px] font-black">🚌</span>
                </div>
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Frente del bus</span>
              </div>
              <div className="w-8 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
                <div className="w-4 h-3 rounded-full border-2 border-slate-400" />
              </div>
            </div>

            {/* Column headers */}
            <div className="grid mb-1" style={{ gridTemplateColumns: '28px 1fr 1fr 20px 1fr 1fr' }}>
              <div />
              {['A','B','','C','D'].map((col, i) => (
                <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase">
                  {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {Array.from({ length: ROWS }, (_, rowIdx) => {
                const row = rowIdx + 1
                return (
                  <div key={row} className="grid items-center gap-0" style={{ gridTemplateColumns: '28px 1fr 1fr 20px 1fr 1fr' }}>
                    {/* Row number */}
                    <div className="text-center text-[10px] font-bold text-slate-400 pr-1">{row}</div>

                    {/* Left seats: A B */}
                    {(['A','B'] as Column[]).map(col => {
                      const seatId = `${col}${row}` as SeatId
                      const status = getSeatStatus(seatId)
                      const pIdx   = Object.entries(selectedSeats).find(([,s]) => s === seatId)?.[0]
                      const color  = pIdx !== undefined ? getPassengerColor(Number(pIdx)) : null

                      return (
                        <button
                          key={seatId}
                          onClick={() => handleSeatClick(seatId)}
                          disabled={status === 'occupied'}
                          title={status === 'occupied' ? 'Ocupado' : status === 'available' ? `Seleccionar ${seatId}` : `${seatId} — Pasajero ${Number(pIdx)+1}`}
                          className={`
                            mx-0.5 h-9 rounded-lg text-[10px] font-black border-2 transition-all relative
                            ${status === 'occupied'
                              ? 'bg-slate-300 border-slate-400 text-slate-400 cursor-not-allowed'
                              : status === 'mine'
                              ? `${color?.bg} ${color?.border} ${color?.text} shadow-md scale-105`
                              : status === 'selected'
                              ? `${color?.bg} ${color?.border} ${color?.text} opacity-80`
                              : 'bg-white border-slate-300 text-slate-500 hover:border-[#c01515] hover:bg-red-50 hover:scale-105 cursor-pointer'
                            }
                          `}
                        >
                          {status === 'occupied'
                            ? <span className="text-slate-400 text-[9px]">✕</span>
                            : seatId
                          }
                        </button>
                      )
                    })}

                    {/* Aisle */}
                    <div className="flex items-center justify-center">
                      {row === 7 && <div className="w-1 h-3 rounded-full bg-slate-300" />}
                    </div>

                    {/* Right seats: C D */}
                    {(['C','D'] as Column[]).map(col => {
                      const seatId = `${col}${row}` as SeatId
                      const status = getSeatStatus(seatId)
                      const pIdx   = Object.entries(selectedSeats).find(([,s]) => s === seatId)?.[0]
                      const color  = pIdx !== undefined ? getPassengerColor(Number(pIdx)) : null

                      return (
                        <button
                          key={seatId}
                          onClick={() => handleSeatClick(seatId)}
                          disabled={status === 'occupied'}
                          title={status === 'occupied' ? 'Ocupado' : status === 'available' ? `Seleccionar ${seatId}` : `${seatId} — Pasajero ${Number(pIdx)+1}`}
                          className={`
                            mx-0.5 h-9 rounded-lg text-[10px] font-black border-2 transition-all relative
                            ${status === 'occupied'
                              ? 'bg-slate-300 border-slate-400 text-slate-400 cursor-not-allowed'
                              : status === 'mine'
                              ? `${color?.bg} ${color?.border} ${color?.text} shadow-md scale-105`
                              : status === 'selected'
                              ? `${color?.bg} ${color?.border} ${color?.text} opacity-80`
                              : 'bg-white border-slate-300 text-slate-500 hover:border-[#c01515] hover:bg-red-50 hover:scale-105 cursor-pointer'
                            }
                          `}
                        >
                          {status === 'occupied'
                            ? <span className="text-slate-400 text-[9px]">✕</span>
                            : seatId
                          }
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Bus back */}
            <div className="mt-4 flex justify-center gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-6 h-2 rounded-full bg-slate-300" />
              ))}
            </div>
            <p className="text-center text-[9px] text-slate-400 mt-1 uppercase tracking-widest">Parte trasera</p>
          </div>

          {/* Left mirror */}
          <div className="absolute left-0 top-16 -translate-x-3 w-2.5 h-6 bg-slate-300 rounded-l-full" />
          {/* Right mirror */}
          <div className="absolute right-0 top-16 translate-x-3 w-2.5 h-6 bg-slate-300 rounded-r-full" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-white border-2 border-slate-300" />
          <span className="text-slate-500 font-medium">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#c01515] border-2 border-[#a01010]" />
          <span className="text-slate-500 font-medium">Tu selección</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-slate-300 border-2 border-slate-400" />
          <span className="text-slate-500 font-medium">Ocupado</span>
        </div>
        {passengers.length > 1 && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-blue-500 border-2 border-blue-600" />
            <span className="text-slate-500 font-medium">Otro pasajero</span>
          </div>
        )}
      </div>

      {/* Seat summary */}
      {Object.keys(selectedSeats).length > 0 && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Asientos seleccionados</p>
          <div className="space-y-2">
            {passengers.map((p, i) => {
              const seat  = selectedSeats[i]
              const color = getPassengerColor(i)
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[10px] font-black`}>
                      {i + 1}
                    </div>
                    <span className="text-slate-700 text-sm font-medium">{p.name || `Pasajero ${i+1}`}</span>
                  </div>
                  {seat
                    ? <span className={`px-3 py-1 rounded-xl text-xs font-black ${color.bg} ${color.text}`}>{seat}</span>
                    : <span className="text-slate-400 text-xs">Sin asiento</span>
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Availability badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5" />
        <span>{56 - occupiedSeats.length} asientos disponibles de 56 en total</span>
      </div>
    </div>
  )
}
