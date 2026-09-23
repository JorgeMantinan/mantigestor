-- Tabla encuestas_satisfaccion: encuestas de satisfacción del gestor sobre sus clientes
CREATE TABLE IF NOT EXISTS public."encuestas_satisfaccion" (
  "id"            TEXT PRIMARY KEY,
  "perfilId"      TEXT NOT NULL,
  "clienteNombre" TEXT NOT NULL,
  "clienteEmail"  TEXT,
  "puntuacion"    INTEGER NOT NULL,
  "comentario"    TEXT,
  "creadoEn"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "encuestas_satisfaccion_perfilId_idx" ON public."encuestas_satisfaccion" ("perfilId");

ALTER TABLE public."encuestas_satisfaccion" ENABLE ROW LEVEL SECURITY;

-- RLS: el propietario del perfil y sus gestores pueden acceder
DROP POLICY IF EXISTS "Users can select own surveys" ON public."encuestas_satisfaccion";
CREATE POLICY "Users can select own surveys" ON public."encuestas_satisfaccion"
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can insert own surveys" ON public."encuestas_satisfaccion";
CREATE POLICY "Users can insert own surveys" ON public."encuestas_satisfaccion"
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can update own surveys" ON public."encuestas_satisfaccion";
CREATE POLICY "Users can update own surveys" ON public."encuestas_satisfaccion"
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can delete own surveys" ON public."encuestas_satisfaccion";
CREATE POLICY "Users can delete own surveys" ON public."encuestas_satisfaccion"
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."encuestas_satisfaccion" TO authenticated;
GRANT ALL ON public."encuestas_satisfaccion" TO service_role;