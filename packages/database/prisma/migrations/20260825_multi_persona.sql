-- Tabla perfil_asociado: vincula un gestor (userId) con perfiles de otras personas
CREATE TABLE IF NOT EXISTS public."perfil_asociado" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ownerUserId" TEXT NOT NULL,   -- auth.users.id del gestor
  "perfilId"    TEXT NOT NULL,   -- perfiles.id de la persona gestionada
  "rol"         TEXT NOT NULL DEFAULT 'gestor', -- propietario | gestor | visualizador
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "perfil_asociado_ownerUserId_perfilId_key" UNIQUE ("ownerUserId", "perfilId")
);

-- RLS para perfil_asociado
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

-- Helper: función para verificar si un usuario es gestor de un perfil
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

-- Actualizar políticas RLS en facturas: permitir gestores ver/insertar/modificar/eliminar
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

-- documentos: gestores pueden ver y subir documentos
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

-- examenes: gestores pueden ver
DROP POLICY IF EXISTS "Users can select own exams" ON public.examenes;
CREATE POLICY "Users can select own exams" ON public.examenes
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- notificaciones: gestores pueden ver y actualizar
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

-- propiedades_alquiler: gestores pueden ver y modificar
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

-- gastos_alquiler: gestores vía propiedad padre
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
