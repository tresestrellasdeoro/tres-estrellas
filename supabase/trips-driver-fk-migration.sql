-- Fix: trips.driver_id debe referenciar drivers(id), no profiles(id)
-- El módulo de Choferes usa una tabla separada 'drivers', no usuarios del sistema

-- Remover FK original a profiles
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;

-- Agregar FK correcta a la tabla drivers
ALTER TABLE trips
  ADD CONSTRAINT trips_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- Permitir que el service role asigne choferes a corridas
-- (la política de RLS ya cubre trips vía service role key)

NOTIFY pgrst, 'reload schema';
