import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — check if QuickBooks is connected
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { data } = await (service() as any)
    .from('quickbooks_settings')
    .select('realm_id, expires_at, updated_at')
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ connected: !!data, settings: data ?? null })
}

// DELETE — disconnect QuickBooks (removes all tokens)
export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  await (service() as any)
    .from('quickbooks_settings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  return NextResponse.json({ ok: true })
}
