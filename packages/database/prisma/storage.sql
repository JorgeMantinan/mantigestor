-- ============================================================
-- Storage — estado final tras la auditoría de seguridad (Fase 0)
-- Los buckets son PRIVADOS: las URLs se firman en tiempo de lectura
-- (lib/storage.ts en cliente, lib/storage-server.ts en servidor).
-- Se ejecuta con: pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/storage.sql
-- ============================================================

-- Buckets privados
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documentos', 'documentos', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backups', 'backups', false, NULL)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Propiedad por carpeta: el primer componente del path debe ser un
-- perfil propio (perfiles.userId = uid) o un perfil asociado (cualquier rol).
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
      UNION
      SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
CREATE POLICY "Authenticated users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
      UNION
      SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT public.perfiles_accesibles(auth.uid()::text)
      UNION
      SELECT "perfilId" FROM public."perfil_asociado" WHERE "ownerUserId" = auth.uid()::text
    )
  );
