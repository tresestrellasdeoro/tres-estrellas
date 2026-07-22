import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function verifyAdminSession(sessionValue: string | undefined): boolean {
  if (!sessionValue) return false
  try {
    const decoded   = Buffer.from(sessionValue, 'base64').toString('utf-8')
    const lastColon = decoded.lastIndexOf(':')
    if (lastColon < 0) return false
    const payload   = decoded.substring(0, lastColon)
    const sig       = decoded.substring(lastColon + 1)
    const secret    = process.env.ADMIN_SESSION_SECRET ?? 'tres-estrellas-secret-2026'
    const expected  = createHmac('sha256', secret).update(payload).digest('hex')
    const sigBuf    = Buffer.from(sig,      'hex')
    const expBuf    = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false
    if (!payload.startsWith((process.env.ADMIN_EMAIL ?? '') + ':')) return false
    // Verify token age — payload is "email:timestamp"
    const parts     = payload.split(':')
    const timestamp = parseInt(parts[parts.length - 1], 10)
    if (isNaN(timestamp) || Date.now() - timestamp > SESSION_MAX_AGE_MS) return false
    return true
  } catch {
    return false
  }
}

/** Returns a 401/403 NextResponse if caller is not an admin, or null if allowed. */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (verifyAdminSession(req.cookies.get('admin_session')?.value)) return null

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

/** Returns a 401/403 NextResponse if caller is not an active staff member (cajero, admin, super_admin, developer), or null if allowed. */
export async function requireStaff(req?: NextRequest): Promise<NextResponse | null> {
  if (req && verifyAdminSession(req.cookies.get('admin_session')?.value)) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await svc()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string } | null }

  const staffRoles = ['cajero', 'admin', 'super_admin', 'developer']
  if (!staffRoles.includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Solo para personal autorizado' }, { status: 403 })
  }
  return null
}
