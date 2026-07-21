import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireDeveloper } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — developer sends a message on any ticket
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireDeveloper(req); if (deny) return deny
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 422 })

  const service = svc()

  const { data: profile } = await service.from('profiles').select('full_name').eq('id', user.id).maybeSingle() as any

  const { data, error } = await service
    .from('support_messages')
    .insert({
      ticket_id:   id,
      sender_id:   user.id,
      sender_name: profile?.full_name ?? 'Developer',
      message:     message.trim(),
      is_developer: true,
    })
    .select('id, sender_name, message, is_developer, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark ticket as in-review when developer first replies
  await service
    .from('support_tickets')
    .update({ status: 'en_revision' })
    .eq('id', id)
    .eq('status', 'abierta')

  return NextResponse.json(data, { status: 201 })
}
