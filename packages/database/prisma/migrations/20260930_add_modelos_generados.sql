-- Tabla modelos_generados: modelos fiscales calculados automáticamente (303, 111, 130...)
-- Se regeneran (borrado + inserción) cuando cambian las facturas/nóminas del periodo.
-- Ejecutar:
--   pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260930_add_modelos_generados.sql

CREATE TABLE IF NOT EXISTS public."modelos_generados" (
  "id"           TEXT PRIMARY KEY,
  "perfilId"     TEXT NOT NULL,
  "modelo"       TEXT NOT NULL,
  "titulo"       TEXT NOT NULL DEFAULT '',
  "periodicidad" TEXT NOT NULL DEFAULT 'trimestral',
  "trimestre"    INTEGER NOT NULL DEFAULT 0,
  "anyo"         INTEGER NOT NULL,
  "fingerprint"  TEXT NOT NULL,
  "totalCents"   INTEGER NOT NULL DEFAULT 0,
  "datos"        JSONB NOT NULL DEFAULT '{}'::jsonb,
  "estado"       TEXT NOT NULL DEFAULT 'borrador',
  "generadoEn"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "modelos_generados_perfilId_modelo_anyo_trimestre_key"
  ON public."modelos_generados" ("perfilId", "modelo", "anyo", "trimestre");

CREATE INDEX IF NOT EXISTS "modelos_generados_perfilId_anyo_idx"
  ON public."modelos_generados" ("perfilId", "anyo");

ALTER TABLE public."modelos_generados" ENABLE ROW LEVEL SECURITY;

-- RLS: el propietario del perfil y sus gestores pueden acceder
DROP POLICY IF EXISTS "Users can select own modelos_generados" ON public."modelos_generados";
CREATE POLICY "Users can select own modelos_generados" ON public."modelos_generados"
  FOR SELECT USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can insert own modelos_generados" ON public."modelos_generados";
CREATE POLICY "Users can insert own modelos_generados" ON public."modelos_generados"
  FOR INSERT WITH CHECK (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can update own modelos_generados" ON public."modelos_generados";
CREATE POLICY "Users can update own modelos_generados" ON public."modelos_generados"
  FOR UPDATE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

DROP POLICY IF EXISTS "Users can delete own modelos_generados" ON public."modelos_generados";
CREATE POLICY "Users can delete own modelos_generados" ON public."modelos_generados"
  FOR DELETE USING (
    auth.uid()::text = "perfilId"
    OR public.es_gestor_del_perfil(auth.uid()::text, "perfilId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."modelos_generados" TO authenticated;
GRANT ALL ON public."modelos_generados" TO service_role;
