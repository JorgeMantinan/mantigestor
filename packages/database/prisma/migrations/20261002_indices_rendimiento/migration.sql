-- Índices de rendimiento (auditoría Fase 4)
-- Ejecutar:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/migrations/20261002_indices_rendimiento/migration.sql

-- Facturas: consultas de vencimientos (recordatorios, alertas de gestor)
CREATE INDEX IF NOT EXISTS "Factura_perfilId_estado_fechaVencimiento_idx"
  ON public.facturas("perfilId", "estado", "fechaVencimiento");

-- Gastos de alquiler: la tabla no tenía NINGÚN índice y relationMode=prisma
-- impide el índice automático de la FK
CREATE INDEX IF NOT EXISTS "GastoAlquiler_propiedadId_idx"
  ON public.gastos_alquiler("propiedadId");

-- Notificaciones: se listan por fecha dentro de un perfil
CREATE INDEX IF NOT EXISTS "Notificacion_perfilId_creadoEn_idx"
  ON public.notificaciones("perfilId", "creadoEn");

-- Audit log: filtro por perfil + orden por fecha (antes dos índices sueltos)
CREATE INDEX IF NOT EXISTS "AuditLog_perfilId_createdAt_idx"
  ON public.audit_log("perfilId", "createdAt");

-- Perfil asociado: consultas inversas (¿quién gestiona este perfil?)
CREATE INDEX IF NOT EXISTS "PerfilAsociado_perfilId_idx"
  ON public."perfil_asociado"("perfilId");

-- Invitaciones: lookup por email en registro/confirmación
CREATE INDEX IF NOT EXISTS "InvitacionPendiente_email_idx"
  ON public.invitaciones_pendientes("email");
