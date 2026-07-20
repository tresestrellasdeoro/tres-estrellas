-- Fix: Add public read policies for schedules and route_stops
-- These are needed so anon users can search for available trips
-- without requiring authentication.

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_public" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "route_stops_public" ON route_stops
  FOR SELECT USING (true);

CREATE POLICY "buses_public" ON buses
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
