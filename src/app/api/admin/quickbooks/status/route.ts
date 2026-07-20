import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getValidTokens } from '@/lib/quickbooks/client'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — check QB connection and proactively refresh token if needed
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  // getValidTokens auto-refreshes if expired — keeps token always alive
  const tokens = await getValidTokens()

  if (!tokens) {
    return NextResponse.json({ connected: false, settings: null })
  }

  return NextResponse.json({
    connected: true,
    settings: {
      realm_id:   tokens.realm_id,
      expires_at: tokens.expires_at,
      updated_at: tokens.updated_at,
    },
  })
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
