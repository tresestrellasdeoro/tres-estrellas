-- Agregar campos de equipaje a bookings
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS luggage_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luggage_label TEXT;

-- Backfill: si total_amount > precio base de pasajeros no hay forma de saber cuánto
-- fue equipaje, así que dejamos 0 en los registros existentes (correcto).

-- Índice útil para reportes de ingresos por equipaje
CREATE INDEX IF NOT EXISTS idx_bookings_luggage_price
  ON public.bookings (luggage_price)
  WHERE luggage_price > 0;
