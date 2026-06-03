import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session     = cookieStore.get('admin_session')

  if (!session?.value) {
    redirect('/auth/login?next=/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar />
      <main className="flex-1 ml-0 lg:ml-64 min-h-screen">{children}</main>
    </div>
  )
}
