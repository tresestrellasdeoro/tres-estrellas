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
    .from('pricing')
    .select(`
      *,
      route:routes(code, name),
      stop:stops!terminal_id(code, name)
    `)
    .order('route_id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pricing: data ?? [] })
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { route_id, terminal_id, passenger_type, ticket_type, price } = body

  if (!route_id || !terminal_id || !passenger_type || !ticket_type || price === undefined) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const { data, error } = await service()
    .from('pricing')
    .upsert(
      { route_id, terminal_id, passenger_type, ticket_type, price: Number(price) },
      { onConflict: 'route_id,terminal_id,passenger_type,ticket_type' }
    )
    .select(`
      *,
      route:routes(code, name),
      stop:stops!terminal_id(code, name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pricing: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body = await req.json()
  const { id, price } = body

  if (!id || price === undefined) return NextResponse.json({ error: 'Falta id o precio' }, { status: 422 })

  const { data, error } = await service()
    .from('pricing')
    .update({ price: Number(price) })
    .eq('id', id)
    .select(`
      *,
      route:routes(code, name),
      stop:stops!terminal_id(code, name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pricing: data })
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 422 })

  const { error } = await service().from('pricing').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
