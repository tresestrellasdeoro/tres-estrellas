-- ============================================================
-- SISTEMA DE SOPORTE — tickets + mensajes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Secuencia para número de ticket
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

-- Tabla principal de tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT        UNIQUE,
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  creator_name  TEXT,
  creator_role  TEXT,
  sucursal_id   UUID        REFERENCES sucursales(id) ON DELETE SET NULL,
  subject       TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'otro'
                            CHECK (category IN ('ventas','checkin','paquetes','sistema','reportes','contabilidad','otro')),
  priority      TEXT        NOT NULL DEFAULT 'media'
                            CHECK (priority IN ('baja','media','alta','critica')),
  description   TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'abierta'
                            CHECK (status IN ('abierta','en_revision','solucionada','cerrada')),
  assigned_to   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Mensajes de seguimiento dentro de cada ticket
CREATE TABLE IF NOT EXISTS support_messages (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id    UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name  TEXT,
  message      TEXT        NOT NULL,
  is_developer BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Trigger: auto-generate ticket_number
CREATE OR REPLACE FUNCTION generate_support_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('support_ticket_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_support_ticket_number ON support_tickets;
CREATE TRIGGER set_support_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_support_ticket_number();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_timestamp();

-- RLS
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Usuarios ven sus propios tickets
DROP POLICY IF EXISTS "support_tickets_own_view" ON support_tickets;
CREATE POLICY "support_tickets_own_view" ON support_tickets
  FOR SELECT USING (auth.uid() = created_by);

-- Usuarios crean tickets
DROP POLICY IF EXISTS "support_tickets_user_insert" ON support_tickets;
CREATE POLICY "support_tickets_user_insert" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Usuarios ven mensajes de sus tickets
DROP POLICY IF EXISTS "support_messages_own_view" ON support_messages;
CREATE POLICY "support_messages_own_view" ON support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid())
    OR sender_id = auth.uid()
  );

-- Usuarios pueden enviar mensajes en sus propios tickets
DROP POLICY IF EXISTS "support_messages_user_insert" ON support_messages;
CREATE POLICY "support_messages_user_insert" ON support_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid())
  );

-- El service role (developer API) maneja todo lo demás sin restricción de RLS
-- (usa service_role_key que bypasea RLS)

NOTIFY pgrst, 'reload schema';
