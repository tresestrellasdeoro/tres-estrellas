import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Site-wide temporary block — set to false (or revert this commit) to bring the site back
const MAINTENANCE_MODE = true

const MAINTENANCE_HEADERS = { 'Retry-After': '3600', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

const MAINTENANCE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Tres Estrellas de Oro | Sitio temporalmente no disponible</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; background: #0a1628; color: #e2e8f0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; text-align: center; }
  main { max-width: 480px; }
  img { width: 160px; height: auto; margin-bottom: 28px; }
  h1 { margin: 0 0 12px; font-size: 26px; line-height: 1.25; color: #f0b429; }
  p { margin: 0 0 12px; font-size: 16px; line-height: 1.5; }
  .en { margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(226, 232, 240, .15); font-size: 14px; opacity: .75; }
  a { color: #f0b429; font-weight: 600; text-decoration: none; white-space: nowrap; }
</style>
</head>
<body>
<main>
  <img src="/logo.png" alt="Tres Estrellas de Oro">
  <h1>Sitio temporalmente no disponible</h1>
  <p>Nuestro sitio web no está disponible por el momento. Volveremos pronto.</p>
  <p>Para información sobre tu viaje, llama al <a href="tel:+18003378745">1 800 337-8745</a>.</p>
  <p class="en">Our website is temporarily unavailable. For trip information, call <a href="tel:+18003378745">1 800 337-8745</a>.</p>
</main>
</body>
</html>`

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
    const secret = process.env.ADMIN_SESSION_SECRET
    if (!secret) return false
    const decoded   = atob(sessionValue)
    const lastColon = decoded.lastIndexOf(':')
    if (lastColon < 0) return false
    const payload   = decoded.substring(0, lastColon)
    const sig       = decoded.substring(lastColon + 1)
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

  // Vercel crons stay up (they require CRON_SECRET) so QuickBooks tokens and the legacy sync keep running
  if (MAINTENANCE_MODE && !pathname.startsWith('/api/cron/')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Servicio temporalmente no disponible' }, { status: 503, headers: MAINTENANCE_HEADERS })
    }
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: { ...MAINTENANCE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const protectedCustomer  = pathname.startsWith('/dashboard') || pathname.startsWith('/mis-tickets') || pathname.startsWith('/puntos') || pathname.startsWith('/perfil')
  const protectedAdmin      = pathname.startsWith('/admin')
  const protectedDriver     = pathname.startsWith('/conductor')
  const protectedStaff      = pathname.startsWith('/personal')
  const protectedDeveloper  = pathname.startsWith('/developer')
  // /auth/redirect is the post-login router — allow authenticated users through
  const authPages           = pathname.startsWith('/auth') && pathname !== '/auth/redirect'

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
