-- ═══════════════════════════════════════════════════════════════════════
-- TEO — Migración de paquetería
-- Correr en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tabla principal de paquetes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number      TEXT        NOT NULL UNIQUE,

  -- Remitente
  sender_name          TEXT        NOT NULL,
  sender_phone         TEXT        NOT NULL,
  sender_email         TEXT,

  -- Destinatario
  recipient_name       TEXT        NOT NULL,
  recipient_phone      TEXT        NOT NULL,
  recipient_email      TEXT,

  -- Ruta
  origin_stop_id       UUID        REFERENCES stops(id) ON DELETE SET NULL,
  destination_stop_id  UUID        REFERENCES stops(id) ON DELETE SET NULL,

  -- Paquete
  size                 TEXT        NOT NULL CHECK (size IN ('sobre','pequeno','mediano','grande','extra_grande')),
  weight_lbs           NUMERIC     DEFAULT 0,
  declared_value       NUMERIC     DEFAULT 0,
  price                NUMERIC     NOT NULL,
  notes                TEXT,

  -- Estado del envío
  status               TEXT        NOT NULL DEFAULT 'label_created'
                                   CHECK (status IN ('label_created','received','in_transit','arrived','delivered','returned')),

  -- Pago
  payment_status       TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (payment_status IN ('pending','paid','refunded')),
  payment_method       TEXT        CHECK (payment_method IN ('card','cash','terminal')),
  square_payment_id    TEXT,
  paid_at              TIMESTAMPTZ,
  paid_by              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Relación con cliente (opcional — si inició sesión al crear)
  customer_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS packages_tracking_number_idx ON packages (tracking_number);
CREATE INDEX IF NOT EXISTS packages_customer_id_idx     ON packages (customer_id);
CREATE INDEX IF NOT EXISTS packages_status_idx          ON packages (status);
CREATE INDEX IF NOT EXISTS packages_payment_status_idx  ON packages (payment_status);

-- ── Historial de eventos del paquete ─────────────────────────────────
CREATE TABLE IF NOT EXISTS package_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   UUID        NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL,
  location     TEXT,
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_events_package_id_idx ON package_events (package_id);

-- ── Row Level Security ────────────────────────────────────────────────
ALTER TABLE packages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_events ENABLE ROW LEVEL SECURITY;

-- Clientes: ven solo sus propios paquetes
CREATE POLICY IF NOT EXISTS "customers_own_packages"
  ON packages FOR SELECT
  USING (customer_id = auth.uid());

-- Clientes: pueden crear paquetes (el customer_id se asigna en la API)
CREATE POLICY IF NOT EXISTS "customers_insert_packages"
  ON packages FOR INSERT
  WITH CHECK (true);

-- Staff/admin: acceso total vía service role (las APIs usan service role key, bypassea RLS)
-- Clientes: ven eventos de sus propios paquetes
CREATE POLICY IF NOT EXISTS "customers_own_package_events"
  ON package_events FOR SELECT
  USING (
    package_id IN (
      SELECT id FROM packages WHERE customer_id = auth.uid()
    )
  );

-- ── Trigger para actualizar updated_at automáticamente ───────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS packages_updated_at ON packages;
CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
