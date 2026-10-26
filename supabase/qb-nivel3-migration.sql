-- QuickBooks Nivel 3: mapeo de categorías de gasto a cuentas QB
CREATE TABLE IF NOT EXISTS public.qb_category_mappings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category         TEXT UNIQUE NOT NULL,
  qb_account_id    TEXT NOT NULL,
  qb_account_name  TEXT
);

ALTER TABLE public.qb_category_mappings ENABLE ROW LEVEL SECURITY;
-- Removed 2026-10-26: open to anon. APIs use service_role (bypasses RLS). See security-hardening-2026-10-26.sql
-- CREATE POLICY "qb_category_mappings_all" ON public.qb_category_mappings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
