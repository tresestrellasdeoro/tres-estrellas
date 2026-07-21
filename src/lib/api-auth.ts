import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Returns a 401/403 NextResponse if caller is not an admin, or null if allowed. */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const sessionValue = req.cookies.get('admin_session')?.value
  if (sessionValue) {
    try {
      const decoded = Buffer.from(sessionValue, 'base64').toString('utf-8')
      if (decoded.startsWith((process.env.ADMIN_EMAIL ?? '') + ':')) return null
    } catch {
      // Invalid base64 — fall through to Supabase auth
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await svc()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  const adminRoles = ['admin', 'super_admin', 'developer']
  if (!adminRoles.includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  return null
}

/** Returns a 401/403 NextResponse if caller is not a developer, or null if allowed. */
export async function requireDeveloper(req: NextRequest): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await svc()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  if (profile?.role !== 'developer') {
    return NextResponse.json({ error: 'Solo para developers' }, { status: 403 })
  }
  return null
}

/** Returns a 401 NextResponse if caller has no active session, or null if allowed. */
export async function requireAuth(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return null
}
