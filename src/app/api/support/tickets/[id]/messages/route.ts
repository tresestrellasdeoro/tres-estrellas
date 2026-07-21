import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { id: user.id, email: user.email ?? '' }

  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (session) {
    try {
      const decoded = Buffer.from(session, 'base64').toString('utf-8')
      const adminEmail = process.env.ADMIN_EMAIL ?? ''
      if (decoded.startsWith(adminEmail + ':')) {
        const { data: profile } = await svc().from('profiles').select('id').eq('email', adminEmail).maybeSingle() as any
        if (profile?.id) return { id: profile.id, email: adminEmail }
      }
    } catch { /* ignore */ }
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await resolveUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const service = svc()
  const { data: ticket } = await service.from('support_tickets').select('id').eq('id', id).eq('created_by', user.id).maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data, error } = await service
    .from('support_messages')
    .select('id, sender_name, message, is_developer, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await resolveUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const service = svc()
  const { data: ticket } = await service.from('support_tickets').select('id, status').eq('id', id).eq('created_by', user.id).maybeSingle() as any
  if (!ticket) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (ticket.status === 'cerrada') return NextResponse.json({ error: 'El ticket está cerrado' }, { status: 409 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 422 })

  const { data: profile } = await service.from('profiles').select('full_name').eq('id', user.id).maybeSingle() as any

  const { data, error } = await service
    .from('support_messages')
    .insert({ ticket_id: id, sender_id: user.id, sender_name: profile?.full_name ?? 'Usuario', message: message.trim(), is_developer: false })
    .select('id, sender_name, message, is_developer, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ticket.status === 'solucionada') {
    await service.from('support_tickets').update({ status: 'en_revision' }).eq('id', id)
  }

  return NextResponse.json(data, { status: 201 })
}
