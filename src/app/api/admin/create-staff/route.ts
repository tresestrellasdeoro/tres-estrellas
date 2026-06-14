import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['cajero']),
})

export async function POST(req: NextRequest) {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminCookie = req.cookies.get('admin_session')
  if (!adminCookie?.value && !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (user) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const { name, email, password, role } = parsed.data

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create auth user — do NOT pass role in metadata; the DB trigger may
  // cast it to user_role enum and 'cajero' won't exist until the ALTER TYPE runs.
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Error al crear usuario' }, { status: 500 })
  }

  const userId = authData.user.id

  // Try to update existing profile first (may have been created by a DB trigger)
  const { error: updateError } = await service
    .from('profiles')
    .update({ full_name: name, role, email })
    .eq('id', userId)

  if (updateError) {
    // No existing profile — insert minimal record
    const { error: insertError } = await service
      .from('profiles')
      .insert({ id: userId, email, full_name: name, role })

    if (insertError) {
      // Roll back auth user and return actual DB error
      await service.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Error al crear perfil: ${insertError.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, user_id: userId }, { status: 201 })
}
