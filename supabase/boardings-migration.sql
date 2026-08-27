-- ═══════════════════════════════════════════════════════════════════════
-- TEO — Tabla de abordajes (boarding control)
-- Correr en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS boardings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number   TEXT        NOT NULL,
  travel_date      DATE        NOT NULL,
  source           TEXT        NOT NULL DEFAULT 'legacy', -- 'new' | 'legacy'
  passenger_name   TEXT,
  origin_code      TEXT,
  destination_code TEXT,
  travel_time      TEXT,
  seat             INT,
  boarded_at       TIMESTAMPTZ DEFAULT now(),
  boarded_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  boarded_by_name  TEXT,
  notes            TEXT,
  UNIQUE (booking_number, travel_date)
);

CREATE INDEX IF NOT EXISTS boardings_booking_date_idx ON boardings (booking_number, travel_date);
CREATE INDEX IF NOT EXISTS boardings_travel_date_idx  ON boardings (travel_date);

ALTER TABLE boardings ENABLE ROW LEVEL SECURITY;

-- Solo staff/admin via service role
