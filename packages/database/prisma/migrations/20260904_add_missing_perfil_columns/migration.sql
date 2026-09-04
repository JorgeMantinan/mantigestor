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
