-- Tabla de gastos: cualquier empleado puede registrar un gasto
CREATE TABLE IF NOT EXISTS gastos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sucursal_id     UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category        TEXT NOT NULL DEFAULT 'Otros',
  description     TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card')),
  qb_synced       BOOLEAN NOT NULL DEFAULT FALSE,
  qb_purchase_id  TEXT
);

-- Agrega cuenta QB de gastos a sucursales
ALTER TABLE sucursales
  ADD COLUMN IF NOT EXISTS qb_expense_account_id TEXT;

-- Log de todo lo enviado a QuickBooks (Sales Receipts + Purchases)
CREATE TABLE IF NOT EXISTS qb_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type           TEXT NOT NULL CHECK (type IN ('sales_receipt','purchase')),
  doc_number     TEXT,
  qb_id          TEXT,
  amount         DECIMAL(10,2),
  description    TEXT,
  reference_type TEXT CHECK (reference_type IN ('cierre','gasto','booking_online')),
  reference_id   UUID,
  payload        JSONB DEFAULT '{}'
);

-- RLS: solo admins ven gastos y qb_transactions
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastos_staff_insert" ON gastos FOR INSERT WITH CHECK (true);
CREATE POLICY "gastos_staff_select" ON gastos FOR SELECT USING (true);
CREATE POLICY "qb_transactions_select" ON qb_transactions FOR SELECT USING (true);
CREATE POLICY "qb_transactions_insert" ON qb_transactions FOR INSERT WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
