-- Migración: Añadir columnas faltantes a perfiles
-- Ejecutar en Supabase SQL Editor

-- Columnas de perfil fiscal
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "comunidadFiscal" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "perfilFiscal" TEXT;

-- Columnas de facturas
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "notasPie" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "logoBase64" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "firmaBase64" TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "idiomaFactura" TEXT DEFAULT 'es';

-- Columna multi-empresa
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "empresas" TEXT;

-- Columna de moneda por defecto
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "monedaPorDefecto" TEXT DEFAULT 'EUR';

-- Verificar columnas añadidas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'perfiles'
ORDER BY ordinal_position;

-- Función para crear perfil pendiente (bypasea RLS)
-- Esta función usa SECURITY DEFINER para poder insertar perfiles
-- con userId diferente al del usuario autenticado
CREATE OR REPLACE FUNCTION crear_perfil_pendiente(
  p_email TEXT,
  p_nombre TEXT DEFAULT NULL,
  p_nif TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_id := gen_random_uuid()::TEXT;

  INSERT INTO perfiles (id, "userId", email, nombre, nif, "createdAt", "updatedAt")
  VALUES (v_id, 'pending:' || p_email, p_email, p_nombre, p_nif, v_now, v_now);

  RETURN v_id;
END;
$$;
