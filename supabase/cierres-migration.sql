CREATE TABLE IF NOT EXISTS cierres_turno (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES profiles(id),
  sucursal_id      UUID REFERENCES sucursales(id),
  fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
  total_boletos    INT DEFAULT 0,
  total_efectivo   NUMERIC(10,2) DEFAULT 0,
  total_tarjeta    NUMERIC(10,2) DEFAULT 0,
  total_paquetes   NUMERIC(10,2) DEFAULT 0,
  total_general    NUMERIC(10,2) DEFAULT 0,
  qb_synced        BOOLEAN DEFAULT false,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
