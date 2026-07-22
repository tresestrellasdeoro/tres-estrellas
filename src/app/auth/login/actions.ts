'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac } from 'crypto'

function signAdminToken(email: string): string {
  const payload = `${email}:${Date.now()}`
  const secret  = process.env.ADMIN_SESSION_SECRET ?? 'tres-estrellas-secret-2026'
  const sig     = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64')
}

export async function adminLogin(prevState: { error: string }, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (
    email    === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = signAdminToken(email)
    const cookieStore = await cookies()
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirect('/admin/dashboard')
  }

  return { error: 'Correo o contraseña incorrectos.' }
}
