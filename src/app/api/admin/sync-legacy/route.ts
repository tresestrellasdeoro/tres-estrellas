import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { runLegacySync } from '@/lib/legacy-sync'

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: p } = await svc().from('profiles').select('role').eq('id', user.id).maybeSingle() as { data: { role: string } | null }
  return ['admin', 'super_admin', 'developer'].includes(p?.role ?? '')
}

// GET — sync status
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await svc()
    .from('legacy_sync_state')
    .select('*')
    .eq('id', 'boletos')
    .single()

  // Also get total count in MySQL to show progress %
  return NextResponse.json({ state: data ?? null })
}

// POST — trigger one batch sync
export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const result = await runLegacySync()
  return NextResponse.json(result, { status: result.error ? 500 : 200 })
}
