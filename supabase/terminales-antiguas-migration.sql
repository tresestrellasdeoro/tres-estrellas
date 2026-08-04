-- Agrega las 5 terminales del sistema antiguo que no están en el nuevo sistema
-- Ejecutar en Supabase SQL Editor
-- Las 9 existentes (HP, LAX, SYC, FAT, SNA, ARTIC, ELP, OTY, PHOE) no se modifican

INSERT INTO sucursales (name, code, city, active) VALUES
  ('Aeropuerto de Tijuana', 'ATI',  'Tijuana, B.C.',        true),
  ('Anaheim',               'AHM',  'Anaheim, CA',           true),
  ('Sacramento',            'SAC',  'Sacramento, CA',        true),
  ('Linea Tijuana',         'LTI',  'Tijuana, B.C.',         true),
  ('Cross Border Xpress',   'CBX',  'San Diego / Tijuana',   true)
ON CONFLICT (code) DO UPDATE SET active = true;

-- Nota: Huntington Park existe como código "HP" (no "HUN")
-- Nota: Phoenix existe como código "PHOE" (no "PHX")
-- Si quieres que aparezcan con los códigos del sistema antiguo,
-- descomenta las líneas de abajo:
-- INSERT INTO sucursales (name, code, city, active) VALUES
--   ('Huntington Park', 'HUN', 'Huntington Park, CA', true),
--   ('Phoenix',         'PHX', 'Phoenix, AZ',          true)
-- ON CONFLICT (code) DO NOTHING;

-- También asegura que todas las sucursales existentes estén activas
UPDATE sucursales SET active = true WHERE active = false;

NOTIFY pgrst, 'reload schema';
