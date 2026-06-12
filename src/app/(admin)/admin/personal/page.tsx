import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Users, UserPlus } from 'lucide-react'
import { CreateStaffForm } from './create-staff-form'

export const metadata = { title: 'Personal — Admin' }

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const ROLE_LABELS: Record<string, string> = {
  cajero: '💰 Cajero',
  admin:  '⚙️ Admin',
}
const ROLE_COLORS: Record<string, string> = {
  cajero: 'bg-blue-50 text-blue-700',
  admin:  'bg-purple-50 text-purple-700',
}

export default async function PersonalPage() {
  const service = getService()

  const { data: staff } = await service
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .in('role', ['cajero', 'admin'])
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#c01515]" />
            Personal
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona cajeros de taquilla. Solo el admin puede crear usuarios de personal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Staff list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Usuarios de personal</h2>
            <span className="text-xs text-slate-400">{staff?.length ?? 0} usuarios</span>
          </div>
          {!staff || staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">Sin personal registrado</p>
              <p className="text-slate-300 text-sm">Crea el primer cajero con el formulario.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {staff.map(u => (
                <div key={u.id} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                    {u.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{u.full_name}</p>
                    <p className="text-slate-400 text-xs truncate">{u.email}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-500'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create form */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
              <UserPlus className="w-5 h-5 text-[#c01515]" />
              Crear usuario
            </h2>
            <CreateStaffForm />
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-blue-800 text-xs font-bold mb-1">Acceso del personal</p>
            <p className="text-blue-600 text-xs leading-relaxed">
              Los cajeros inician sesión en <span className="font-mono font-bold">/personal</span> con su correo y contraseña. Solo ven el validador de boletos y las reservaciones del día.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
