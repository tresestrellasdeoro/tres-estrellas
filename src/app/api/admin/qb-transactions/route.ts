import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = req.nextUrl
  const type  = searchParams.get('type')
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') ?? '100')

  let query = svc()
    .from('qb_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type) as any
  if (from) query = query.gte('created_at', from) as any
  if (to)   query = query.lte('created_at', to) as any

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data ?? [] })
}
