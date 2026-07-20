import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const Schema = z.object({
  name:      z.string().min(2),
  phone:     z.string().optional().nullable(),
  license:   z.string().optional().nullable(),
  notes:     z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { data, error } = await svc().from('drivers').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drivers: data ?? [] })
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { data, error } = await svc().from('drivers').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ driver: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })
  const parsed = Schema.partial().safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { data, error } = await svc().from('drivers').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ driver: data })
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })
  const { error } = await svc().from('drivers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
