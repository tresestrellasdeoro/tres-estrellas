/**
 * migrate-boletos.mjs
 * Migra los 17,748 boletos del sistema antiguo a Supabase legacy_bookings
 *
 * Paso 1 — ejecutar PRIMERO en el SQL Editor de Supabase:
 *   CREATE TABLE IF NOT EXISTS legacy_bookings (
 *     id               SERIAL PRIMARY KEY,
 *     ticket_id        TEXT NOT NULL UNIQUE,
 *     booking_number   TEXT NOT NULL,
 *     origin_code      TEXT NOT NULL,
 *     destination_code TEXT NOT NULL,
 *     ticket_type      TEXT NOT NULL,
 *     passenger_name   TEXT NOT NULL,
 *     passenger_type   TEXT NOT NULL DEFAULT 'adult',
 *     travel_date      DATE NOT NULL,
 *     travel_time      TIME,
 *     amount           DECIMAL(8,2) NOT NULL,
 *     payment_method   TEXT NOT NULL DEFAULT 'cash',
 *     sold_by          TEXT,
 *     imported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_legacy_bookings_date   ON legacy_bookings(travel_date);
 *   CREATE INDEX IF NOT EXISTS idx_legacy_bookings_origin ON legacy_bookings(origin_code, destination_code);
 *   CREATE INDEX IF NOT EXISTS idx_legacy_bookings_sold   ON legacy_bookings(sold_by);
 *
 * Paso 2 — ejecutar este script:
 *   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/migrate-boletos.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath }  from 'url'
import { dirname, join }  from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://ibsbvkcisqkghrpflrvc.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY')
  console.error('Ejecuta: SUPABASE_SERVICE_ROLE_KEY="ey..." node scripts/migrate-boletos.mjs')
  process.exit(1)
}

// ── Carga datos de boletos ──────────────────────────────────────
const boletosPath = join(__dir, '../scripts/boletos-data.json')
let boletos
try {
  boletos = JSON.parse(readFileSync(boletosPath, 'utf8'))
} catch {
  console.error('No se encontró scripts/boletos-data.json')
  console.error('Regeneralo con: node scripts/extract-boletos.mjs')
  process.exit(1)
}

// ── Conversión de datos ─────────────────────────────────────────
const MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12}

const PRICES = {
  'HUN-LTI': [45,40], 'HUN-ATI': [55,50], 'HUN-SYC': [45,40],
  'HUN-CAT': [55,50], 'HUN-ELP': [80,70],
  'SYC-HUN': [45,40], 'ATI-HUN': [55,50], 'LAX-SYC': [45,40],
  'LAX-ATI': [55,50], 'SYC-LAX': [45,40], 'OTY-HUN': [50,45],
  'ATI-LAX': [55,50], 'SYC-ATI': [10,8],  'OTY-LAX': [55,50],
  'OTY-SYC': [10,8],  'LTI-HUN': [45,40], 'SYC-CAT': [10,8],
  'LAX-LTI': [55,50], 'LAX-CAT': [55,50],
}

function parseDate(d) {
  if (!d) return null
  const [mon, day, yr] = d.trim().split(' ')
  const m = MONTHS[mon]
  if (!m) return null
  return `${2000 + parseInt(yr)}-${String(m).padStart(2,'0')}-${String(parseInt(day)).padStart(2,'0')}`
}

function parseTime(t) {
  if (!t) return null
  const [hhmm, period] = t.trim().split(' ')
  let [hh, mm] = hhmm.split(':').map(Number)
  if (period === 'PM' && hh !== 12) hh += 12
  if (period === 'AM' && hh === 12) hh = 0
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`
}

const records = boletos.map(ticket => {
  const [ticket_id, nombre, origen, destino, tipo, trip_type, fecha, hora, cajero] = ticket
  const travel_date = parseDate(fecha)
  if (!travel_date) return null

  const tt  = trip_type === 'R/T' ? 'round_trip' : 'one_way'
  const key = `${origen}-${destino}`
  const [ap, mp] = PRICES[key] || [50, 45]
  let amount = tipo === 'Adulto' ? ap : mp
  if (tt === 'round_trip') amount = Math.round(amount * 2 * 0.75 * 100) / 100

  return {
    ticket_id,
    booking_number:   `TEO${ticket_id}`,
    origin_code:      origen,
    destination_code: destino,
    ticket_type:      tt,
    passenger_name:   nombre,
    passenger_type:   tipo === 'Adulto' ? 'adult' : 'child',
    travel_date,
    travel_time:      parseTime(hora),
    amount,
    payment_method:   'cash',
    sold_by:          cajero,
  }
}).filter(Boolean)

console.log(`\nBoletos preparados: ${records.length}`)

// ── Insertar en batches ─────────────────────────────────────────
const BATCH = 200
let inserted = 0, skipped = 0, errors = 0

for (let i = 0; i < records.length; i += BATCH) {
  const chunk = records.slice(i, i + BATCH)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/legacy_bookings`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${SERVICE_KEY}`,
      apikey:         SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer:         'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(chunk),
  })

  if (res.ok) {
    inserted += chunk.length
  } else {
    const err = await res.text()
    // Si la tabla no existe, salir con instrucciones
    if (err.includes('legacy_bookings')) {
      console.error('\n✗ La tabla legacy_bookings no existe en Supabase.')
      console.error('Ejecuta primero el PASO 1 del script (CREATE TABLE) en el SQL Editor de Supabase.')
      console.error('URL: https://app.supabase.com/project/ibsbvkcisqkghrpflrvc/sql/new\n')
      process.exit(1)
    }
    console.error(`  Error en lote ${Math.floor(i/BATCH)+1}: ${err.slice(0,120)}`)
    errors += chunk.length
  }

  if ((i / BATCH) % 10 === 0) {
    process.stdout.write(`  ${inserted}/${records.length} insertados...\r`)
  }
}

console.log(`\n\n========================================`)
console.log(`RESULTADO MIGRACIÓN BOLETOS`)
console.log(`========================================`)
console.log(`✓ Insertados:  ${inserted}`)
console.log(`→ Duplicados:  ${skipped} (ignorados)`)
console.log(`✗ Errores:     ${errors}`)
console.log(`\nVerifica en Supabase:`)
console.log(`  SELECT COUNT(*) FROM legacy_bookings;`)
