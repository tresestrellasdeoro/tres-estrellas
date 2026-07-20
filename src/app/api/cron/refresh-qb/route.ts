import { NextResponse, type NextRequest } from 'next/server'
import { getValidTokens } from '@/lib/quickbooks/client'

export const dynamic = 'force-dynamic'

// Called every 6 hours by Vercel Cron — keeps QB access token fresh automatically
export async function GET(req: NextRequest) {
  // Vercel cron sends this header; reject external calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tokens = await getValidTokens()
    if (!tokens) {
      return NextResponse.json({ ok: false, message: 'QuickBooks no conectado — reconectar desde Configuración' })
    }
    return NextResponse.json({ ok: true, realm_id: tokens.realm_id, expires_at: tokens.expires_at })
  } catch (e: any) {
    console.error('QB cron refresh error:', e.message)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
