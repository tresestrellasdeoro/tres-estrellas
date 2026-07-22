import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — mark a stop as departed for today's trip
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { schedule_id, stop_id, stop_order, notes } = await req.json()
  if (!schedule_id || !stop_id || stop_order === undefined) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const db    = service()

  const { data, error } = await (db as any)
    .from('trip_stop_logs')
    .upsert(
      {
        schedule_id,
        trip_date:   today,
        stop_id,
        stop_order,
        departed_at: new Date().toISOString(),
        notes:       notes ?? null,
        created_by:  user?.id ?? null,
      },
      { onConflict: 'schedule_id,trip_date,stop_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

// DELETE — undo a stop departure for today's trip
export async function DELETE(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const { schedule_id, stop_id } = await req.json()
  if (!schedule_id || !stop_id) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 422 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const db    = service()

  const { error } = await (db as any)
    .from('trip_stop_logs')
    .delete()
    .eq('schedule_id', schedule_id)
    .eq('trip_date', today)
    .eq('stop_id', stop_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
