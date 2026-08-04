import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// In-memory rate limiter: max 10 failed attempts per IP per 15 minutes
const failMap = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS  = 10
const WINDOW_MS     = 15 * 60 * 1000

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = failMap.get(ip)
  if (!entry || now > entry.resetAt) return false
  return entry.count >= MAX_ATTEMPTS
}

function recordFailure(ip: string): void {
  const now   = Date.now()
  const entry = failMap.get(ip)
  if (!entry || now > entry.resetAt) {
    failMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count++
  }
}

function clearFailures(ip: string): void {
  failMap.delete(ip)
}

function signAdminToken(email: string): string {
  const payload = `${email}:${Date.now()}`
  const secret  = process.env.ADMIN_SESSION_SECRET ?? 'tres-estrellas-secret-2026'
  const sig     = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64')
}

export async function POST(req: Request) {
  const ip   = getClientIp(req)
  const base = new URL(req.url).origin

  if (isRateLimited(ip)) {
    return NextResponse.redirect(`${base}/auth/login?error=2`, { status: 303 })
  }

  const formData = await req.formData()
  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)

  if (
    email    === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    clearFailures(ip)
    const token    = signAdminToken(email)
    const response = NextResponse.redirect(`${base}/admin/dashboard`, { status: 303 })
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    return response
  }

  recordFailure(ip)
  return NextResponse.redirect(`${base}/auth/login?error=1`, { status: 303 })
}
