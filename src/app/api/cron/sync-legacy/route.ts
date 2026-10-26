import { NextResponse, type NextRequest } from 'next/server'
import { runLegacySync, runLegacyPackageSync } from '@/lib/legacy-sync'

export const dynamic = 'force-dynamic'

// Vercel Cron — runs nightly, syncs one batch each of boletos + paquetes
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [boletos, paquetes] = await Promise.all([
    runLegacySync(),
    runLegacyPackageSync(),
  ])

  return NextResponse.json({ boletos, paquetes })
}
