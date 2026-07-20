-- Migration: add discount fields to passengers table
-- Run in Supabase SQL Editor

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS is_promo    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promo_label TEXT;   -- optional label: "Promo", "Maestro", "Estudiante", etc.

-- Index for reporting (promo tickets)
CREATE INDEX IF NOT EXISTS idx_passengers_is_promo ON passengers(is_promo) WHERE is_promo = TRUE;
