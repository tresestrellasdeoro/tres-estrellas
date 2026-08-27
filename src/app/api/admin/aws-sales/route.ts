import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getAwsSales } from '@/lib/aws-db'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const from   = req.nextUrl.searchParams.get('from') ?? undefined
  const to     = req.nextUrl.searchParams.get('to') ?? undefined
  const limit  = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0)

  const sales = await getAwsSales({ limit, offset, from, to })
  return NextResponse.json({ sales, total: sales.length })
}
