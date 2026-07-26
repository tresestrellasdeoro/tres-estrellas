-- Agregar campo de dirección a paradas de abordaje
ALTER TABLE public.stops
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Poblar las 5 paradas existentes con sus direcciones reales
UPDATE public.stops SET address = '614 E. 7th San Pedro St, Los Angeles, CA 90014'     WHERE code = 'LA';
UPDATE public.stops SET address = '2414 E. Florence Ave, Huntington Park, CA 90255'    WHERE code = 'HP';
UPDATE public.stops SET address = '710 E. San Ysidro Blvd. #C, San Ysidro, CA 92173'  WHERE code = 'SYS';
UPDATE public.stops SET address = 'Rampa Xicotencatl 229-1, Puente Frontera, Col. Libertad, Tijuana, B.C.' WHERE code = 'OTY';
UPDATE public.stops SET address = 'Aeropuerto Internacional Abelardo L. Rodríguez, Tijuana, B.C.' WHERE code = 'TIJ';
