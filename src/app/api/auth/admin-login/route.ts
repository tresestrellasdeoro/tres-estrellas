import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const MAX_ATTEMPTS = 10
const WINDOW_MS    = 15 * 60 * 1000

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? 'tres-estrellas-secret-2026'
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
