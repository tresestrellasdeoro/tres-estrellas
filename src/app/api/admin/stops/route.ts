import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data, error } = await service()
    .from('stops')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stops: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, name, city, state, terminal_name, sort_order } = body

  if (!code || !name || !city || !state) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const { data, error } = await service()
    .from('stops')
    .insert({ code: code.toUpperCase(), name, city, state, terminal_name: terminal_name ?? null, sort_order: sort_order ?? 0, is_active: true })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stop: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { data, error } = await service()
    .from('stops')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stop: data })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { error } = await service().from('stops').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
