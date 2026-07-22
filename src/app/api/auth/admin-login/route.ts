import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

function signAdminToken(email: string): string {
  const payload = `${email}:${Date.now()}`
  const secret  = process.env.ADMIN_SESSION_SECRET ?? 'tres-estrellas-secret-2026'
  const sig     = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64')
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)

  const base = new URL(req.url).origin

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
    return response
  }

  return NextResponse.redirect(`${base}/auth/login?error=1`, { status: 303 })
}
