import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminEmailFromSession } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { id: user.id as string | null, email: user.email ?? '' }

  const cookieStore  = await cookies()
  const adminEmail   = getAdminEmailFromSession(cookieStore.get('admin_session')?.value)
  if (adminEmail) {
    const { data: profile } = await svc().from('profiles').select('id').eq('email', adminEmail).maybeSingle() as any
    return { id: (profile?.id ?? null) as string | null, email: adminEmail }
  }
  return null
}

export async function GET() {
  const user = await resolveUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const service = svc()
  let q = service
    .from('support_tickets')
    .select('id, ticket_number, subject, category, priority, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (user.id) {
    q = q.eq('created_by', user.id)
  } else {
    // admin_session user without a profile row — match by email stored in creator_name
    q = q.eq('creator_name', user.email)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await resolveUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { subject, category, priority, description } = body
  if (!subject || !description) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const service = svc()

  let creatorName = user.email
  let creatorRole = 'admin'
  let sucursalId = null

  if (user.id) {
    const { data: profile } = await service.from('profiles').select('full_name, role, sucursal_id').eq('id', user.id).maybeSingle() as any
    creatorName = profile?.full_name ?? user.email
    creatorRole = profile?.role ?? 'admin'
    sucursalId  = profile?.sucursal_id ?? null
  }

  const { data, error } = await service
    .from('support_tickets')
    .insert({
      created_by:    user.id,
      creator_name:  creatorName,
      creator_role:  creatorRole,
      sucursal_id:   sucursalId,
      subject:       subject.trim(),
      category:      category ?? 'otro',
      priority:      priority ?? 'media',
      description:   description.trim(),
      ticket_number: '',
    })
    .select('id, ticket_number')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
