import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

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
    return timingSafeEqual(sigBuf, expBuf) && payload.startsWith((process.env.ADMIN_EMAIL ?? '') + ':')
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const protectedCustomer   = pathname.startsWith('/dashboard') || pathname.startsWith('/mis-tickets') || pathname.startsWith('/puntos') || pathname.startsWith('/perfil')
  const protectedAdmin      = pathname.startsWith('/admin')
  const protectedDriver     = pathname.startsWith('/conductor')
  const protectedStaff      = pathname.startsWith('/personal')
  const protectedDeveloper  = pathname.startsWith('/developer')
  const authPages           = pathname.startsWith('/auth')

  // Allow admin with local session cookie (HMAC-verified)
  const isValidAdminSession = verifyAdminSession(request.cookies.get('admin_session')?.value)
  if (isValidAdminSession && protectedAdmin) {
    return NextResponse.next({ request })
  }

  // Try Supabase auth
  let supabaseResponse = NextResponse.next({ request })
  let user = null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasRealSupabase = supabaseUrl && !supabaseUrl.includes('tu-proyecto')

  if (hasRealSupabase) {
    try {
      const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      })
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Supabase not reachable — continue without it
    }
  }

  if (!user && !isValidAdminSession && (protectedCustomer || protectedAdmin || protectedDriver || protectedStaff || protectedDeveloper)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && authPages) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
