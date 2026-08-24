'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react'

export default function CambiarClavePage() {
  const [nueva, setNueva]           = useState('')
  const [confirmar, setConfirmar]   = useState('')
  const [showNueva, setShowNueva]   = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState('')

  const mismatch = confirmar.length > 0 && nueva !== confirmar
  const tooShort = nueva.length > 0 && nueva.length < 8
  const canSubmit = nueva.length >= 8 && nueva === confirmar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setSuccess(false)

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: nueva })

    if (err) {
      setError(err.message.includes('same password')
        ? 'La nueva contraseña debe ser diferente a la actual.'
        : 'No se pudo cambiar la contraseña. Intenta de nuevo.')
    } else {
      setSuccess(true)
      setNueva('')
      setConfirmar('')
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="font-black text-2xl text-[#0a1628] flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-[#c01515]" />
          Cambiar contraseña
        </h1>
        <p className="text-slate-500 text-sm mt-1">Actualiza tu contraseña de acceso al sistema</p>
      </div>

      {success && (
        <div className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Contraseña actualizada</p>
            <p className="text-emerald-600 text-xs mt-0.5">Usa tu nueva contraseña la próxima vez que inicies sesión.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* Nueva contraseña */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            <Lock className="w-3.5 h-3.5 inline mr-1" /> Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showNueva ? 'text' : 'password'}
              value={nueva}
              onChange={e => { setNueva(e.target.value); setSuccess(false) }}
              placeholder="Mínimo 8 caracteres"
              className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                tooShort
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                  : nueva.length >= 8
                  ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
                  : 'border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20'
              }`}
            />
            <button type="button" onClick={() => setShowNueva(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {tooShort && <p className="text-red-500 text-xs mt-1.5 font-semibold">Mínimo 8 caracteres</p>}
          {nueva.length >= 8 && <p className="text-emerald-600 text-xs mt-1.5 font-semibold">✓ Longitud correcta</p>}
        </div>

        {/* Confirmar */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            <Lock className="w-3.5 h-3.5 inline mr-1" /> Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              value={confirmar}
              onChange={e => { setConfirmar(e.target.value); setSuccess(false) }}
              placeholder="Repite la nueva contraseña"
              className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
                mismatch
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                  : confirmar.length > 0 && !mismatch
                  ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
                  : 'border-slate-200 focus:border-[#c01515] focus:ring-[#c01515]/20'
              }`}
            />
            <button type="button" onClick={() => setShowConf(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {mismatch && <p className="text-red-500 text-xs mt-1.5 font-semibold">Las contraseñas no coinciden</p>}
          {confirmar.length > 0 && !mismatch && <p className="text-emerald-600 text-xs mt-1.5 font-semibold">✓ Coinciden</p>}
        </div>

        <button type="submit" disabled={!canSubmit || loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#c01515] hover:bg-[#a01010] text-white font-black text-sm transition-colors disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-4">
        La nueva contraseña aplica en tu próximo inicio de sesión
      </p>
    </div>
  )
}
