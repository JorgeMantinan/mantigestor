-- M14 — La numeración de facturas no tenía restricción: doble clic en
-- "Nueva factura" o cron+manual simultáneo podían duplicar el mismo número
-- (integridad fiscal). Verificado:0 duplicados previos → índice seguro.
CREATE UNIQUE INDEX IF NOT EXISTS facturas_perfil_numero_unico
  ON public.facturas ("perfilId", numero);
