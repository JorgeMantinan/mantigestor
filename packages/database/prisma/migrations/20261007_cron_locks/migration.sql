-- M15 — Lock distribuido para los crons. El lock in-memory (Map por
-- instancia) no protege en Vercel: cada lamba tiene su propio Map y el cron
-- + el hook del navegador podían generar facturas recurrentes duplicadas.
-- Tabla con caducidad: compatible con pgbouncer (sin advisory locks de
-- sesión, que se liberarían al devolver la conexión al pool).

CREATE TABLE IF NOT EXISTS public.cron_locks (
  clave TEXT PRIMARY KEY,
  hasta TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.cron_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tomar_lock(p_clave TEXT, p_segundos INT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- limpieza de caducados (retención corta, no afecta al rendimiento)
  DELETE FROM cron_locks WHERE hasta < now() - interval '5 minutes';

  INSERT INTO cron_locks (clave, hasta)
  VALUES (p_clave, now() + make_interval(secs => GREATEST(p_segundos, 1)))
  ON CONFLICT (clave) DO UPDATE
    SET hasta = EXCLUDED.hasta
    WHERE cron_locks.hasta < now();
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.liberar_lock(p_clave TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM cron_locks WHERE clave = p_clave;
END $$;

-- Solo los crons (service_role vía admin client). Ni anon ni authenticated:
-- un usuario autenticado podría bloquear la generación de facturas ajenas.
REVOKE EXECUTE ON FUNCTION public.tomar_lock(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.liberar_lock(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tomar_lock(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.liberar_lock(TEXT) TO service_role;
