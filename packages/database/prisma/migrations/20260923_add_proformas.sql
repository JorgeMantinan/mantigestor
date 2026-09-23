-- Tabla proformas: presupuestos/proformas convertibles a factura
CREATE TABLE IF NOT EXISTS public."proformas" (
  "id"            TEXT PRIMARY KEY,
  "perfilId"      TEXT NOT NULL,
  "numero"        TEXT NOT NULL,
  "clienteNombre" TEXT NOT NULL,
  "clienteNif"    TEXT,
  "fecha"         TIMESTAMPTZ NOT NULL,
  "validezDias"   INTEGER NOT NULL DEFAULT 30,
  "concepto"      TEXT NOT NULL,
  "baseImponible" INTEGER NOT NULL,
  "iva"           INTEGER NOT NULL,
  "total"         INTEGER NOT NULL,
  "estado"        TEXT NOT NULL DEFAULT 'borrador',
  "notas"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "proformas_perfilId_idx" ON public."proformas" ("perfilId");

ALTER TABLE public."proformas" ENABLE ROW LEVEL SECURITY;

-- RLS: el propietario del perfil y sus gestores pueden acceder
DROP POLICY IF EXISTS "Users can select own proformas" ON public."proformas";
CREATE POLICY "Users can select own proformas" ON public."proformas"
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can insert own proformas" ON public."proformas";
CREATE POLICY "Users can insert own proformas" ON public."proformas"
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can update own proformas" ON public."proformas";
CREATE POLICY "Users can update own proformas" ON public."proformas"
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can delete own proformas" ON public."proformas";
CREATE POLICY "Users can delete own proformas" ON public."proformas"
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."proformas" TO authenticated;
GRANT ALL ON public."proformas" TO service_role;
