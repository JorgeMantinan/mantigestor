-- ============================================================
-- Rol visualizador: solo lectura real (BD + servidor) y guardas
-- de servidor en las rutas de escritura.
-- Ejecutar con:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- tsx scripts/run-sql-pg.ts prisma/migrations/20261007_rol_visualizador/migration.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: ¿es el llamante visualizador de ese perfil?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_visualizador_del_perfil(user_id TEXT, target_perfil_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."perfil_asociado"
    WHERE "ownerUserId" = user_id
      AND "perfilId" = target_perfil_id
      AND "rol" = 'visualizador'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.es_visualizador_del_perfil(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_visualizador_del_perfil(TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2) Policies de LECTURA para visualizador. Son PERMISSIVE: se ORan
--    con las existentes (dueño/gestor siguen leyendo igual) y como
--    no tocan INSERT/UPDATE/DELETE, el rol sigue sin poder escribir
--    en ninguna tabla.
-- ------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_log', 'chat_historial', 'conciliacion_logs', 'documentos',
    'encuestas_satisfaccion', 'facturas', 'facturas_recurrentes',
    'modelos_generados', 'movimientos_banco', 'nominas', 'notificaciones',
    'plantillas_factura', 'preferencias_notificaciones', 'proformas',
    'propiedades_alquiler', 'suscripciones', 'versiones_registro'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "visualizador_select" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "visualizador_select" ON public.%I FOR SELECT USING (public.es_visualizador_del_perfil((auth.uid())::text, "perfilId"))',
      t
    );
  END LOOP;
END $$;

-- gastos_alquiler: el perfil dueño del gasto viene de la propiedad
DROP POLICY IF EXISTS "visualizador_select" ON public.gastos_alquiler;
CREATE POLICY "visualizador_select" ON public.gastos_alquiler FOR SELECT
  USING (public.es_visualizador_del_perfil(
    (auth.uid())::text,
    (SELECT pa."perfilId" FROM public.propiedades_alquiler pa WHERE pa.id = gastos_alquiler."propiedadId")
  ));

-- perfiles: el visualizador también lee el perfil que gestiona
DROP POLICY IF EXISTS "perfiles_select_propio" ON public.perfiles;
CREATE POLICY "perfiles_select_propio" ON public.perfiles FOR SELECT USING (
  ("userId" = (auth.uid())::text)
  OR (id = (auth.uid())::text)
  OR es_gestor_del_perfil((auth.uid())::text, id)
  OR EXISTS (
    SELECT 1 FROM public."perfil_asociado" pa
    WHERE pa."ownerUserId" = (auth.uid())::text
      AND pa."perfilId" = perfiles.id
      AND pa."rol" = 'visualizador'
  )
);

-- ------------------------------------------------------------
-- 3) Storage: el visualizador LEE la carpeta gestionada, pero NO
--    puede subir ni borrar (antes el UNION incluía cualquier rol).
--    (La política SELECT no se toca: ya incluye cualquier rol.)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
    )
  );

-- ------------------------------------------------------------
-- 4) La RPC de asociación exige YA en servidor la invitación de
--    tipo 'gestion' (antes el filtro vivía solo en el cliente)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_asociacion_segura(
  p_owner_user_id TEXT,
  p_perfil_id TEXT,
  p_rol TEXT DEFAULT 'gestor'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = p_perfil_id
      AND (p."userId" = auth.uid()::text OR p.id = auth.uid()::text)
  ) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invitaciones_pendientes i
    WHERE i."invitadoPorUserId" = p_owner_user_id
      AND lower(i.email) = lower(COALESCE(auth.email(), ''))
      AND i.aceptada = false
      AND i."tipo" = 'gestion'
  ) THEN
    RAISE EXCEPTION 'sin_invitacion';
  END IF;

  IF p_rol NOT IN ('gestor', 'propietario', 'visualizador') THEN
    RAISE EXCEPTION 'rol_invalido';
  END IF;

  INSERT INTO public.perfil_asociado (id, "ownerUserId", "perfilId", rol)
  VALUES (gen_random_uuid()::TEXT, p_owner_user_id, p_perfil_id, p_rol)
  ON CONFLICT ("ownerUserId", "perfilId") DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_asociacion_segura(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_asociacion_segura(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 5) Sincronizar las policies de `perfiles` que existían solo en
--    BD (no estaban en el repo): si alguien reconstruye la BD
--    desde los scripts, el alta de usuarios debe seguir funcionando.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "perfiles_insert_propio" ON public.perfiles;
CREATE POLICY "perfiles_insert_propio" ON public.perfiles FOR INSERT
  WITH CHECK ((
    "userId" = (auth.uid())::text
    OR id = (auth.uid())::text
  ));

DROP POLICY IF EXISTS "perfiles_update_propio" ON public.perfiles;
CREATE POLICY "perfiles_update_propio" ON public.perfiles FOR UPDATE
  USING ((
    "userId" = (auth.uid())::text
    OR id = (auth.uid())::text
    OR es_gestor_del_perfil((auth.uid())::text, id)
  ))
  WITH CHECK ((
    "userId" = (auth.uid())::text
    OR id = (auth.uid())::text
    OR es_gestor_del_perfil((auth.uid())::text, id)
  ));
