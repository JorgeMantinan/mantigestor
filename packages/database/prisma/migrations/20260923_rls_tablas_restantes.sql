-- =============================================================
-- RLS + GRANTs para las tablas de usuario que no los tenían
-- Tablas creadas por Prisma quedaban sin RLS y sin grants a authenticated
-- → rutas anon-key fallaban en runtime (proformas, audit, conciliación,
--   plantillas, recurrentes, chat AI, push, versiones, preferencias)
-- Este archivo es idempotente. Se ejecuta con:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --schema prisma\schema.prisma --file prisma/migrations/20260923_rls_tablas_restantes.sql
-- =============================================================

-- El helper public.es_gestor_del_perfil es creado por rls.sql.
-- Si la BD fuera nueva, ejecutar rls.sql antes que este archivo.

-- =============================================================
-- audit_log (SELECT, INSERT)
-- =============================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

DROP POLICY IF EXISTS "audit_log_select_own_or_gestor" ON public.audit_log;
CREATE POLICY "audit_log_select_own_or_gestor" ON public.audit_log
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "audit_log_insert_own_or_gestor" ON public.audit_log;
CREATE POLICY "audit_log_insert_own_or_gestor" ON public.audit_log
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- chat_historial (SELECT, INSERT)
-- =============================================================
ALTER TABLE public.chat_historial ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.chat_historial TO authenticated;
GRANT ALL ON public.chat_historial TO service_role;

DROP POLICY IF EXISTS "chat_historial_select_own_or_gestor" ON public.chat_historial;
CREATE POLICY "chat_historial_select_own_or_gestor" ON public.chat_historial
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "chat_historial_insert_own_or_gestor" ON public.chat_historial;
CREATE POLICY "chat_historial_insert_own_or_gestor" ON public.chat_historial
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- conciliacion_logs (INSERT, SELECT)
-- =============================================================
ALTER TABLE public.conciliacion_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.conciliacion_logs TO authenticated;
GRANT ALL ON public.conciliacion_logs TO service_role;

