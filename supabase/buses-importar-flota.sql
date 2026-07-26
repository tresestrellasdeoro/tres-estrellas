-- Importar flota real desde sistema anterior (solo buses Disponibles)
-- Ejecutar en Supabase SQL Editor
-- Los 3 buses de demostración (CA-TEO-001/002/003) se pueden borrar manualmente desde /admin/buses

INSERT INTO public.buses (plate, model, brand, year, capacity, amenities, is_active) VALUES
  ('EP15570',  'Coach 2013', 'Volvo',       2013, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('31876W2',  'Coach 2016', 'MCI',         2016, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('EP18605',  'Coach 2011', 'Van Hool',    2011, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('2024',     'Coach 2012', 'MCI',         2012, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('60RC9G',   'Coach 2011', 'MCI',         2011, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('K128115',  'Coach 2008', 'MCI',         2008, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('000',      'Coach 2011', 'Mastercoach', 2011, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('0000',     'Coach 2008', 'Mastercoach', 2008, 55, ARRAY['A/C','Baño','Reclinables'], true),
  ('60990U-3', 'Coach 2013', 'MCI',         2013, 55, ARRAY['A/C','Baño','Reclinables'], true);
