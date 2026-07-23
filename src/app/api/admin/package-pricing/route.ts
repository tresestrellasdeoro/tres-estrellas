import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { data, error } = await service()
    .from('package_pricing')
    .select('*')
    .order('price', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pricing: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { id, price, max_lbs, dims } = body
  if (!id || price === undefined) return NextResponse.json({ error: 'Falta id o precio' }, { status: 422 })

  const { data, error } = await service()
    .from('package_pricing')
    .update({ price: Number(price), max_lbs: max_lbs ?? null, dims: dims ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pricing: data })
}
