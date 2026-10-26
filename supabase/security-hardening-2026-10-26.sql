-- Security hardening (2026-10-26)
-- Several tables had policies open to EVERYONE (anon included): anyone with the
-- public anon key could read qb_transactions (amounts + QuickBooks payloads) and
-- insert/update/delete rows in gastos, presupuestos, qb_category_mappings and packages.
--
-- Every API route reads/writes these tables with the service_role key, which
-- bypasses RLS, so dropping these policies does not change how the app works.
-- Run once in Supabase → SQL Editor. Safe to re-run.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['qb_transactions','gastos','presupuestos','qb_category_mappings','quickbooks_settings','packages']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;

  IF to_regclass('public.qb_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "qb_transactions_select" ON public.qb_transactions;
    DROP POLICY IF EXISTS "qb_transactions_insert" ON public.qb_transactions;
  END IF;
  IF to_regclass('public.gastos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "gastos_staff_insert" ON public.gastos;
    DROP POLICY IF EXISTS "gastos_staff_select" ON public.gastos;
  END IF;
  IF to_regclass('public.presupuestos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "presupuestos_staff_all" ON public.presupuestos;
  END IF;
  IF to_regclass('public.qb_category_mappings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "qb_category_mappings_all" ON public.qb_category_mappings;
  END IF;
  IF to_regclass('public.packages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "customers_insert_packages" ON public.packages;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
