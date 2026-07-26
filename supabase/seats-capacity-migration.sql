-- Fix seat capacity enforcement
-- Ejecutar en Supabase SQL Editor

-- 1. Restricción a nivel DB: seats_available nunca puede ser negativo
--    Esto es la red de seguridad final contra race conditions
ALTER TABLE public.trips
  ADD CONSTRAINT trips_seats_available_non_negative
  CHECK (seats_available >= 0);

-- 2. El trigger original dispara DESPUÉS del INSERT del booking pero ANTES
--    de que se inserten los pasajeros, por lo que siempre cuenta 0 pasajeros
--    y descuenta 0 lugares. Lo eliminamos — el API lo maneja correctamente ahora.
DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
DROP FUNCTION IF EXISTS public.update_seats_on_booking();

-- 3. Nuevo trigger en pasajeros: cuando se cancela/reembolsa un booking,
--    devuelve los lugares al trip. El incremento en cancel lo manejamos aquí
--    para que el API no tenga que hacerlo manualmente.
CREATE OR REPLACE FUNCTION public.restore_seats_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo cuando el status cambia a cancelled o refunded desde confirmed
  IF TG_OP = 'UPDATE'
     AND NEW.status IN ('cancelled', 'refunded')
     AND OLD.status = 'confirmed' THEN
    UPDATE public.trips
    SET seats_available = seats_available + (
      SELECT COUNT(*) FROM public.passengers WHERE booking_id = NEW.id
    )
    WHERE id = NEW.trip_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_seats_on_cancel();
