import { NextResponse, type NextRequest } from 'next/server'
import { runLegacySync } from '@/lib/legacy-sync'

export const dynamic = 'force-dynamic'

// Vercel Cron — runs nightly, syncs one batch of legacy tickets to Supabase
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runLegacySync()
  return NextResponse.json(result)
}
