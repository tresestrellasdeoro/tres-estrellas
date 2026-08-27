import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { runLegacySync } from '@/lib/legacy-sync'

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — sync status
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { data } = await svc()
    .from('legacy_sync_state')
    .select('*')
    .eq('id', 'boletos')
    .single()

  return NextResponse.json({ state: data ?? null })
}

// POST — trigger one batch sync
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const result = await runLegacySync()
  return NextResponse.json(result, { status: result.error ? 500 : 200 })
}
