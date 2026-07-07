import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getAuthUrl } from '@/lib/quickbooks/client'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const state = crypto.randomUUID()
  const url   = getAuthUrl(state)
  return NextResponse.redirect(url)
}
