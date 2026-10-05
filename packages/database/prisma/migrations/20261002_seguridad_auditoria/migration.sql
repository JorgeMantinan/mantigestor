-- ============================================================
-- Auditoría de seguridad — Fase 0 (MantiGestor)
-- Ejecutar:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/migrations/20261002_seguridad_auditoria/migration.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) Backfill: perfiles legacy sin userId (id = auth uid)
-- ------------------------------------------------------------
UPDATE public.perfiles
SET "userId" = id
WHERE "userId" IS NULL
  AND id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- ------------------------------------------------------------
-- 2) perfiles_accesibles: además de userId, acepta id = uid (legacy)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perfiles_accesibles(user_id TEXT)
RETURNS SETOF TEXT AS $$
  SELECT id FROM public.perfiles WHERE "userId" = user_id OR id = user_id
  UNION
  SELECT "perfilId" FROM public."perfil_asociado"
  WHERE "ownerUserId" = user_id AND "rol" IN ('gestor', 'propietario');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- 3) crear_asociacion_segura (C1):
--    Solo la PERSONA INVITADA puede asociar su propio perfil,
--    y solo con un gestor que tenga una invitación pendiente
--    para su email. El enlace de invitación es la confirmación.
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
  -- (a) el perfil a gestionar debe pertenecer a quien llama
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = p_perfil_id
      AND (p."userId" = auth.uid()::text OR p.id = auth.uid()::text)
  ) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  -- (b) debe existir una invitación pendiente de ese gestor
  --     para el email del llamante (la confirmación por enlace)
  IF NOT EXISTS (
    SELECT 1 FROM public.invitaciones_pendientes i
    WHERE i."invitadoPorUserId" = p_owner_user_id
      AND lower(i.email) = lower(COALESCE(auth.email(), ''))
      AND i.aceptada = false
  ) THEN
    RAISE EXCEPTION 'sin_invitacion';
  END IF;

  -- (c) rol válido
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
-- 4) obtener_perfiles_por_ids (C2): solo perfiles accesibles.
--    Sin uid (service_role) devuelve los ids pedidos; anónimo no
--    puede ejecutar la función (REVOKE más abajo).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.obtener_perfiles_por_ids(p_ids TEXT[])
RETURNS TABLE(id TEXT, nombre TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT p.id, p.nombre, p.email
    FROM public.perfiles p
    WHERE p.id = ANY(p_ids)
      AND p.id IN (SELECT public.perfiles_accesibles(auth.uid()::text));
  ELSE
    RETURN QUERY
    SELECT p.id, p.nombre, p.email
    FROM public.perfiles p
    WHERE p.id = ANY(p_ids);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.obtener_perfiles_por_ids(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_perfiles_por_ids(TEXT[]) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 5) obtener_gestores_de_perfil: solo si el llamante tiene
--    acceso al perfil (propietario o gestor del mismo)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.obtener_gestores_de_perfil(TEXT);

CREATE FUNCTION public.obtener_gestores_de_perfil(p_perfil_id TEXT)
RETURNS TABLE("ownerUserId" TEXT, rol TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (p_perfil_id IN (SELECT public.perfiles_accesibles(auth.uid()::text))) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  RETURN QUERY
  SELECT pa."ownerUserId", pa.rol
  FROM public."perfil_asociado" pa
  WHERE pa."perfilId" = p_perfil_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.obtener_gestores_de_perfil(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_gestores_de_perfil(TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 6) invitaciones_pendientes: policies unificadas y restringidas
--    (sustituye a todas las versiones anteriores)
-- ------------------------------------------------------------
ALTER TABLE public.invitaciones_pendientes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.invitaciones_pendientes TO authenticated;
GRANT ALL ON public.invitaciones_pendientes TO service_role;

DROP POLICY IF EXISTS "Usuarios pueden ver invitaciones" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "Usuarios pueden ver invitaciones a su email" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "Usuarios pueden crear invitaciones" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "Sistema puede actualizar invitaciones" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "invitaciones_select_own_or_email" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "invitaciones_insert_own" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "invitaciones_update_own_or_email" ON public.invitaciones_pendientes;

CREATE POLICY "invitaciones_select_own_or_email" ON public.invitaciones_pendientes
  FOR SELECT USING (
    auth.uid()::text = "invitadoPorUserId"
    OR lower(COALESCE(auth.email(), '')) = lower(email)
  );

CREATE POLICY "invitaciones_insert_own" ON public.invitaciones_pendientes
  FOR INSERT WITH CHECK (auth.uid()::text = "invitadoPorUserId");

CREATE POLICY "invitaciones_update_own_or_email" ON public.invitaciones_pendientes
  FOR UPDATE USING (
    auth.uid()::text = "invitadoPorUserId"
    OR lower(COALESCE(auth.email(), '')) = lower(email)
  )
  WITH CHECK (
    auth.uid()::text = "invitadoPorUserId"
    OR lower(COALESCE(auth.email(), '')) = lower(email)
  );

-- ------------------------------------------------------------
-- 7) Storage (C3): buckets PRIVADOS + propiedad por carpeta
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documentos', 'documentos', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backups', 'backups', false, NULL)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Mover los documentos de la carpeta compartida 'fiscal/*' a la
-- carpeta de su dueño (recuperables desde la tabla documentos)
UPDATE storage.objects o
SET name = d."perfilId" || '/' || o.name
FROM public.documentos d
WHERE o.bucket_id = 'documentos'
  AND o.name LIKE 'fiscal/%'
  AND d.url LIKE '%/storage/v1/object/public/documentos/' || o.name;

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
      UNION
      SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
CREATE POLICY "Authenticated users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
      UNION
      SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
      UNION
      SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = auth.uid()::text
    )
  );
