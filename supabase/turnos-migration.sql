-- Sistema de turnos por cajero
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de turnos individuales por cajero
CREATE TABLE IF NOT EXISTS public.turnos (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  cajero_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sucursal_id    uuid        NOT NULL REFERENCES public.sucursales(id),
  inicio         timestamptz NOT NULL DEFAULT now(),
  fin            timestamptz,
  estado         text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  total_boletos  int         NOT NULL DEFAULT 0,
  total_efectivo numeric(10,2) NOT NULL DEFAULT 0,
  total_tarjeta  numeric(10,2) NOT NULL DEFAULT 0,
  total_paquetes numeric(10,2) NOT NULL DEFAULT 0,
  total_general  numeric(10,2) NOT NULL DEFAULT 0,
  notas          text,
  cierre_id      uuid        REFERENCES public.cierres_turno(id),
  created_at     timestamptz DEFAULT now()
);

-- Un cajero solo puede tener un turno activo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS turnos_cajero_activo_idx
  ON public.turnos(cajero_user_id)
  WHERE estado = 'activo';

-- RLS: cajero ve/modifica sus propios turnos; admin ve todo
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "turnos_cajero_own" ON public.turnos;
CREATE POLICY "turnos_cajero_own" ON public.turnos
  FOR ALL
  USING (
    auth.uid() = cajero_user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'developer')
    )
  );

-- 2. Índices útiles para consultas admin
CREATE INDEX IF NOT EXISTS turnos_sucursal_idx ON public.turnos(sucursal_id);
CREATE INDEX IF NOT EXISTS turnos_estado_idx   ON public.turnos(estado);
CREATE INDEX IF NOT EXISTS turnos_inicio_idx   ON public.turnos(inicio DESC);
