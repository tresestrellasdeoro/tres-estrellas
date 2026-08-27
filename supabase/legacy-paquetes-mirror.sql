-- Mirror de paquetes del sistema anterior (MySQL) para backup
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS legacy_paquetes_mirror (
  id_paquete      INTEGER PRIMARY KEY,
  codigo          TEXT,
  tipo            INTEGER,
  precio          NUMERIC(10, 2),
  peso            NUMERIC(10, 2),
  status          INTEGER DEFAULT 0,
  vendedor        TEXT,
  ras_remitente   TEXT,
  ras_receptor    TEXT,
  ras_receptor_2  TEXT,
  numero_contacto TEXT,
  ras_fechaenvio  DATE,
  ras_horaenvio   TEXT,
  ras_destino     TEXT,
  ras_envio       TEXT,
  ras_numrastreo  TEXT,
  descripcion     TEXT,
  direccion       TEXT,
  nombre_recibe   TEXT,
  fecha_recepcion DATE,
  synced_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_paq_codigo     ON legacy_paquetes_mirror (codigo);
CREATE INDEX IF NOT EXISTS idx_legacy_paq_remitente  ON legacy_paquetes_mirror (ras_remitente);
CREATE INDEX IF NOT EXISTS idx_legacy_paq_receptor   ON legacy_paquetes_mirror (ras_receptor);
CREATE INDEX IF NOT EXISTS idx_legacy_paq_contacto   ON legacy_paquetes_mirror (numero_contacto);

-- Estado de sync para paquetes
INSERT INTO legacy_sync_state (id) VALUES ('paquetes') ON CONFLICT (id) DO NOTHING;
