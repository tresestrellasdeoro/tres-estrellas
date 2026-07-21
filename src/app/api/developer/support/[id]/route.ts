import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireDeveloper } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — full ticket detail with messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireDeveloper(req); if (deny) return deny
  const { id } = await params

  const service = svc()
  const [{ data: ticket, error }, { data: messages }] = await Promise.all([
    service
      .from('support_tickets')
      .select('*, sucursales(nombre)')
      .eq('id', id)
      .maybeSingle() as any,
    service
      .from('support_messages')
      .select('id, sender_id, sender_name, message, is_developer, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }) as any,
  ])

  if (error || !ticket) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ ticket, messages: messages ?? [] })
}

// PATCH — update status, priority, or assigned_to
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireDeveloper(req); if (deny) return deny
  const { id } = await params

  const body = await req.json()
  const allowed = ['status', 'priority', 'assigned_to']
  const update: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (update.status === 'solucionada') {
    update.resolved_at = new Date().toISOString()
  }

  const { data, error } = await svc()
    .from('support_tickets')
    .update(update)
    .eq('id', id)
    .select('id, ticket_number, status, priority')
    .single() as any

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
