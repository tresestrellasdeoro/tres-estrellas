'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DeleteCustomerButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/delete-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (r.ok) {
        router.refresh()
      } else {
        const { error } = await r.json()
        alert(error ?? 'Error eliminando cliente')
      }
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-xs text-slate-500 hidden sm:inline">¿Eliminar a {name}?</span>
        <button onClick={() => setConfirm(false)}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
          No
        </button>
        <button onClick={handleDelete} disabled={loading}
          className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Sí, eliminar
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
      title="Eliminar cliente">
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
