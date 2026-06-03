'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function adminLogin(prevState: { error: string }, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (
    email    === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')
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
