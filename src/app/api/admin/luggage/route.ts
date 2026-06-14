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
    .from('luggage_types')
    .select('*')
    .order('extra_fee', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ luggage: data ?? [] })
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { name, description, max_weight_lbs, extra_fee } = body

  if (!name || max_weight_lbs === undefined || extra_fee === undefined) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const { data, error } = await service()
    .from('luggage_types')
    .insert({ name, description: description ?? null, max_weight_lbs: Number(max_weight_lbs), extra_fee: Number(extra_fee), is_active: true })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ luggage: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { data, error } = await service()
    .from('luggage_types')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ luggage: data })
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { error } = await service().from('luggage_types').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
