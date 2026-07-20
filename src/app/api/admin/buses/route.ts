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
  const { data, error } = await svc()
    .from('buses')
    .select('id, plate, brand, model, year, capacity, is_active')
    .eq('is_active', true)
    .order('plate')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ buses: data ?? [] })
}
