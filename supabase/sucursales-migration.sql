-- Sucursales (branch offices / puntos de venta)
CREATE TABLE IF NOT EXISTS sucursales (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  city          TEXT,
  address       TEXT,
  active        BOOLEAN DEFAULT true,
  qb_cash_account_id  TEXT,  -- QB Account ID for Cash on hand (deposit target)
  qb_item_id          TEXT,  -- QB Item ID linked to branch income account
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Link bookings to a sucursal
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);

-- Seed the 9 known branches (QB IDs to be filled in once QB is connected)
INSERT INTO sucursales (name, code, city, qb_cash_account_id, qb_item_id) VALUES
  ('Huntington Park', 'HP',    'Huntington Park, CA', NULL, NULL),
  ('Los Angeles',     'LAX',   'Los Angeles, CA',     NULL, NULL),
  ('San Ysidro',      'SYC',   'San Ysidro, CA',      NULL, NULL),
  ('Fresno',          'FAT',   'Fresno, CA',           NULL, NULL),
  ('Santa Ana',       'SNA',   'Santa Ana, CA',        NULL, NULL),
  ('Anaheim ARTIC',   'ARTIC', 'Anaheim, CA',          NULL, NULL),
  ('El Paso',         'ELP',   'El Paso, TX',          NULL, NULL),
  ('Otay',            'OTY',   'Otay, CA',             NULL, NULL),
  ('Phoenix',         'PHOE',  'Phoenix, AZ',          NULL, NULL)
ON CONFLICT (code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
