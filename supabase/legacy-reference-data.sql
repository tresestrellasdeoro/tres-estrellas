-- ================================================================
-- DATOS DE REFERENCIA DEL SISTEMA ANTIGUO
-- Terminales, Autobuses, Choferes, Empleados
-- Ejecutar ANTES de legacy-data-migration.sql
-- ================================================================

-- ================================================================
-- TERMINALES → stops
-- ================================================================
INSERT INTO stops (code, name, city, state, is_active, sort_order)
VALUES
  ('HUN', 'Huntington Park', 'Huntington Park', 'CA', true, 1),
  ('LAX', 'Los Angeles', 'Los Angeles', 'CA', true, 2),
  ('SYC', 'San Ysidro', 'San Ysidro', 'CA', true, 3),
  ('ATI', 'Aeropuerto Internacional de Tijuana', 'Tijuana', 'BC', true, 4),
  ('OTY', 'Garita de Otay', 'Tijuana', 'BC', true, 5),
  ('CAT', 'Central Camionera Tijuana', 'Tijuana', 'BC', true, 6),
  ('LTI', 'Las Tijeras', 'Tijuana', 'BC', true, 7),
  ('ELP', 'El Paso', 'El Paso', 'TX', true, 8),
  ('FAT', 'Fresno', 'Fresno', 'CA', true, 9),
  ('AHM', 'Anaheim', 'Anaheim', 'CA', true, 10),
  ('SAC', 'Sacramento', 'Sacramento', 'CA', true, 11),
  ('PHX', 'Phoenix', 'Phoenix', 'AZ', true, 12),
  ('SNA', 'Santa Ana', 'Santa Ana', 'CA', true, 13),
  ('CBX', 'Cross Border Xpress', 'San Diego', 'CA', true, 14)
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- AUTOBUSES → buses
-- ================================================================
-- Nota: ajustar columnas según el schema actual de buses
INSERT INTO buses (number, brand, model_year, license_plate, is_active)
VALUES
  ('176', 'Unknown', 2000, 'NONE',    false),
  ('781', 'Volvo',   2013, 'EP15570', true),
  ('760', 'Volvo',   2012, 'EP14391', false),
  ('769', 'Volvo',   2013, 'EP14390', false),
  ('125', 'MCI',     2016, '31876W2', true),
  ('768', 'Van Hool',2011, 'EP18605', true),
  ('30',  'MCI',     2012, '2024',    true),
  ('50',  'MCI',     2011, '60RC9G',  true),
  ('20',  'MCI',     2008, 'K128115', true),
  ('36',  'Mastercoach', 2011, '000', true)
ON CONFLICT (number) DO NOTHING;

-- ================================================================
-- CHOFERES (referencia histórica — tabla separada)
-- ================================================================
CREATE TABLE IF NOT EXISTS legacy_drivers (
  id           INT PRIMARY KEY,        -- ID del sistema antiguo
  full_name    TEXT NOT NULL,
  phone        TEXT,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO legacy_drivers (id, full_name, phone) VALUES
  (1,   '---',                             '000-000-0000'),
  (20,  'MARCOS MUÑOZ',                    '(323) 370-4736'),
  (130, 'ELIEL OLIVARES',                  '(323) 497-1633'),
  (28,  'JESUS OSUNA',                     '(323) 809-5790'),
  (135, 'TRANSPENISULAR TRAVEL TOURS LLC', '(000) 000-0000'),
  (34,  'ELAYS TOURS',                     '(323) 867-5639'),
  (38,  'AGUSTIN MORQUECHO',               '(323) 358-4284'),
  (39,  'CUPERTINO PALACIOS',              '(562) 257-7995'),
  (40,  'SILVANO ARANA',                   '(661) 477-1586'),
  (41,  'MARTINIANO MARTINEZ',             '(956) 373-4224')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- EMPLEADOS/CAJEROS (referencia histórica)
-- Estos usuarios aparecen en los boletos históricos como "sold_by"
-- ================================================================
CREATE TABLE IF NOT EXISTS legacy_staff (
  username     TEXT PRIMARY KEY,
  full_name    TEXT NOT NULL,
  department   TEXT,
  role         TEXT,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO legacy_staff (username, full_name, department, role) VALUES
  ('webmaster',   'Webmaster',         'Gerencia',     'Administradores'),
  ('accounting',  'Accounting',        'Sistemas',     'Despachadores'),
  ('fduran',      'Fabiola Duran',     'Coordinacion', 'Administradores'),
  ('ccueto',      'Cecilia Cueto',     'Gerencia',     'Gerentes'),
  ('larredondo',  'Liliana Arredondo', 'Ventas',       'Despachadores'),
  ('aromero',     'Alma Romero',       'Ventas',       'Despachadores'),
  ('aduran',      'Araceli Duran',     'Ventas',       'Despachadores'),
  ('kjimenez',    'Keycia Jimenez',    'Ventas',       'Despachadores'),
  ('mleon',       'Maria Leon',        'Ventas',       'Despachadores'),
  ('kgutierrez',  'Kevin Gutierrez',   'Ventas',       'Despachadores'),
  -- cajeros que aparecen en boletos pero no en la lista de usuarios:
  ('scamacho',    'S. Camacho',        'Ventas',       'Cajero'),
  ('chernandez',  'C. Hernandez',      'Ventas',       'Cajero'),
  ('msandoval',   'M. Sandoval',       'Ventas',       'Cajero'),
  ('apinzon',     'America Pinzon',    'Ventas',       'Cajero'),
  ('Jgonzalez',   'J. Gonzalez',       'Ventas',       'Cajero'),
  ('abravo',      'Ana Bravo',         'Ventas',       'Cajero'),
  ('agarcia',     'A. Garcia',         'Ventas',       'Cajero'),
  ('arobles',     'A. Robles',         'Ventas',       'Cajero'),
  ('azepeda',     'Arturo Zepeda',     'Ventas',       'Cajero'),
  ('bgallegos',   'B. Gallegos',       'Ventas',       'Cajero'),
  ('cnava',       'C. Nava',           'Ventas',       'Cajero'),
  ('cnegrete',    'Carlos Negrete',    'Ventas',       'Cajero'),
  ('cochoa',      'C. Ochoa',          'Ventas',       'Cajero'),
  ('dcarrasco',   'D. Carrasco',       'Ventas',       'Cajero'),
  ('dcueto',      'D. Cueto',          'Ventas',       'Cajero'),
  ('ecastro',     'E. Castro',         'Ventas',       'Cajero'),
  ('ggarcia',     'G. Garcia',         'Ventas',       'Cajero'),
  ('hmedina',     'H. Medina',         'Ventas',       'Cajero'),
  ('margueta',    'M. Argueta',        'Ventas',       'Cajero'),
  ('obastos',     'O. Bastos',         'Ventas',       'Cajero'),
  ('Apacheco',    'A. Pacheco',        'Ventas',       'Cajero')
ON CONFLICT (username) DO NOTHING;

-- ================================================================
-- VERIFICACIÓN
-- ================================================================
SELECT 'stops' as tabla, COUNT(*) as registros FROM stops
UNION ALL
SELECT 'buses', COUNT(*) FROM buses
UNION ALL
SELECT 'legacy_drivers', COUNT(*) FROM legacy_drivers
UNION ALL
SELECT 'legacy_staff', COUNT(*) FROM legacy_staff;
