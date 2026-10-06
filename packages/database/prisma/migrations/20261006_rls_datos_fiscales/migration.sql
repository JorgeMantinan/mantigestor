-- ============================================================
-- Alerta Supabase "rls_disabled_in_public" (2026-10-03)
-- 28 tablas (datos fiscales de referencia + logs de importación)
-- tenían RLS desactivado con grants de anon → cualquiera con la
-- anon key podía leerlas (y truncarlas).
-- Ejecutar:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/migrations/20261006_rls_datos_fiscales/migration.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) RLS en TODA tabla pública que no lo tenga (fail-closed):
--    sin policy = nadie accede vía PostgREST (solo service_role
--    y la conexión directa de Prisma/seeds, que bypasean RLS).
--    A futuro, cualquier tabla creada a mano queda protegida
--    aunque se olvide la política.
-- ------------------------------------------------------------
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2) Las tablas de referencia fiscal que la APP sí lee con la
--    sesión del usuario necesitan lectura autenticada (son datos
--    oficiales sin PII: escalas IRPF, mínimos, VAT, RETA...).
-- ------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cotizaciones_seg_social',
    'deadlines',
    'deducciones_autonomicas',
    'irpf_tramos_ahorro',
    'irpf_tramos_autonomicos',
    'irpf_tramos_estatales',
    'is_tipos',
    'minimo_personal_familiar',
    'patrimonio_bonificaciones',
    'patrimonio_escala_estatal',
    'reducciones_generales_irpf',
    'reta_tramos',
    'vat_rules'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "lectura_usuarios_autenticados" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "lectura_usuarios_autenticados" ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3) Grants: la app NUNCA consulta con la rol anon (todas las
--    rutas públicas usan service_role o no tocan BD) y nadie
--    hace TRUNCATE vía API (PostgREST no lo expone; el TRUNCATE
--    además no está cubierto por las policies de fila).
-- ------------------------------------------------------------
REVOKE SELECT, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;
