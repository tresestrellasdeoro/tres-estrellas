import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ resultados: [] })

  const base = (process.env.AWS_PROXY_URL ?? 'http://54.212.85.161/api/boleto.php')
    .replace('boleto.php', 'search.php')
  const key  = process.env.AWS_PROXY_KEY ?? 'teo2026'

  try {
    const res = await fetch(
      `${base}?q=${encodeURIComponent(q)}&key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return NextResponse.json({ resultados: [] })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ resultados: [] })
  }
}
