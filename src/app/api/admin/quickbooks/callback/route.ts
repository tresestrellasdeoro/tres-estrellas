import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCode } from '@/lib/quickbooks/client'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const notAdmin = await requireAdmin(req)
  if (notAdmin) return NextResponse.redirect(new URL('/auth/login?next=/admin/configuracion', req.url))

  const { searchParams } = req.nextUrl
  const code    = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const error   = searchParams.get('error')

  const adminUrl = new URL('/admin/configuracion', req.url)

  if (error || !code || !realmId) {
    adminUrl.searchParams.set('qb', 'error')
    return NextResponse.redirect(adminUrl)
  }

  try {
    const tokens = await exchangeCode(code, realmId)

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await (service as any).from('quickbooks_settings').upsert({
      realm_id:      realmId,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'realm_id' })

    adminUrl.searchParams.set('qb', 'connected')
    return NextResponse.redirect(adminUrl)
  } catch (e: any) {
    console.error('QB OAuth callback error:', e.message)
    adminUrl.searchParams.set('qb', 'error')
    return NextResponse.redirect(adminUrl)
  }
}
