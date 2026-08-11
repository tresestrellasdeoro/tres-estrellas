import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const MAX_ATTEMPTS = 10
const WINDOW_MS    = 15 * 60 * 1000 // 15 minutes

// IP-based rate limiting via Upstash Redis REST API (no npm package needed).
// Falls back gracefully to cookie-only limiting if env vars are not set.
async function checkIpRateLimit(ip: string): Promise<boolean> {
  const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!upstashUrl || !upstashToken) return false  // not configured — skip

  const windowSlot = Math.floor(Date.now() / WINDOW_MS)
  const key = `admin-login:${ip}:${windowSlot}`

  try {
    const res = await fetch(`${upstashUrl}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, Math.ceil(WINDOW_MS / 1000)],
      ]),
    })
    const data  = await res.json()
    const count = data?.[0]?.result ?? 0
    return count > MAX_ATTEMPTS
  } catch {
    return false  // on Upstash error, don't block — fail open
  }
}

async function resetIpRateLimit(ip: string): Promise<void> {
  const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!upstashUrl || !upstashToken) return
  const windowSlot = Math.floor(Date.now() / WINDOW_MS)
  const key = `admin-login:${ip}:${windowSlot}`
  try {
    await fetch(`${upstashUrl}/del/${key}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    })
  } catch { /* best-effort */ }
}

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error('ADMIN_SESSION_SECRET no configurado')
  return s
}

function signAdminToken(email: string): string {
  const payload = `${email}:${Date.now()}`
  const sig     = createHmac('sha256', secret()).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64')
}

// Stateless rate limiter via signed cookie — survives serverless cold starts.
// Attacker can clear the cookie, but cannot forge a lower count (signature).
function readFailCookie(cookieValue: string | undefined): { count: number; resetAt: number } {
  if (!cookieValue) return { count: 0, resetAt: 0 }
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString()
    const lastColon = decoded.lastIndexOf(':')
    const data = decoded.substring(0, lastColon)
    const sig  = decoded.substring(lastColon + 1)
    const expected = createHmac('sha256', secret()).update(data).digest('hex')
    if (sig !== expected) return { count: 0, resetAt: 0 }
    const [countStr, resetAtStr] = data.split(':')
    return { count: parseInt(countStr, 10) || 0, resetAt: parseInt(resetAtStr, 10) || 0 }
  } catch {
    return { count: 0, resetAt: 0 }
  }
}

function makeFailCookie(count: number, resetAt: number): string {
  const data = `${count}:${resetAt}`
  const sig  = createHmac('sha256', secret()).update(data).digest('hex')
  return Buffer.from(`${data}:${sig}`).toString('base64')
}

export async function POST(req: Request) {
  const base = new URL(req.url).origin

  // Layer 1 — IP rate limit (Upstash, if configured)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip')
          ?? 'unknown'
  const ipLimited = await checkIpRateLimit(ip)
  if (ipLimited) {
    return NextResponse.redirect(`${base}/auth/login?error=2`, { status: 303 })
  }

  // Layer 2 — cookie rate limit (stateless fallback, always active)
  const incomingCookies = req.headers.get('cookie') ?? ''
  const failCookieRaw   = incomingCookies.match(/(?:^|;\s*)_af=([^;]+)/)?.[1]
  const now = Date.now()
  let { count, resetAt } = readFailCookie(failCookieRaw)
  if (now > resetAt) { count = 0; resetAt = now + WINDOW_MS }
  if (count >= MAX_ATTEMPTS) {
    return NextResponse.redirect(`${base}/auth/login?error=2`, { status: 303 })
  }

  const formData = await req.formData()
  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)

  if (
    email    === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token    = signAdminToken(email)
    const response = NextResponse.redirect(`${base}/admin/dashboard`, { status: 303 })
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    response.cookies.set('_af', '', { maxAge: 0, path: '/' })
    await resetIpRateLimit(ip)
    return response
  }

  const response = NextResponse.redirect(`${base}/auth/login?error=1`, { status: 303 })
  response.cookies.set('_af', makeFailCookie(count + 1, resetAt), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   Math.ceil(WINDOW_MS / 1000),
    path:     '/',
  })
  return response
}
