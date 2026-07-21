import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { cookies } from 'next/headers'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveSender() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await svc().from('profiles').select('full_name').eq('id', user.id).maybeSingle() as any
    return { id: user.id as string | null, name: profile?.full_name ?? 'Developer' }
  }
  // admin_session fallback
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (session) {
    try {
      const decoded = Buffer.from(session, 'base64').toString('utf-8')
      const adminEmail = process.env.ADMIN_EMAIL ?? ''
      if (decoded.startsWith(adminEmail + ':')) {
        return { id: null as string | null, name: adminEmail }
      }
    } catch { /* ignore */ }
  }
  return { id: null as string | null, name: 'Developer' }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { id } = await params

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 422 })

  const sender = await resolveSender()
  const service = svc()

  const { data, error } = await service
    .from('support_messages')
    .insert({
      ticket_id:    id,
      sender_id:    sender.id,
      sender_name:  sender.name,
      message:      message.trim(),
      is_developer: true,
    })
    .select('id, sender_name, message, is_developer, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark ticket as in-review when developer first replies
  await service.from('support_tickets').update({ status: 'en_revision' }).eq('id', id).eq('status', 'abierta')

  return NextResponse.json(data, { status: 201 })
}
