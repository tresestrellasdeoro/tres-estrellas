import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getAuthUrl } from '@/lib/quickbooks/client'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const state = crypto.randomUUID()
  const url   = getAuthUrl(state)
  const res   = NextResponse.redirect(url)
  // Checked by the callback to block OAuth CSRF (connecting someone else's company)
  res.cookies.set('qb_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   10 * 60,
    path:     '/api/admin/quickbooks',
  })
  return res
}
