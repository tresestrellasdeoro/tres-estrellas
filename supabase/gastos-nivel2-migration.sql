-- Nivel 2: Gastos más completos
-- Ejecutar en Supabase SQL Editor

-- 1. Nuevas columnas en gastos
ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS vendor         TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url    TEXT;

-- 2. Tabla de presupuestos mensuales por categoría
CREATE TABLE IF NOT EXISTS public.presupuestos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sucursal_id  UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
  mes          TEXT NOT NULL,        -- formato YYYY-MM
  category     TEXT NOT NULL,
  monto        NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
  UNIQUE (sucursal_id, mes, category)
);

ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presupuestos_staff_all" ON public.presupuestos FOR ALL USING (true) WITH CHECK (true);

-- 3. Bucket de Storage para recibos (ejecutar por separado si ya existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recibos', 'recibos', true)
-- ON CONFLICT (id) DO NOTHING;

-- 4. RLS para subir recibos (ejecutar si el bucket existe)
-- CREATE POLICY "recibos_upload" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'recibos' AND auth.role() = 'authenticated');
-- CREATE POLICY "recibos_read" ON storage.objects FOR SELECT
--   USING (bucket_id = 'recibos');

NOTIFY pgrst, 'reload schema';
