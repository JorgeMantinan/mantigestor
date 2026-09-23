-- =============================================================
-- Fixes RLS tras auditoría (idempotente) — 2026-09-23
-- 1. notificaciones: FALTA policy INSERT → POST /api/notificaciones
--    devolvía 500 y los recordatorios fiscales in-app se perdían
-- 2. perfil_asociado: DELETE exigía auth.uid = ownerUserId →
--    revocar-acceso (dueño del perfil) borraba 0 filas sin error
-- 3. perfiles: UPDATE sin cláusula gestor → el gestor no puede
--    editar el perfil fiscal de la persona gestionada
-- (examenes: sin modelo en schema.prisma ni tabla en BD — se omite)
-- Ejecutar con:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --schema prisma\schema.prisma --file prisma/migrations/20260923_rls_fixes.sql
-- =============================================================

-- 1. notificaciones: INSERT own-or-gestor
GRANT INSERT ON public.notificaciones TO authenticated;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notificaciones;
CREATE POLICY "Users can insert own notifications" ON public.notificaciones
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- 2. perfil_asociado: el dueño del perfil puede revocar accesos.
--    (La condición sobre perfiles fija id/userId = auth.uid, así que
--    aunque perfiles sea visible para gestores, solo el dueño coincide.)
DROP POLICY IF EXISTS "Users can delete own associations" ON public."perfil_asociado";
CREATE POLICY "Users can delete own associations" ON public."perfil_asociado"
  FOR DELETE USING (
    auth.uid()::text = "ownerUserId"
    OR EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = "perfilId"
        AND (p.id = auth.uid()::text OR p."userId" = auth.uid()::text)
    )
  );

-- 3. perfiles: UPDATE own-or-gestor (lectura ya tenía gestor)
DROP POLICY IF EXISTS "perfiles_update_propio" ON public.perfiles;
CREATE POLICY "perfiles_update_propio" ON public.perfiles
  FOR UPDATE USING (
    "userId" = auth.uid()::text
    OR id = auth.uid()::text
    OR public.es_gestor_del_perfil(auth.uid()::text, id)
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR id = auth.uid()::text
    OR public.es_gestor_del_perfil(auth.uid()::text, id)
  );

