import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — all tickets for developer dashboard, with filters
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const category = searchParams.get('category')
  const priority = searchParams.get('priority')
  const search   = searchParams.get('search')

  let query = svc()
    .from('support_tickets')
    .select('id, ticket_number, subject, category, priority, status, creator_name, creator_role, sucursal_id, created_at, updated_at, resolved_at, sucursales(nombre)')
    .order('updated_at', { ascending: false })

  if (status)   query = query.eq('status', status)     as any
  if (category) query = query.eq('category', category) as any
  if (priority) query = query.eq('priority', priority) as any
  if (search)   query = query.ilike('subject', `%${search}%`) as any

  const { data, error } = await query as any
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
