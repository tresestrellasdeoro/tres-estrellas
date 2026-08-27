-- ═══════════════════════════════════════════════════════════════════════
-- TEO — Agregar dirección de entrega y campo de quién recibió
-- Correr en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- Dirección de entrega del destinatario
ALTER TABLE packages ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- Quién recibió físicamente el paquete (se llena al marcar como entregado)
ALTER TABLE package_events ADD COLUMN IF NOT EXISTS received_by TEXT;
