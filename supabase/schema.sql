-- ============================================================
-- TRES ESTRELLAS DE ORO INC — Schema completo
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('customer', 'driver', 'admin', 'super_admin');
CREATE TYPE trip_status AS ENUM ('scheduled', 'boarding', 'in_transit', 'arrived', 'cancelled', 'delayed');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded', 'used');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_provider AS ENUM ('stripe', 'square', 'cash');
CREATE TYPE ticket_type AS ENUM ('one_way', 'round_trip');
CREATE TYPE passenger_type AS ENUM ('adult', 'child', 'senior');
CREATE TYPE loyalty_tier AS ENUM ('none', 'bronze', 'silver', 'gold', 'platinum');
CREATE TYPE loyalty_tx_type AS ENUM ('earned', 'redeemed', 'expired', 'bonus');

-- ============================================================
-- PROFILES (extiende auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  loyalty_tier  loyalty_tier NOT NULL DEFAULT 'none',
  loyalty_points INT NOT NULL DEFAULT 0,
  total_trips   INT NOT NULL DEFAULT 0,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PARADAS (Stops)
-- ============================================================
CREATE TABLE stops (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL DEFAULT 'CA',
  address       TEXT,
  terminal_name TEXT,
  lat           DECIMAL(9,6),
  lng           DECIMAL(9,6),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0
);

-- ============================================================
-- RUTAS
-- ============================================================
CREATE TABLE routes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  origin_stop_id       UUID NOT NULL REFERENCES stops(id),
  destination_stop_id  UUID NOT NULL REFERENCES stops(id),
  duration_minutes     INT NOT NULL,
  distance_miles       DECIMAL(8,2),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTOBUSES
-- ============================================================
CREATE TABLE buses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate      TEXT NOT NULL UNIQUE,
  model      TEXT NOT NULL,
  brand      TEXT NOT NULL DEFAULT 'Motor Coach',
  year       INT NOT NULL,
  capacity   INT NOT NULL DEFAULT 55,
  amenities  JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HORARIOS (Schedules)
-- ============================================================
CREATE TABLE schedules (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id       UUID NOT NULL REFERENCES routes(id),
  departure_time TIME NOT NULL,
  days_of_week   INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  is_active      BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- VIAJES (Trips — instancias de un horario)
-- ============================================================
CREATE TABLE trips (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_number       TEXT NOT NULL UNIQUE,
  schedule_id       UUID NOT NULL REFERENCES schedules(id),
  bus_id            UUID REFERENCES buses(id),
  driver_id         UUID REFERENCES profiles(id),
  departure_date    DATE NOT NULL,
  departure_time    TIME NOT NULL,
  estimated_arrival TIME NOT NULL,
  actual_departure  TIMESTAMPTZ,
  actual_arrival    TIMESTAMPTZ,
  status            trip_status NOT NULL DEFAULT 'scheduled',
  seats_total       INT NOT NULL DEFAULT 55,
  seats_available   INT NOT NULL DEFAULT 55,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, departure_date)
);

-- Auto-generar trip_number
CREATE OR REPLACE FUNCTION generate_trip_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trip_number := 'TEO-' || TO_CHAR(NEW.departure_date, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trip_number
  BEFORE INSERT ON trips
  FOR EACH ROW
  WHEN (NEW.trip_number IS NULL OR NEW.trip_number = '')
  EXECUTE FUNCTION generate_trip_number();

-- ============================================================
-- PRECIOS (Pricing)
-- ============================================================
CREATE TABLE pricing (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id       UUID NOT NULL REFERENCES routes(id),
  terminal_id    UUID NOT NULL REFERENCES stops(id),
  passenger_type passenger_type NOT NULL,
  ticket_type    ticket_type NOT NULL,
  price          DECIMAL(8,2) NOT NULL,
  UNIQUE(route_id, terminal_id, passenger_type, ticket_type)
);

-- ============================================================
-- RESERVACIONES (Bookings)
-- ============================================================
CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT NOT NULL UNIQUE,
  trip_id        UUID NOT NULL REFERENCES trips(id),
  customer_id    UUID REFERENCES profiles(id),           -- nullable: guest checkout
  return_trip_id UUID REFERENCES trips(id),
  ticket_type    ticket_type NOT NULL DEFAULT 'one_way',
  status         booking_status NOT NULL DEFAULT 'confirmed',
  total_amount   DECIMAL(8,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'card',
  guest_email    TEXT,
  points_earned  INT NOT NULL DEFAULT 0,
  return_date    DATE,                                    -- fecha de regreso (hora abierta)
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generar booking_number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_number := 'TEO' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex'), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_number();

-- ============================================================
-- PASAJEROS
-- ============================================================
CREATE TABLE passengers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id            UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  passenger_type        passenger_type NOT NULL DEFAULT 'adult',
  seat_number           TEXT,
  qr_code               TEXT NOT NULL UNIQUE,
  price                 DECIMAL(8,2) NOT NULL,
  terminal_id           UUID NOT NULL REFERENCES stops(id),
  checked_in            BOOLEAN NOT NULL DEFAULT false,
  checked_in_at         TIMESTAMPTZ,
  return_checked_in     BOOLEAN NOT NULL DEFAULT false,  -- check-in tramo regreso
  return_checked_in_at  TIMESTAMPTZ
);

-- Auto-generar QR code
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code := encode(digest(NEW.id::TEXT || NEW.booking_id::TEXT || NOW()::TEXT, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_qr_code
  BEFORE INSERT ON passengers
  FOR EACH ROW
  EXECUTE FUNCTION generate_qr_code();

-- ============================================================
-- PAGOS (Payments)
-- ============================================================
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  amount              DECIMAL(8,2) NOT NULL,
  provider            payment_provider NOT NULL,
  provider_payment_id TEXT,
  status              payment_status NOT NULL DEFAULT 'pending',
  payment_method      TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEALTAD / LOYALTY
-- ============================================================
CREATE TABLE loyalty_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  booking_id  UUID REFERENCES bookings(id),
  points      INT NOT NULL,
  type        loyalty_tx_type NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Actualizar tier de lealtad automáticamente
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.loyalty_tier := CASE
    WHEN NEW.loyalty_points >= 5000 THEN 'platinum'::loyalty_tier
    WHEN NEW.loyalty_points >= 2000 THEN 'gold'::loyalty_tier
    WHEN NEW.loyalty_points >= 500  THEN 'silver'::loyalty_tier
    WHEN NEW.loyalty_points >= 100  THEN 'bronze'::loyalty_tier
    ELSE 'none'::loyalty_tier
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_loyalty_tier
  BEFORE UPDATE OF loyalty_points ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_tier();

-- ============================================================
-- TIPOS DE EQUIPAJE
-- ============================================================
CREATE TABLE luggage_types (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  description    TEXT,
  max_weight_lbs DECIMAL(5,1) NOT NULL,
  extra_fee      DECIMAL(6,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- CONFIGURACIÓN DEL SISTEMA
-- ============================================================
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: cada usuario ve solo su perfil, admins ven todo
CREATE POLICY "profiles_self" ON profiles FOR ALL
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));

-- Bookings: cliente ve las suyas, admin/driver ven todas
CREATE POLICY "bookings_customer" ON bookings FOR SELECT
  USING (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin','driver')));

CREATE POLICY "bookings_insert" ON bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Passengers: heredan acceso del booking
CREATE POLICY "passengers_via_booking" ON passengers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id
    AND (b.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin','driver')))
  ));

-- Tablas públicas (solo lectura sin auth)
CREATE POLICY "stops_public" ON stops FOR SELECT USING (true);
CREATE POLICY "routes_public" ON routes FOR SELECT USING (true);
CREATE POLICY "trips_public" ON trips FOR SELECT USING (true);
CREATE POLICY "pricing_public" ON pricing FOR SELECT USING (true);
CREATE POLICY "luggage_public" ON luggage_types FOR SELECT USING (true);

ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE luggage_types ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGER: crear profile cuando se registra un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: reducir seats_available al confirmar booking
-- ============================================================
CREATE OR REPLACE FUNCTION update_seats_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  passenger_count INT;
BEGIN
  SELECT COUNT(*) INTO passenger_count FROM passengers WHERE booking_id = NEW.id;

  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    UPDATE trips SET seats_available = seats_available - passenger_count WHERE id = NEW.trip_id;
  ELSIF NEW.status IN ('cancelled', 'refunded') AND OLD.status = 'confirmed' THEN
    UPDATE trips SET seats_available = seats_available + passenger_count WHERE id = NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_status_change
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_on_booking();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Paradas principales
INSERT INTO stops (code, name, city, state, address, terminal_name, sort_order) VALUES
  ('LA',  'Los Angeles',     'Los Angeles',   'CA', '1716 E 7th St, Los Angeles, CA 90021',      'Terminal Central LA',   1),
  ('HP',  'Huntington Park', 'Huntington Park','CA', '7054 Pacific Blvd, Huntington Park, CA 90255', 'Taquilla Huntington Park', 2),
  ('LTI', 'San Ysidro / LTI','San Diego',     'CA', '4570 Camino de la Plaza, San Diego, CA 92173', 'LTI Terminal',          3),
  ('ATI', 'San Diego / ATI', 'San Diego',     'CA', '4450 Camino de la Plaza, San Diego, CA 92173', 'ATI Terminal',          4),
  ('CAT', 'Otay / CAT',      'Chula Vista',   'CA', '1234 Otay Valley Rd, Chula Vista, CA 91911',   'CAT Terminal',          5);

-- Rutas
INSERT INTO routes (code, name, origin_stop_id, destination_stop_id, duration_minutes, is_active)
SELECT 'LA-LTI', 'Los Angeles → San Ysidro (LTI)', la.id, lti.id, 150, true
FROM stops la, stops lti WHERE la.code = 'LA' AND lti.code = 'LTI';

INSERT INTO routes (code, name, origin_stop_id, destination_stop_id, duration_minutes, is_active)
SELECT 'LA-ATI', 'Los Angeles → San Diego (ATI)', la.id, ati.id, 155, true
FROM stops la, stops ati WHERE la.code = 'LA' AND ati.code = 'ATI';

INSERT INTO routes (code, name, origin_stop_id, destination_stop_id, duration_minutes, is_active)
SELECT 'LA-CAT', 'Los Angeles → Otay (CAT)', la.id, cat.id, 160, true
FROM stops la, stops cat WHERE la.code = 'LA' AND cat.code = 'CAT';

-- Horarios (10 salidas diarias de LA)
INSERT INTO schedules (route_id, departure_time, days_of_week)
SELECT r.id, t.departure_time::TIME, '{0,1,2,3,4,5,6}'
FROM routes r, (VALUES
  ('07:00'), ('09:00'), ('11:00'), ('13:00'), ('15:00'),
  ('17:00'), ('19:00'), ('21:00'), ('22:00'), ('23:00')
) AS t(departure_time)
WHERE r.code IN ('LA-LTI', 'LA-ATI', 'LA-CAT');

-- Precios (LTI)
INSERT INTO pricing (route_id, terminal_id, passenger_type, ticket_type, price)
SELECT r.id, s.id, p.type::passenger_type, t.ticket::ticket_type, p.price
FROM routes r, stops s,
(VALUES
  ('adult',  'one_way',   35.00),
  ('adult',  'round_trip', 65.00),
  ('child',  'one_way',   20.00),
  ('child',  'round_trip', 38.00)
) AS p(type, ticket, price),
(VALUES ('one_way'), ('round_trip')) AS t(ticket)
WHERE r.code = 'LA-LTI' AND s.code = 'LTI'
AND p.ticket = t.ticket
ON CONFLICT DO NOTHING;

-- Precios (ATI)
INSERT INTO pricing (route_id, terminal_id, passenger_type, ticket_type, price)
SELECT r.id, s.id, p.type::passenger_type, p.ticket::ticket_type, p.price
FROM routes r, stops s,
(VALUES
  ('adult',  'one_way',   38.00),
  ('adult',  'round_trip', 70.00),
  ('child',  'one_way',   22.00),
  ('child',  'round_trip', 40.00)
) AS p(type, ticket, price)
WHERE r.code = 'LA-ATI' AND s.code = 'ATI'
ON CONFLICT DO NOTHING;

-- Precios (CAT)
INSERT INTO pricing (route_id, terminal_id, passenger_type, ticket_type, price)
SELECT r.id, s.id, p.type::passenger_type, p.ticket::ticket_type, p.price
FROM routes r, stops s,
(VALUES
  ('adult',  'one_way',   40.00),
  ('adult',  'round_trip', 72.00),
  ('child',  'one_way',   24.00),
  ('child',  'round_trip', 44.00)
) AS p(type, ticket, price)
WHERE r.code = 'LA-CAT' AND s.code = 'CAT'
ON CONFLICT DO NOTHING;

-- Tiers de lealtad en settings
INSERT INTO settings (key, value, description) VALUES
  ('loyalty_tiers', '{
    "bronze":   {"min_points": 100,  "discount_pct": 5,  "priority_boarding": false},
    "silver":   {"min_points": 500,  "discount_pct": 10, "priority_boarding": true},
    "gold":     {"min_points": 2000, "discount_pct": 15, "priority_boarding": true},
    "platinum": {"min_points": 5000, "discount_pct": 20, "priority_boarding": true}
  }', 'Configuración de tiers del programa de lealtad'),
  ('points_per_dollar', '{"value": 1}', 'Puntos ganados por dólar gastado'),
  ('company', '{
    "name": "Tres Estrellas de Oro Inc",
    "phone": "+1 (213) 000-0000",
    "email": "info@tresestrellasdeorobus.com",
    "address": "1716 E 7th St, Los Angeles, CA 90021"
  }', 'Información de la empresa');

-- Equipaje
INSERT INTO luggage_types (name, description, max_weight_lbs, extra_fee) VALUES
  ('Maleta pequeña',  'Equipaje de mano', 22, 0),
  ('Maleta mediana',  'Una maleta',       50, 10),
  ('Maleta grande',   'Maleta extra',     70, 20),
  ('Encomienda',      'Paquetes y cajas', 50, 25);

-- Bus de demo
INSERT INTO buses (plate, model, brand, year, capacity, amenities) VALUES
  ('CA-TEO-001', 'Prevost X3-45', 'Prevost', 2022, 55, '{"wifi": true, "ac": true, "restroom": true, "usb": true, "reclining_seats": true}'),
  ('CA-TEO-002', 'MCI J4500',     'MCI',     2021, 55, '{"wifi": true, "ac": true, "restroom": true, "usb": true, "reclining_seats": true}'),
  ('CA-TEO-003', 'Volvo 9700',    'Volvo',   2023, 55, '{"wifi": true, "ac": true, "restroom": true, "usb": true, "reclining_seats": true, "entertainment": true}');
