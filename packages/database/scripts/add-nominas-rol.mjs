/**
 * Crea la tabla 'nominas' en Supabase si no existe, con columna 'rol'.
 * Ejecutar: node --experimental-modules packages/database/scripts/add-nominas-rol.mjs
 */
import { PrismaClient } from '@prisma/client'

for (const line of (await import('fs')).readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nominas (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "perfilId" TEXT NOT NULL,
      empleada TEXT NOT NULL,
      mes INTEGER NOT NULL,
      anyo INTEGER NOT NULL,
      "salarioBruto" INTEGER NOT NULL,
      irpf DOUBLE PRECISION NOT NULL DEFAULT 0,
      "seguridadSocial" INTEGER NOT NULL DEFAULT 0,
      neto INTEGER NOT NULL DEFAULT 0,
      rol TEXT NOT NULL DEFAULT 'jefe',
      "pdfUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  console.log('✅ Tabla "nominas" creada (o ya existía)')

  await prisma.$executeRawUnsafe(`
    ALTER TABLE nominas ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'jefe'
  `)
  console.log('✅ Columna "rol" verificada')

  await prisma.$executeRawUnsafe(`
    UPDATE nominas SET rol = 'jefe' WHERE rol IS NULL
  `)
  console.log('✅ Datos existentes migrados')

  // RLS policies
  await prisma.$executeRawUnsafe(`
    ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominas_select_own' AND tablename = 'nominas') THEN
        CREATE POLICY nominas_select_own ON nominas FOR SELECT USING (auth.uid()::text = "perfilId");
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominas_insert_own' AND tablename = 'nominas') THEN
        CREATE POLICY nominas_insert_own ON nominas FOR INSERT WITH CHECK (auth.uid()::text = "perfilId");
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominas_delete_own' AND tablename = 'nominas') THEN
        CREATE POLICY nominas_delete_own ON nominas FOR DELETE USING (auth.uid()::text = "perfilId");
      END IF;
    END $$;
  `)
  console.log('✅ RLS policies configuradas')
} catch (e) {
  console.error('⚠️  Error:', e.message)
} finally {
  await prisma.$disconnect()
}
