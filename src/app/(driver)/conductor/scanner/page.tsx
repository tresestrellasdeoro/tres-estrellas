'use client'

import { useState, useRef, useEffect } from 'react'
import { QrCode, CheckCircle2, XCircle, AlertTriangle, Camera, Keyboard, RotateCcw, Users, Bus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ScanResult = 'success' | 'already_used' | 'not_found' | 'wrong_trip' | null

// Demo passengers indexed by QR code
const DEMO_PASSENGERS: Record<string, { name: string; type: string; trip: string; route: string; time: string; terminal: string; used: boolean }> = {
  'abc123demo': { name: 'María García',   type: 'Adulto', trip: 'TEO-240601-0042', route: 'LA → LTI', time: '09:00', terminal: 'LTI', used: false },
  'def456demo': { name: 'Juan Hernández', type: 'Adulto', trip: 'TEO-240601-0042', route: 'LA → LTI', time: '09:00', terminal: 'LTI', used: false },
  'ghi789demo': { name: 'Ana López',      type: 'Menor',  trip: 'TEO-240601-0042', route: 'LA → LTI', time: '09:00', terminal: 'LTI', used: true  },
  'jkl000err':  { name: 'Pedro Martínez', type: 'Adulto', trip: 'TEO-240601-0099', route: 'LA → ATI', time: '11:00', terminal: 'ATI', used: false },
}

const CURRENT_TRIP = { id: 'TEO-240601-0042', route: 'LA → LTI', time: '09:00', terminal: 'LTI', bus: 'CA-TEO-001', total: 55, boarded: 34 }

export default function ScannerPage() {
  const [mode, setMode]           = useState<'camera' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [result, setResult]       = useState<ScanResult>(null)
  const [passenger, setPassenger] = useState<typeof DEMO_PASSENGERS[string] | null>(null)
  const [scannedCount, setScannedCount] = useState(0)
  const [scanHistory, setScanHistory]   = useState<{ name: string; time: string; status: ScanResult }[]>([])
  const [scanning, setScanning]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processCode = (code: string) => {
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) return

    setScanning(true)
    setTimeout(() => {
      const p = DEMO_PASSENGERS[trimmed]

      if (!p) {
        setResult('not_found')
        setPassenger(null)
      } else if (p.used) {
        setResult('already_used')
        setPassenger(p)
      } else if (p.trip !== CURRENT_TRIP.id) {
        setResult('wrong_trip')
        setPassenger(p)
      } else {
        setResult('success')
        setPassenger(p)
        DEMO_PASSENGERS[trimmed].used = true
        setScannedCount(c => c + 1)
        setScanHistory(h => [{ name: p.name, time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), status: 'success' }, ...h.slice(0, 9)])
      }
      setScanning(false)
    }, 600)
  }

  const reset = () => {
    setResult(null)
    setPassenger(null)
    setManualCode('')
    if (inputRef.current) inputRef.current.focus()
  }

  useEffect(() => {
    if (mode === 'manual' && inputRef.current) inputRef.current.focus()
  }, [mode])

  return (
    <div className="min-h-screen bg-[#0a1628] bg-dot-pattern p-4 sm:p-6">
      <div className="max-w-xl mx-auto">

        {/* Trip info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(240,180,41,0.15)] flex items-center justify-center">
              <Bus className="w-5 h-5 text-[#f0b429]" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{CURRENT_TRIP.route}</p>
              <p className="text-white/40 text-xs">{CURRENT_TRIP.bus} · Salida {CURRENT_TRIP.time} · Terminal {CURRENT_TRIP.terminal}</p>
            </div>
            <p className="text-[#f0b429] font-black text-sm font-mono">{CURRENT_TRIP.id.split('-')[2]}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Abordados',   value: scannedCount + CURRENT_TRIP.boarded, color: 'text-[#f0b429]' },
              { label: 'Pendientes',  value: CURRENT_TRIP.total - scannedCount - CURRENT_TRIP.boarded, color: 'text-white' },
              { label: 'Capacidad',   value: CURRENT_TRIP.total, color: 'text-white/50' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
                <p className="text-white/40 text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#f0b429] rounded-full transition-all"
              style={{ width: `${((scannedCount + CURRENT_TRIP.boarded) / CURRENT_TRIP.total) * 100}%` }} />
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-5">
          {[{ key: 'camera', icon: Camera, label: 'Cámara' }, { key: 'manual', icon: Keyboard, label: 'Manual' }].map(m => (
            <button key={m.key} onClick={() => setMode(m.key as 'camera' | 'manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === m.key ? 'bg-[#f0b429] text-[#0a1628]' : 'text-white/40 hover:text-white/70'}`}>
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Scanner area */}
        {!result ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-5">
            {mode === 'camera' ? (
              <div className="aspect-square flex flex-col items-center justify-center gap-4 p-8">
                {/* Simulated camera viewfinder */}
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 border-2 border-white/20 rounded-2xl" />
                  {/* Corner indicators */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-8 h-8`}>
                      <div className={`absolute ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'} w-full h-1 bg-[#f0b429] rounded-full`} />
                      <div className={`absolute ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'} w-1 h-full bg-[#f0b429] rounded-full`} />
                    </div>
                  ))}
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-4 top-0 h-0.5 bg-[#f0b429]/60 rounded-full animate-[scan_2s_ease-in-out_infinite]"
                    style={{ animation: 'move 2s ease-in-out infinite' }} />
                  <style>{`@keyframes move { 0%,100% { top: 16px } 50% { top: calc(100% - 16px) } }`}</style>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-white/10" />
                  </div>
                </div>

                <p className="text-white/40 text-sm text-center">Apunta la cámara al código QR del boleto</p>

                {/* Demo: simulate a scan */}
                <div className="flex gap-2">
                  {['abc123demo','def456demo','ghi789demo','jkl000err'].map(code => (
                    <button key={code} onClick={() => processCode(code)} disabled={scanning}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        code === 'ghi789demo' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                        code === 'jkl000err'  ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                        'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      } disabled:opacity-50`}>
                      {scanning ? '...' : code === 'ghi789demo' ? 'Ya usado' : code === 'jkl000err' ? 'Viaje error' : 'Simular'}
                    </button>
                  ))}
                </div>
                <p className="text-white/20 text-[10px]">Demo: botones simulan escaneo de QR</p>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-white/60 text-sm font-medium mb-3">Ingresa el código del QR manualmente:</p>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && processCode(manualCode)}
                    placeholder="Ej: abc123demo"
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-[#f0b429]/50 focus:ring-[#f0b429]/20 font-mono"
                  />
                  <Button onClick={() => processCode(manualCode)} disabled={!manualCode.trim() || scanning}
                    className="bg-[#f0b429] hover:bg-[#d97706] text-[#0a1628] font-bold rounded-xl">
                    {scanning ? '...' : 'OK'}
                  </Button>
                </div>
                <p className="text-white/25 text-[10px] mt-2">Prueba: abc123demo / def456demo / ghi789demo / jkl000err</p>
              </div>
            )}
          </div>
        ) : (
          /* Scan result */
          <div className={`rounded-2xl border p-6 mb-5 text-center ${
            result === 'success'      ? 'bg-emerald-500/10 border-emerald-500/30' :
            result === 'already_used' ? 'bg-amber-500/10 border-amber-500/30' :
                                        'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="mb-4">
              {result === 'success'      && <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-fade-up" />}
              {result === 'already_used' && <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto animate-fade-up" />}
              {(result === 'not_found' || result === 'wrong_trip') && <XCircle className="w-16 h-16 text-red-400 mx-auto animate-fade-up" />}
            </div>

            <h2 className={`font-display font-black text-xl mb-1 ${
              result === 'success' ? 'text-emerald-400' : result === 'already_used' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {result === 'success'      && '¡Abordaje confirmado!'}
              {result === 'already_used' && 'Boleto ya usado'}
              {result === 'not_found'    && 'QR no encontrado'}
              {result === 'wrong_trip'   && 'Viaje incorrecto'}
            </h2>

            {passenger && (
              <div className="mt-4 bg-white/5 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Pasajero</span>
                  <span className="text-white font-bold">{passenger.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Tipo</span>
                  <span className="text-white/80">{passenger.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Ruta</span>
                  <span className="text-white/80">{passenger.route}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Terminal</span>
                  <span className="text-white/80">{passenger.terminal}</span>
                </div>
                {result === 'wrong_trip' && (
                  <p className="text-red-400 text-xs text-center mt-2 font-semibold">
                    Este boleto es para el viaje de las {passenger.time} · {passenger.trip}
                  </p>
                )}
              </div>
            )}

            {result === 'not_found' && (
              <p className="text-red-300/60 text-xs mt-3">El código QR no corresponde a ningún boleto válido.</p>
            )}

            <Button onClick={reset} className="mt-5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl w-full border border-white/10">
              <RotateCcw className="w-4 h-4 mr-2" />
              Escanear siguiente
            </Button>
          </div>
        )}

        {/* History */}
        {scanHistory.length > 0 && (
          <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Últimos escaneos
            </p>
            <div className="space-y-2">
              {scanHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-white/70 text-xs font-medium flex-1">{h.name}</p>
                  <p className="text-white/30 text-xs">{h.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
