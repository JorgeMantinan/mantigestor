-- Añade columna 'rol' a la tabla nominas para distinguir jefe/empleado
-- Ejecutar en Supabase SQL Editor si la columna no existe

ALTER TABLE nominas ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'jefe';

-- Migrar datos existentes: si no tienen rol, asumimos 'jefe' (empleador)
UPDATE nominas SET rol = 'jefe' WHERE rol IS NULL;
