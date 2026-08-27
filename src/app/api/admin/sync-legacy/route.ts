import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { runLegacySync, runLegacyPackageSync } from '@/lib/legacy-sync'

export const maxDuration = 60

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — sync status for both boletos and paquetes
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const [{ data: boletos }, { data: paquetes }] = await Promise.all([
    svc().from('legacy_sync_state').select('*').eq('id', 'boletos').single(),
    svc().from('legacy_sync_state').select('*').eq('id', 'paquetes').single(),
  ])

  return NextResponse.json({ boletos: boletos ?? null, paquetes: paquetes ?? null })
}

// POST — trigger one batch for the requested type (or both)
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json().catch(() => ({}))
  const type = body.type as 'boletos' | 'paquetes' | 'all' | undefined

  if (type === 'paquetes') {
    const result = await runLegacyPackageSync()
    return NextResponse.json({ paquetes: result }, { status: result.error ? 500 : 200 })
  }

  if (type === 'all') {
    const [boletos, paquetes] = await Promise.all([runLegacySync(), runLegacyPackageSync()])
    return NextResponse.json({ boletos, paquetes })
  }

  // Default: boletos
  const result = await runLegacySync()
  return NextResponse.json({ boletos: result }, { status: result.error ? 500 : 200 })
}
