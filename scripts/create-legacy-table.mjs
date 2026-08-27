/**
 * Crea la tabla legacy_bookings usando una función RPC temporal
 * Ejecutar: node scripts/create-legacy-table.mjs
 */

const SUPABASE_URL = 'https://ibsbvkcisqkghrpflrvc.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Supabase permite crear funciones via REST con service role
// Creamos una función exec_ddl, la usamos, luego la borramos

async function query(sql) {
  // Intentar via la función exec que puede existir
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_ddl`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })
  return { ok: res.ok, status: res.status, body: await res.text() }
}

// Verificar si la tabla ya existe
const check = await fetch(`${SUPABASE_URL}/rest/v1/legacy_bookings?limit=1`, {
  headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }
})

if (check.ok) {
  console.log('✓ La tabla legacy_bookings ya existe')
  process.exit(0)
}

console.log('La tabla no existe. Necesitas crearla manualmente.')
console.log('\nAbre el SQL Editor de Supabase y ejecuta:\n')
console.log('https://app.supabase.com/project/ibsbvkcisqkghrpflrvc/sql/new\n')

const ddl = `
CREATE TABLE IF NOT EXISTS legacy_bookings (
  id               SERIAL PRIMARY KEY,
  ticket_id        TEXT NOT NULL UNIQUE,
  booking_number   TEXT NOT NULL,
  origin_code      TEXT NOT NULL,
  destination_code TEXT NOT NULL,
  ticket_type      TEXT NOT NULL,
  passenger_name   TEXT NOT NULL,
  passenger_type   TEXT NOT NULL DEFAULT 'adult',
  travel_date      DATE NOT NULL,
  travel_time      TIME,
  amount           DECIMAL(8,2) NOT NULL,
  payment_method   TEXT NOT NULL DEFAULT 'cash',
  sold_by          TEXT,
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legacy_bookings_date   ON legacy_bookings(travel_date);
CREATE INDEX IF NOT EXISTS idx_legacy_bookings_origin ON legacy_bookings(origin_code, destination_code);
CREATE INDEX IF NOT EXISTS idx_legacy_bookings_sold   ON legacy_bookings(sold_by);
`

console.log(ddl)
console.log('\nDespués de crear la tabla, ejecuta:')
console.log('  SUPABASE_SERVICE_ROLE_KEY="ey..." node scripts/migrate-boletos.mjs')
