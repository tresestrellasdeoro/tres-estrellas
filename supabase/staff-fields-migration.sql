-- Add staff-specific fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sucursal_id  UUID REFERENCES sucursales(id),
  ADD COLUMN IF NOT EXISTS departamento TEXT,
  ADD COLUMN IF NOT EXISTS permisos     TEXT[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
