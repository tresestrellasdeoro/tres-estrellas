import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — own tickets for any authenticated user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await svc()
    .from('support_tickets')
    .select('id, ticket_number, subject, category, priority, status, created_at, updated_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — create a new support ticket
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { subject, category, priority, description } = body
  if (!subject || !description) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const service = svc()

  const { data: profile } = await service
    .from('profiles')
    .select('full_name, role, sucursal_id')
    .eq('id', user.id)
    .maybeSingle() as any

  const { data, error } = await service
    .from('support_tickets')
    .insert({
      created_by:   user.id,
      creator_name: profile?.full_name ?? user.email ?? 'Usuario',
      creator_role: profile?.role ?? 'customer',
      sucursal_id:  profile?.sucursal_id ?? null,
      subject:      subject.trim(),
      category:     category ?? 'otro',
      priority:     priority ?? 'media',
      description:  description.trim(),
      ticket_number: '',
    })
    .select('id, ticket_number')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
