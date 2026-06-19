-- Crear bucket de Storage para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documentos', 'documentos', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Política: usuarios autenticados pueden subir a su propia carpeta
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
  );

-- Política: usuarios pueden ver sus propios archivos
DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
CREATE POLICY "Authenticated users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
  );

-- Política: usuarios pueden eliminar sus propios archivos
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
  );
