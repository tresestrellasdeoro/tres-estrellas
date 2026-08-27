/**
 * migrate-empleados.mjs
 * Crea los empleados del sistema antiguo en Supabase Auth + profiles
 * Ejecutar: node scripts/migrate-empleados.mjs
 */

const SUPABASE_URL = 'https://ibsbvkcisqkghrpflrvc.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY. Ejecuta:')
  console.error('SUPABASE_SERVICE_ROLE_KEY="..." node scripts/migrate-empleados.mjs')
  process.exit(1)
}

// Empleados del sistema antiguo
// email = username@tresestrellasdeorobus.com (pueden cambiar su email/contraseña después)
const EMPLEADOS = [
  { username: 'ccueto',      full_name: 'Cecilia Cueto',      role: 'admin',   departamento: 'Gerencia',     sucursal: 'HUN' },
  { username: 'fduran',      full_name: 'Fabiola Duran',      role: 'admin',   departamento: 'Coordinacion', sucursal: 'HUN' },
  { username: 'webmaster',   full_name: 'Webmaster TEO',      role: 'admin',   departamento: 'Sistemas',     sucursal: 'HUN' },
  { username: 'scamacho',    full_name: 'S. Camacho',         role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'chernandez',  full_name: 'Cynthia Hernandez',  role: 'cajero',  departamento: 'Ventas',       sucursal: 'SYC' },
  { username: 'msandoval',   full_name: 'M. Sandoval',        role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'apinzon',     full_name: 'America Pinzon',     role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'cnegrete',    full_name: 'Carlos Negrete',     role: 'cajero',  departamento: 'Ventas',       sucursal: 'ATI' },
  { username: 'cochoa',      full_name: 'C. Ochoa',           role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'dcarrasco',   full_name: 'D. Carrasco',        role: 'cajero',  departamento: 'Ventas',       sucursal: 'SYC' },
  { username: 'dcueto',      full_name: 'D. Cueto',           role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'hmedina',     full_name: 'H. Medina',          role: 'cajero',  departamento: 'Ventas',       sucursal: 'OTY' },
  { username: 'azepeda',     full_name: 'Arturo Zepeda',      role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'abravo',      full_name: 'Ana Bravo',          role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'agarcia',     full_name: 'Alicia Garcia',      role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'arobles',     full_name: 'Angel Robles',       role: 'cajero',  departamento: 'Ventas',       sucursal: 'LAX' },
  { username: 'bgallegos',   full_name: 'Brenda Gallegos',    role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'cnava',       full_name: 'Cristobal Nava',     role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'ecastro',     full_name: 'E. Castro',          role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'ggarcia',     full_name: 'G. Garcia',          role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'margueta',    full_name: 'M. Argueta',         role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'obastos',     full_name: 'O. Bastos',          role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'Apacheco',    full_name: 'A. Pacheco',         role: 'cajero',  departamento: 'Ventas',       sucursal: 'LAX' },
  { username: 'Jgonzalez',   full_name: 'J. Gonzalez',        role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'larredondo',  full_name: 'Liliana Arredondo',  role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'aromero',     full_name: 'Alma Romero',        role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'aduran',      full_name: 'Araceli Duran',      role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'kjimenez',    full_name: 'Keycia Jimenez',     role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'mleon',       full_name: 'Maria Leon',         role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
  { username: 'kgutierrez',  full_name: 'Kevin Gutierrez',    role: 'cajero',  departamento: 'Ventas',       sucursal: 'HUN' },
]

async function createUser(emp) {
  const email    = `${emp.username.toLowerCase()}@tresestrellasdeorobus.com`
  const password = 'CambiarClave2026!'  // temporal — deben cambiarla

  // 1. Crear en Supabase Auth
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      apikey:         SERVICE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: emp.full_name },
    }),
  })

  const authData = await authRes.json()

  if (!authRes.ok) {
    if (authData.message?.includes('already')) {
      return { status: 'ya_existe', email }
    }
    return { status: 'error', email, error: authData.message }
  }

  const userId = authData.id

  // 2. Actualizar el perfil (el trigger ya lo crea, solo actualizamos role y campos extra)
  await new Promise(r => setTimeout(r, 300))  // espera el trigger

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization:  `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        apikey:         SERVICE_KEY,
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({
        role:         emp.role,
        departamento: emp.departamento,
      }),
    }
  )

  if (!profileRes.ok) {
    const err = await profileRes.text()
    return { status: 'perfil_error', email, error: err }
  }

  return { status: 'creado', email }
}

async function main() {
  console.log(`\nMigrando ${EMPLEADOS.length} empleados a Supabase...\n`)

  const results = { creados: [], ya_existen: [], errores: [] }

  for (const emp of EMPLEADOS) {
    const result = await createUser(emp)
    if (result.status === 'creado') {
      results.creados.push(result.email)
      console.log(`  ✓ ${result.email}`)
    } else if (result.status === 'ya_existe') {
      results.ya_existen.push(result.email)
      console.log(`  → ${result.email} (ya existe)`)
    } else {
      results.errores.push(`${result.email}: ${result.error}`)
      console.log(`  ✗ ${result.email}: ${result.error}`)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`
========================================
RESUMEN
========================================
✓ Creados:      ${results.creados.length}
→ Ya existían:  ${results.ya_existen.length}
✗ Errores:      ${results.errores.length}

Contraseña temporal: CambiarClave2026!
Los empleados pueden cambiar su clave en:
  /mi-cuenta o con "Olvidé mi contraseña"
`)
}

main().catch(console.error)
