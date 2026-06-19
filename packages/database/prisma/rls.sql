-- Políticas RLS y GRANTs para tablas creadas/modificadas por Prisma
-- Se ejecuta con: pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/rls.sql

-- =============================================================
-- 1. suscripciones (solo SELECT, INSERT/UPDATE via service_role)
-- =============================================================
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own subscription" ON public.suscripciones;
CREATE POLICY "Users can select own subscription" ON public.suscripciones
  FOR SELECT USING (auth.uid()::text = "perfilId");

GRANT SELECT ON public.suscripciones TO authenticated;

-- =============================================================
-- 2. notificaciones (SELECT + marcar como leído)
-- =============================================================
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own notifications" ON public.notificaciones;
CREATE POLICY "Users can select own notifications" ON public.notificaciones
  FOR SELECT USING (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificaciones;
CREATE POLICY "Users can update own notifications" ON public.notificaciones
  FOR UPDATE USING (auth.uid()::text = "perfilId");

GRANT SELECT, UPDATE ON public.notificaciones TO authenticated;

-- =============================================================
-- 3. documentos (SELECT, INSERT, DELETE)
-- =============================================================
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own documents" ON public.documentos;
CREATE POLICY "Users can select own documents" ON public.documentos
  FOR SELECT USING (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documentos;
CREATE POLICY "Users can insert own documents" ON public.documentos
  FOR INSERT WITH CHECK (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documentos;
CREATE POLICY "Users can delete own documents" ON public.documentos
  FOR DELETE USING (auth.uid()::text = "perfilId");

GRANT SELECT, INSERT, DELETE ON public.documentos TO authenticated;

-- =============================================================
-- 4. examenes (SELECT)
-- =============================================================
ALTER TABLE public.examenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own exams" ON public.examenes;
CREATE POLICY "Users can select own exams" ON public.examenes
  FOR SELECT USING (auth.uid()::text = "perfilId");

GRANT SELECT ON public.examenes TO authenticated;

-- =============================================================
-- 5. facturas (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own invoices" ON public.facturas;
CREATE POLICY "Users can select own invoices" ON public.facturas
  FOR SELECT USING (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can insert own invoices" ON public.facturas;
CREATE POLICY "Users can insert own invoices" ON public.facturas
  FOR INSERT WITH CHECK (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can update own invoices" ON public.facturas;
CREATE POLICY "Users can update own invoices" ON public.facturas
  FOR UPDATE USING (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can delete own invoices" ON public.facturas;
CREATE POLICY "Users can delete own invoices" ON public.facturas
  FOR DELETE USING (auth.uid()::text = "perfilId");

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas TO authenticated;

-- =============================================================
-- 6. propiedades_alquiler (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.propiedades_alquiler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can select own rental properties" ON public.propiedades_alquiler
  FOR SELECT USING (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can insert own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can insert own rental properties" ON public.propiedades_alquiler
  FOR INSERT WITH CHECK (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can update own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can update own rental properties" ON public.propiedades_alquiler
  FOR UPDATE USING (auth.uid()::text = "perfilId");

DROP POLICY IF EXISTS "Users can delete own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can delete own rental properties" ON public.propiedades_alquiler
  FOR DELETE USING (auth.uid()::text = "perfilId");

GRANT ALL ON public.propiedades_alquiler TO authenticated;

-- =============================================================
-- 7. gastos_alquiler (SELECT, INSERT, DELETE)
--    No tiene perfilId directo, se vincula vía propiedades_alquiler
-- =============================================================
ALTER TABLE public.gastos_alquiler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own rental expenses" ON public.gastos_alquiler;
CREATE POLICY "Users can select own rental expenses" ON public.gastos_alquiler
  FOR SELECT USING (
    auth.uid()::text = (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    )
  );

DROP POLICY IF EXISTS "Users can insert own rental expenses" ON public.gastos_alquiler;
CREATE POLICY "Users can insert own rental expenses" ON public.gastos_alquiler
  FOR INSERT WITH CHECK (
    auth.uid()::text = (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    )
  );

DROP POLICY IF EXISTS "Users can delete own rental expenses" ON public.gastos_alquiler;
CREATE POLICY "Users can delete own rental expenses" ON public.gastos_alquiler
  FOR DELETE USING (
    auth.uid()::text = (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    )
  );

GRANT SELECT, INSERT, DELETE ON public.gastos_alquiler TO authenticated;

-- =============================================================
-- También aseguramos service_role para todas (por si faltaba)
-- =============================================================
GRANT ALL ON public.suscripciones TO service_role;
GRANT ALL ON public.notificaciones TO service_role;
GRANT ALL ON public.documentos TO service_role;
GRANT ALL ON public.examenes TO service_role;
GRANT ALL ON public.facturas TO service_role;
GRANT ALL ON public.propiedades_alquiler TO service_role;
GRANT ALL ON public.gastos_alquiler TO service_role;
