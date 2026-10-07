-- Auditoría 2026-10-07 (fase ALTO)
-- A1 — EXPLOTADO EN VIVO: la policy de INSERT de perfil_asociado solo exigía
--   ownerUserId=auth.uid(); cualquier autenticado podía insertarse como
--   'gestor' de cualquier perfil conocido (201) y leer todas sus facturas.
--   La RPC crear_asociacion_segura era bypeable por PostgREST.
--   Ahora el INSERT directo SOLO permite el vínculo propietario de registro
--   (owner=perfil=auth.uid, rol='propietario'); gestor/visualizador solo
--   vía la RPC, que exige invitación tipo='gestion'.

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'perfil_asociado' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.perfil_asociado', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY insert_solo_vinculo_propietario ON public.perfil_asociado
  FOR INSERT
  WITH CHECK (
    "ownerUserId" = (auth.uid())::text
    AND "perfilId" = (auth.uid())::text
    AND "rol" = 'propietario'
  );

-- M2 — perfiles_update_propio no restringía columnas: un gestor podía cambiar
--   perfiles.userId y lockear a la víctima. Ahora solo service_role (o la
--   adopción de un perfil con userId 'pending:...') puede cambiarlo.
--   Sin request.jwt.claims (conexión directa a la BD: scripts/migraciones) se
--   permite: esa vía ya tiene credenciales de propietario de la BD.
CREATE OR REPLACE FUNCTION public.proteger_user_id_perfil() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
  v_role text := '';
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    IF v_claims IS NOT NULL AND v_claims <> '' THEN
      BEGIN
        v_role := coalesce(v_claims::jsonb ->> 'role', '');
      EXCEPTION WHEN others THEN
        v_role := '';
      END;
      IF OLD."userId" NOT LIKE 'pending:%' AND v_role <> 'service_role' THEN
        RAISE EXCEPTION 'no permitido modificar userId del perfil';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_proteger_user_id ON public.perfiles;
CREATE TRIGGER trg_proteger_user_id
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_user_id_perfil();

-- M3 + BAJO — funciones SECURITY DEFINER con EXECUTE para anon/PUBLIC y sin
--   search_path: crear_perfil_pendiente es código muerto (0 usos en la app);
--   perfiles_accesibles/es_gestor_del_perfil solo deben correr autenticados.
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('crear_perfil_pendiente', 'perfiles_accesibles', 'es_gestor_del_perfil')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    IF f.proname <> 'crear_perfil_pendiente' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
    END IF;
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.sig);
  END LOOP;
END $$;
