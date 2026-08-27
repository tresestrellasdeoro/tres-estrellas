-- Mirror del sistema anterior (MySQL) para backup y acceso si el servidor cae
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS legacy_boletos_mirror (
  bol_id         INTEGER PRIMARY KEY,
  bol_venta      INTEGER,
  nombre_cliente TEXT,
  contacto       TEXT,
  bol_costo      NUMERIC(10, 2),
  tipo_cliente   SMALLINT DEFAULT 1,
  bol_usuario    TEXT,
  terminal_venta INTEGER,
  fecha_venta    DATE,
  hora_venta     TEXT,
  es_cancelado   BOOLEAN DEFAULT false,
  det_fecha      DATE,
  det_hora       TEXT,
  det_origen     INTEGER,
  det_destino    INTEGER,
  det_asiento    INTEGER,
  tipo_viaje     SMALLINT DEFAULT 1,
  origen_nombre  TEXT,
  origen_clave   TEXT,
  destino_nombre TEXT,
  destino_clave  TEXT,
  synced_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_boletos_nombre    ON legacy_boletos_mirror (nombre_cliente);
CREATE INDEX IF NOT EXISTS idx_legacy_boletos_contacto  ON legacy_boletos_mirror (contacto);
CREATE INDEX IF NOT EXISTS idx_legacy_boletos_det_fecha ON legacy_boletos_mirror (det_fecha);
CREATE INDEX IF NOT EXISTS idx_legacy_boletos_venta     ON legacy_boletos_mirror (bol_venta);

CREATE TABLE IF NOT EXISTS legacy_sync_state (
  id             TEXT PRIMARY KEY DEFAULT 'boletos',
  last_bol_id    INTEGER DEFAULT 0,
  total_synced   INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  last_error     TEXT
);

INSERT INTO legacy_sync_state (id) VALUES ('boletos') ON CONFLICT (id) DO NOTHING;
