-- Migration: Drivers table + sold_by on bookings
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS drivers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT,
  license    TEXT,
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS sold_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_sold_by ON bookings(sold_by_user_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver     ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_bus        ON trips(bus_id);

-- RLS for drivers (admin/super_admin only via service role)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on drivers"
  ON drivers FOR ALL TO service_role USING (true) WITH CHECK (true);
