-- Políticas RLS y GRANTs para tablas creadas/modificadas por Prisma
-- Se ejecuta con: pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/rls.sql

-- =============================================================
-- 0. Helper: verificar si un usuario es gestor de un perfil
-- =============================================================
CREATE OR REPLACE FUNCTION public.es_gestor_del_perfil(user_id TEXT, target_perfil_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."perfil_asociado"
    WHERE "ownerUserId" = user_id
      AND "perfilId" = target_perfil_id
      AND "rol" IN ('gestor', 'propietario')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: obtener todos los perfilIds accesibles por un usuario (propios + asociados)
CREATE OR REPLACE FUNCTION public.perfiles_accesibles(user_id TEXT)
RETURNS SETOF TEXT AS $$
  SELECT id FROM public.perfiles WHERE "userId" = user_id
  UNION
  SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = user_id AND "rol" IN ('gestor', 'propietario');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- 1. perfil_asociado (gestores de personas)
-- =============================================================
ALTER TABLE public."perfil_asociado" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own associations" ON public."perfil_asociado";
CREATE POLICY "Users can select own associations" ON public."perfil_asociado"
  FOR SELECT USING (auth.uid()::text = "ownerUserId");

DROP POLICY IF EXISTS "Users can insert own associations" ON public."perfil_asociado";
CREATE POLICY "Users can insert own associations" ON public."perfil_asociado"
  FOR INSERT WITH CHECK (auth.uid()::text = "ownerUserId");

DROP POLICY IF EXISTS "Users can delete own associations" ON public."perfil_asociado";
CREATE POLICY "Users can delete own associations" ON public."perfil_asociado"
  FOR DELETE USING (auth.uid()::text = "ownerUserId");

GRANT SELECT, INSERT, DELETE ON public."perfil_asociado" TO authenticated;
GRANT ALL ON public."perfil_asociado" TO service_role;

-- =============================================================
-- 2. suscripciones (solo SELECT, INSERT/UPDATE via service_role)
-- =============================================================
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own subscription" ON public.suscripciones;
CREATE POLICY "Users can select own subscription" ON public.suscripciones
  FOR SELECT USING (auth.uid()::text = "perfilId");

GRANT SELECT ON public.suscripciones TO authenticated;

-- =============================================================
-- 3. notificaciones (SELECT + marcar como leído)
-- =============================================================
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own notifications" ON public.notificaciones;
CREATE POLICY "Users can select own notifications" ON public.notificaciones
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificaciones;
CREATE POLICY "Users can update own notifications" ON public.notificaciones
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT SELECT, UPDATE ON public.notificaciones TO authenticated;

-- =============================================================
-- 4. documentos (SELECT, INSERT, DELETE)
-- =============================================================
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own documents" ON public.documentos;
CREATE POLICY "Users can select own documents" ON public.documentos
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documentos;
CREATE POLICY "Users can insert own documents" ON public.documentos
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documentos;
CREATE POLICY "Users can delete own documents" ON public.documentos
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT SELECT, INSERT, DELETE ON public.documentos TO authenticated;

-- =============================================================
-- 6. facturas (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own invoices" ON public.facturas;
CREATE POLICY "Users can select own invoices" ON public.facturas
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can insert own invoices" ON public.facturas;
CREATE POLICY "Users can insert own invoices" ON public.facturas
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can update own invoices" ON public.facturas;
CREATE POLICY "Users can update own invoices" ON public.facturas
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can delete own invoices" ON public.facturas;
CREATE POLICY "Users can delete own invoices" ON public.facturas
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas TO authenticated;

-- =============================================================
-- 7. propiedades_alquiler (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.propiedades_alquiler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can select own rental properties" ON public.propiedades_alquiler
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can insert own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can insert own rental properties" ON public.propiedades_alquiler
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can update own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can update own rental properties" ON public.propiedades_alquiler
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can delete own rental properties" ON public.propiedades_alquiler;
CREATE POLICY "Users can delete own rental properties" ON public.propiedades_alquiler
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT ALL ON public.propiedades_alquiler TO authenticated;

-- =============================================================
-- 8. gastos_alquiler (SELECT, INSERT, DELETE)
--    No tiene perfilId directo, se vincula vía propiedades_alquiler
-- =============================================================
ALTER TABLE public.gastos_alquiler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own rental expenses" ON public.gastos_alquiler;
CREATE POLICY "Users can select own rental expenses" ON public.gastos_alquiler
  FOR SELECT USING (
    auth.uid()::text = (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    )
    OR public.es_gestor_del_perfil(auth.uid()::text, (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    ))
  );

DROP POLICY IF EXISTS "Users can insert own rental expenses" ON public.gastos_alquiler;
CREATE POLICY "Users can insert own rental expenses" ON public.gastos_alquiler
  FOR INSERT WITH CHECK (
    auth.uid()::text = (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    )
    OR public.es_gestor_del_perfil(auth.uid()::text, (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    ))
  );

DROP POLICY IF EXISTS "Users can delete own rental expenses" ON public.gastos_alquiler;
CREATE POLICY "Users can delete own rental expenses" ON public.gastos_alquiler
  FOR DELETE USING (
    auth.uid()::text = (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    )
    OR public.es_gestor_del_perfil(auth.uid()::text, (
      SELECT "perfilId" FROM public.propiedades_alquiler WHERE id = "propiedadId"
    ))
  );

GRANT SELECT, INSERT, DELETE ON public.gastos_alquiler TO authenticated;

-- =============================================================
-- service_role para todas (por si faltaba)
-- =============================================================
GRANT ALL ON public."perfil_asociado" TO service_role;
GRANT ALL ON public.suscripciones TO service_role;
GRANT ALL ON public.notificaciones TO service_role;
GRANT ALL ON public.documentos TO service_role;
GRANT ALL ON public.facturas TO service_role;
GRANT ALL ON public.propiedades_alquiler TO service_role;
GRANT ALL ON public.gastos_alquiler TO service_role;
GRANT ALL ON public."encuestas_satisfaccion" TO service_role;
