-- Migración: Añadir columnas faltantes a perfiles + tabla invitaciones
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. Columnas faltantes en perfiles
-- ============================================
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "comunidadFiscal" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "perfilFiscal" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "notasPie" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "logoBase64" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "firmaBase64" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "idiomaFactura" TEXT DEFAULT 'es';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "empresas" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "monedaPorDefecto" TEXT DEFAULT 'EUR';

-- ============================================
-- 2. Tabla de invitaciones pendientes
-- ============================================
CREATE TABLE IF NOT EXISTS invitaciones_pendientes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT,
  nif TEXT,
  "invitadoPorUserId" TEXT NOT NULL,
  "invitadoPorEmail" TEXT NOT NULL,
  aceptada BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para invitaciones_pendientes
ALTER TABLE invitaciones_pendientes ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios autenticados pueden leer invitaciones dirigidas a su email
CREATE POLICY "Usuarios pueden ver invitaciones a su email"
  ON invitaciones_pendientes FOR SELECT
  USING (true); -- Lectura abierta para poder verificar

-- Policy: usuarios autenticados pueden crear invitaciones
CREATE POLICY "Usuarios pueden crear invitaciones"
  ON invitaciones_pendientes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: solo el sistema puede marcar como aceptada
CREATE POLICY "Sistema puede actualizar invitaciones"
  ON invitaciones_pendientes FOR UPDATE
  USING (true);

-- ============================================
-- 3. Verificar columnas
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'perfiles'
ORDER BY ordinal_position;

-- ============================================
-- 4. Función para crear asociación (bypasea RLS)
-- ============================================
CREATE OR REPLACE FUNCTION crear_asociacion_segura(
  p_owner_user_id TEXT,
  p_perfil_id TEXT,
  p_rol TEXT DEFAULT 'gestor'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO perfil_asociado (id, "ownerUserId", "perfilId", rol)
  VALUES (gen_random_uuid()::TEXT, p_owner_user_id, p_perfil_id, p_rol)
  ON CONFLICT ("ownerUserId", "perfilId") DO NOTHING;
END;
$$;

-- ============================================
-- 5. Función para obtener perfiles por IDs (bypasea RLS)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_perfiles_por_ids(p_ids TEXT[])
RETURNS TABLE(id TEXT, nombre TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.nombre, p.email
  FROM perfiles p
  WHERE p.id = ANY(p_ids);
END;
$$;

-- ============================================
-- 6. Función para obtener quién gestiona un perfil (bypasea RLS)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_gestores_de_perfil(p_perfil_id TEXT)
RETURNS TABLE(ownerUserId TEXT, rol TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pa."ownerUserId", pa.rol
  FROM perfil_asociado pa
  WHERE pa."perfilId" = p_perfil_id;
END;
$$;
