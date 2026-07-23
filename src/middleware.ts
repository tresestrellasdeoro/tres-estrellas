import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Web Crypto HMAC-SHA256 — works in Next.js Edge Runtime (no Node.js crypto needed)
async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Timing-safe string comparison (Edge-compatible)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyAdminSession(sessionValue: string | undefined): Promise<boolean> {
  if (!sessionValue) return false
  try {
    const decoded   = atob(sessionValue)
    const lastColon = decoded.lastIndexOf(':')
    if (lastColon < 0) return false
    const payload   = decoded.substring(0, lastColon)
    const sig       = decoded.substring(lastColon + 1)
    const secret    = process.env.ADMIN_SESSION_SECRET ?? 'tres-estrellas-secret-2026'
    const expected  = await hmacHex(secret, payload)
    if (!safeEqual(sig, expected)) return false
    if (!payload.startsWith((process.env.ADMIN_EMAIL ?? '') + ':')) return false
    const parts     = payload.split(':')
    const timestamp = parseInt(parts[parts.length - 1], 10)
    if (isNaN(timestamp) || Date.now() - timestamp > SESSION_MAX_AGE_MS) return false
    return true
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
  const isValidAdminSession = await verifyAdminSession(request.cookies.get('admin_session')?.value)
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
