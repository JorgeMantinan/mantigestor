-- ============================================================
-- Auditoría P0 (2026-10-05): referidos ≠ gestión, transparencia
-- de gestores y reescritura de las URLs de storage migradas.
-- Ejecutar:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/migrations/20261005_referidos_storage/migration.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) invitaciones_pendientes: columna `tipo` (+ `rol` que existía
--    en BD pero no en schema.prisma → drift corregido)
-- ------------------------------------------------------------
ALTER TABLE public.invitaciones_pendientes ADD COLUMN IF NOT EXISTS "rol" TEXT;
ALTER TABLE public.invitaciones_pendientes ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'gestion';

-- Las invitaciones antiguas sin `rol` son las de referidos (asociar-persona
-- siempre escribía rol): no deben seguir pudiendo crear una gestión.
UPDATE public.invitaciones_pendientes SET "tipo" = 'referido' WHERE "rol" IS NULL;

DO $$ BEGIN
  ALTER TABLE public.invitaciones_pendientes
    ADD CONSTRAINT invitaciones_pendientes_tipo_chk CHECK ("tipo" IN ('gestion', 'referido'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 2) RPC: datos de QUIÉN me gestora (a mí)
--    La víctima no tiene acceso a los perfiles de sus gestores
--    (por eso obtener_perfiles_por_ids devuelve vacío), pero sí
--    necesita verlos para poder revocarlos desde mis-personas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.datos_gestores_de_mi_perfil()
RETURNS TABLE(id TEXT, nombre TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.nombre, p.email
  FROM public.perfiles p
  WHERE p.id IN (
    SELECT pa."perfilId"
    FROM public."perfil_asociado" pa
    WHERE pa."ownerUserId" IN (
      SELECT pp.id FROM public.perfiles pp
      WHERE pp."userId" = auth.uid()::text OR pp.id = auth.uid()::text
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.datos_gestores_de_mi_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.datos_gestores_de_mi_perfil() TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3) Storage: reescribir las URLs de los objetos movidos de
--    `fiscal/*` a `<perfilId>/fiscal/*` (los objetos se movieron
--    en 20261002 pero la columna `url` seguía apuntando a la ruta
--    antigua → enlaces 404 y OCR rechazado)
-- ------------------------------------------------------------
UPDATE public.documentos
SET url = REPLACE(url, '/object/public/documentos/fiscal/', '/object/public/documentos/' || "perfilId" || '/fiscal/')
WHERE url LIKE '%/object/public/documentos/fiscal/%';
