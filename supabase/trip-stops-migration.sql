-- ================================================================
-- Seguimiento de salidas por parada
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- 1. Paradas ordenadas por ruta (incluyendo origen, intermedias y destino)
CREATE TABLE IF NOT EXISTS route_stops (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id     UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id      UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  stop_order   INT  NOT NULL CHECK (stop_order >= 0),
  UNIQUE(route_id, stop_order),
  UNIQUE(route_id, stop_id)
);
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON route_stops;
CREATE POLICY "service_role_all" ON route_stops
  TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id, stop_order);

-- 2. Registro de salidas por parada por día
CREATE TABLE IF NOT EXISTS trip_stop_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id  UUID        NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  trip_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  stop_id      UUID        NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  stop_order   INT         NOT NULL,
  departed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schedule_id, trip_date, stop_id)
);
ALTER TABLE trip_stop_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON trip_stop_logs;
CREATE POLICY "service_role_all" ON trip_stop_logs
  TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_trip_stop_logs_schedule_date ON trip_stop_logs(schedule_id, trip_date);

-- Refrescar caché de esquema PostgREST
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- PASO 2 (opcional pero recomendado):
-- Agregar las paradas intermedias de cada ruta.
-- Sin esto, la app muestra solo origen y destino como fallback.
--
-- Primero consulta tus rutas e IDs de paradas:
--   SELECT id, name, code FROM routes ORDER BY code;
--   SELECT id, name, city, sort_order FROM stops ORDER BY sort_order;
--
-- Luego inserta en orden (stop_order 0 = origen, último = destino):
--
-- INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES
--   ('ROUTE_UUID', 'STOP_LA_UUID',  0),
--   ('ROUTE_UUID', 'STOP_SD_UUID',  1),
--   ('ROUTE_UUID', 'STOP_SY_UUID',  2)
-- ON CONFLICT DO NOTHING;
-- ================================================================