DROP POLICY IF EXISTS "conciliacion_logs_select_own_or_gestor" ON public.conciliacion_logs;
CREATE POLICY "conciliacion_logs_select_own_or_gestor" ON public.conciliacion_logs
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "conciliacion_logs_insert_own_or_gestor" ON public.conciliacion_logs;
CREATE POLICY "conciliacion_logs_insert_own_or_gestor" ON public.conciliacion_logs
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- facturas_recurrentes (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.facturas_recurrentes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_recurrentes TO authenticated;
GRANT ALL ON public.facturas_recurrentes TO service_role;

DROP POLICY IF EXISTS "facturas_recurrentes_select_own_or_gestor" ON public.facturas_recurrentes;
CREATE POLICY "facturas_recurrentes_select_own_or_gestor" ON public.facturas_recurrentes
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "facturas_recurrentes_insert_own_or_gestor" ON public.facturas_recurrentes;
CREATE POLICY "facturas_recurrentes_insert_own_or_gestor" ON public.facturas_recurrentes
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "facturas_recurrentes_update_own_or_gestor" ON public.facturas_recurrentes;
CREATE POLICY "facturas_recurrentes_update_own_or_gestor" ON public.facturas_recurrentes
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "facturas_recurrentes_delete_own_or_gestor" ON public.facturas_recurrentes;
CREATE POLICY "facturas_recurrentes_delete_own_or_gestor" ON public.facturas_recurrentes
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- movimientos_banco (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.movimientos_banco ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos_banco TO authenticated;
GRANT ALL ON public.movimientos_banco TO service_role;

DROP POLICY IF EXISTS "movimientos_banco_select_own_or_gestor" ON public.movimientos_banco;
CREATE POLICY "movimientos_banco_select_own_or_gestor" ON public.movimientos_banco
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "movimientos_banco_insert_own_or_gestor" ON public.movimientos_banco;
CREATE POLICY "movimientos_banco_insert_own_or_gestor" ON public.movimientos_banco
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "movimientos_banco_update_own_or_gestor" ON public.movimientos_banco;
CREATE POLICY "movimientos_banco_update_own_or_gestor" ON public.movimientos_banco
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "movimientos_banco_delete_own_or_gestor" ON public.movimientos_banco;
CREATE POLICY "movimientos_banco_delete_own_or_gestor" ON public.movimientos_banco
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- plantillas_factura (SELECT, INSERT)
-- =============================================================
ALTER TABLE public.plantillas_factura ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.plantillas_factura TO authenticated;
GRANT ALL ON public.plantillas_factura TO service_role;

DROP POLICY IF EXISTS "plantillas_factura_select_own_or_gestor" ON public.plantillas_factura;
CREATE POLICY "plantillas_factura_select_own_or_gestor" ON public.plantillas_factura
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "plantillas_factura_insert_own_or_gestor" ON public.plantillas_factura;
CREATE POLICY "plantillas_factura_insert_own_or_gestor" ON public.plantillas_factura
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- preferencias_notificaciones (SELECT, INSERT, DELETE)
-- =============================================================
ALTER TABLE public.preferencias_notificaciones ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.preferencias_notificaciones TO authenticated;
GRANT ALL ON public.preferencias_notificaciones TO service_role;

DROP POLICY IF EXISTS "preferencias_select_own_or_gestor" ON public.preferencias_notificaciones;
CREATE POLICY "preferencias_select_own_or_gestor" ON public.preferencias_notificaciones
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "preferencias_insert_own_or_gestor" ON public.preferencias_notificaciones;
CREATE POLICY "preferencias_insert_own_or_gestor" ON public.preferencias_notificaciones
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "preferencias_delete_own_or_gestor" ON public.preferencias_notificaciones;
CREATE POLICY "preferencias_delete_own_or_gestor" ON public.preferencias_notificaciones
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- proformas (SELECT, INSERT, UPDATE, DELETE)
-- =============================================================
ALTER TABLE public.proformas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proformas TO authenticated;
GRANT ALL ON public.proformas TO service_role;

DROP POLICY IF EXISTS "proformas_select_own_or_gestor" ON public.proformas;
CREATE POLICY "proformas_select_own_or_gestor" ON public.proformas
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "proformas_insert_own_or_gestor" ON public.proformas;
CREATE POLICY "proformas_insert_own_or_gestor" ON public.proformas
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "proformas_update_own_or_gestor" ON public.proformas;
CREATE POLICY "proformas_update_own_or_gestor" ON public.proformas
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "proformas_delete_own_or_gestor" ON public.proformas;
CREATE POLICY "proformas_delete_own_or_gestor" ON public.proformas
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- push_subscriptions (SELECT, INSERT, DELETE) — keyed por userId (= auth uid)
-- =============================================================
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.uid()::text = "userId");

-- =============================================================
-- versiones_registro (SELECT, INSERT)
-- =============================================================
ALTER TABLE public.versiones_registro ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.versiones_registro TO authenticated;
GRANT ALL ON public.versiones_registro TO service_role;

DROP POLICY IF EXISTS "versiones_select_own_or_gestor" ON public.versiones_registro;
CREATE POLICY "versiones_select_own_or_gestor" ON public.versiones_registro
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "versiones_insert_own_or_gestor" ON public.versiones_registro;
CREATE POLICY "versiones_insert_own_or_gestor" ON public.versiones_registro
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- invitaciones_pendientes: ENABLE RLS + cerrar policies (antes SELECT/UPDATE true)
-- >= El gestor ve sus invitaciones; el invitado (auth) puede leer/aceptar la suya
-- >= (El GET público /confirmar-asociacion pasa a usar createAdminClient)
-- =============================================================
ALTER TABLE public.invitaciones_pendientes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.invitaciones_pendientes TO authenticated;
GRANT ALL ON public.invitaciones_pendientes TO service_role;

-- Borrar policies antiguas demasiado abiertas (SELECT/UPDATE true)
DROP POLICY IF EXISTS "Usuarios pueden ver invitaciones" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "Usuarios pueden crear invitaciones" ON public.invitaciones_pendientes;
DROP POLICY IF EXISTS "Sistema puede actualizar invitaciones" ON public.invitaciones_pendientes;

DROP POLICY IF EXISTS "invitaciones_select_own_or_email" ON public.invitaciones_pendientes;
CREATE POLICY "invitaciones_select_own_or_email" ON public.invitaciones_pendientes
  FOR SELECT USING (
    auth.uid()::text = "invitadoPorUserId"
    OR (auth.jwt() ->> 'email') = "email"
  );

DROP POLICY IF EXISTS "invitaciones_insert_own" ON public.invitaciones_pendientes;
CREATE POLICY "invitaciones_insert_own" ON public.invitaciones_pendientes
  FOR INSERT WITH CHECK (auth.uid()::text = "invitadoPorUserId");

DROP POLICY IF EXISTS "invitaciones_update_own_or_email" ON public.invitaciones_pendientes;
CREATE POLICY "invitaciones_update_own_or_email" ON public.invitaciones_pendientes
  FOR UPDATE USING (
    auth.uid()::text = "invitadoPorUserId"
    OR (auth.jwt() ->> 'email') = "email"
  );

-- =============================================================
-- nominas: añadir acceso gestor (antes solo auth.uid() = perfilId)
-- =============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nominas TO authenticated;
GRANT ALL ON public.nominas TO service_role;

DROP POLICY IF EXISTS "nominas_select_own" ON public.nominas;
CREATE POLICY "nominas_select_own" ON public.nominas
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "nominas_insert_own" ON public.nominas;
CREATE POLICY "nominas_insert_own" ON public.nominas
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "nominas_update_own" ON public.nominas;
CREATE POLICY "nominas_update_own" ON public.nominas
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "nominas_delete_own" ON public.nominas;
CREATE POLICY "nominas_delete_own" ON public.nominas
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

-- =============================================================
-- Perfiles: también dar acceso a gestores (el gestor necesita leer
-- el perfil de la persona gestionada) y a service_role de escritura
-- =============================================================
GRANT ALL ON public.perfiles TO service_role;

DROP POLICY IF EXISTS "perfiles_select_propio" ON public.perfiles;
CREATE POLICY "perfiles_select_propio" ON public.perfiles
  FOR SELECT USING (
    "userId" = (auth.uid())::text
    OR id = (auth.uid())::text
    OR public.es_gestor_del_perfil(auth.uid()::text, id)
  );

DROP POLICY IF EXISTS "perfiles_update_propio" ON public.perfiles;
CREATE POLICY "perfiles_update_propio" ON public.perfiles
  FOR UPDATE USING (
    ("userId" = (auth.uid())::text OR id = (auth.uid())::text)
  );

-- =============================================================
-- suscripciones: el perfil activo puede ser gestionado → gestor debe leer
-- =============================================================
GRANT SELECT ON public.suscripciones TO authenticated;
GRANT ALL ON public.suscripciones TO service_role;

DROP POLICY IF EXISTS "Users can select own subscription" ON public.suscripciones;
CREATE POLICY "Users can select own subscription" ON public.suscripciones
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );