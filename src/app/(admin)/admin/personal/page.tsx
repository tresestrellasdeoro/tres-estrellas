import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Users, UserPlus } from 'lucide-react'
import { CreateStaffForm } from './create-staff-form'
import { DeleteStaffButton } from './delete-staff-button'
import { EditStaffButton } from './edit-staff-modal'

export const metadata = { title: 'Personal — Admin' }
export const dynamic = 'force-dynamic'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const ROLE_LABELS: Record<string, string> = {
  cajero:      'Cajero',
  admin:       'Administrador',
  super_admin: 'Super Admin',
}
const ROLE_COLORS: Record<string, string> = {
  cajero:      'bg-blue-50 text-blue-700',
  admin:       'bg-purple-50 text-purple-700',
  super_admin: 'bg-red-50 text-red-700',
}

const PERMISO_LABELS: Record<string, string> = {
  ventas:   'Ventas',
  checkin:  'Check-in',
  reportes: 'Reportes',
  paquetes: 'Paquetes',
  clientes: 'Clientes',
  personal: 'Personal',
  all:      'Acceso total',
}

export default async function PersonalPage() {
  const service = getService()

  const [{ data: staff }, { data: sucursales }] = await Promise.all([
    service
      .from('profiles')
      .select('id, full_name, email, role, departamento, permisos, sucursal_id, sucursales(name, code)')
      .in('role', ['cajero', 'admin', 'super_admin'])
      .order('created_at', { ascending: false }),
    service
      .from('sucursales')
      .select('id, name, code')
      .eq('active', true)
      .order('name'),
  ])

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-2xl text-[#0a1628] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#c01515]" />
            Personal
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona usuarios del sistema por sucursal y departamento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Staff list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Usuarios registrados</h2>
            <span className="text-xs text-slate-400">{staff?.length ?? 0} usuarios</span>
          </div>

          {!staff || staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">Sin personal registrado</p>
              <p className="text-slate-300 text-sm">Crea el primer usuario con el formulario.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {staff.map((u: any) => {
                const permisos: string[] = u.permisos ?? []
                const isAll = permisos.includes('all')
                const sucursal = u.sucursales

                return (
                  <div key={u.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 mt-0.5">
                        {u.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{u.full_name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-500'}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 truncate">{u.email}</p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {sucursal && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0a1e42]/8 text-[#0a1e42]">
                              📍 {sucursal.name}
                            </span>
                          )}
                          {u.departamento && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {u.departamento}
                            </span>
                          )}
                        </div>

                        {permisos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {isAll ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Acceso total
                              </span>
                            ) : (
                              permisos.map(p => (
                                <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                                  {PERMISO_LABELS[p] || p}
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <EditStaffButton
                          user={{ id: u.id, full_name: u.full_name ?? u.email, email: u.email, role: u.role, sucursal_id: u.sucursal_id, departamento: u.departamento, permisos: u.permisos ?? [] }}
                          sucursales={sucursales ?? []}
                        />
                        <DeleteStaffButton userId={u.id} name={u.full_name ?? u.email} />
                      </div>
                    </div>
                  </div>
                )
              })}
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
            <CreateStaffForm sucursales={sucursales ?? []} />
          </div>
        </div>

      </div>
    </div>
  )
}
