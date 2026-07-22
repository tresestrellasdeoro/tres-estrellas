-- ============================================================
-- TEO — Roles y paradas correctas
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Agregar roles faltantes al ENUM user_role
--    (los valores de ENUM no se pueden agregar si ya existen, el IF NOT EXISTS
--     no está disponible en Postgres para ADD VALUE, así que usamos DO blocks)

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'cajero';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'developer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Corrección de stop codes: el sistema usa SYS/TIJ/OTY (bus-config.ts)
--    El schema.sql original tenía LTI/ATI/CAT que eran placeholders incorrectos.
--    Este script actualiza los códigos si la BD ya fue inicializada con el schema viejo.

UPDATE stops SET code = 'SYS', name = 'San Ysidro', terminal_name = 'San Ysidro Border Crossing'
  WHERE code = 'LTI';

UPDATE stops SET code = 'TIJ', name = 'Aeropuerto Tijuana', city = 'Tijuana', state = 'BC',
  terminal_name = 'Aeropuerto Internacional de Tijuana'
  WHERE code = 'ATI';

UPDATE stops SET code = 'OTY', name = 'Garita de Otay', city = 'Tijuana', state = 'BC',
  terminal_name = 'Garita de Otay / Otay Mesa Port of Entry'
  WHERE code = 'CAT';

-- 3. Agregar parada HP (Huntington Park) si faltara
INSERT INTO stops (code, name, city, state, address, terminal_name, sort_order)
  VALUES ('HP', 'Huntington Park', 'Huntington Park', 'CA',
          '7054 Pacific Blvd, Huntington Park, CA 90255', 'Taquilla Huntington Park', 2)
  ON CONFLICT (code) DO NOTHING;

-- 4. Actualizar rutas para reflejar los nuevos códigos
UPDATE routes SET code = 'LA-SYS', name = 'Los Angeles → San Ysidro'
  WHERE code = 'LA-LTI';

UPDATE routes SET code = 'LA-TIJ', name = 'Los Angeles → Aeropuerto Tijuana'
  WHERE code = 'LA-ATI';

UPDATE routes SET code = 'LA-OTY', name = 'Los Angeles → Garita de Otay'
  WHERE code = 'LA-CAT';

-- 5. Agregar columnas faltantes en bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS origin_name      TEXT,
  ADD COLUMN IF NOT EXISTS destination_name TEXT,
  ADD COLUMN IF NOT EXISTS departure_time   TEXT;

NOTIFY pgrst, 'reload schema';
