/**
 * Crea la tabla 'facturas_recurrentes' en Supabase.
 * Ejecutar: node --experimental-modules packages/database/scripts/add-facturas-recurrentes.mjs
 */
import { PrismaClient } from '@prisma/client'

for (const line of (await import('fs')).readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const prisma = new PrismaClient()

const stmts = [
  `CREATE TABLE IF NOT EXISTS facturas_recurrentes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "perfilId" TEXT NOT NULL,
    tipo TEXT NOT NULL,
    numero TEXT NOT NULL,
    "emisorReceptor" TEXT NOT NULL,
    "nifContraparte" TEXT,
    "baseImponible" INTEGER NOT NULL,
    iva INTEGER NOT NULL DEFAULT 21,
    "diaGeneracion" INTEGER NOT NULL CHECK ("diaGeneracion" BETWEEN 1 AND 28),
    activa BOOLEAN NOT NULL DEFAULT true,
    "ultimaGeneracion" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE facturas_recurrentes ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fr_select_own' AND tablename = 'facturas_recurrentes') THEN CREATE POLICY fr_select_own ON facturas_recurrentes FOR SELECT USING (auth.uid()::text = "perfilId"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fr_insert_own' AND tablename = 'facturas_recurrentes') THEN CREATE POLICY fr_insert_own ON facturas_recurrentes FOR INSERT WITH CHECK (auth.uid()::text = "perfilId"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fr_update_own' AND tablename = 'facturas_recurrentes') THEN CREATE POLICY fr_update_own ON facturas_recurrentes FOR UPDATE USING (auth.uid()::text = "perfilId"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fr_delete_own' AND tablename = 'facturas_recurrentes') THEN CREATE POLICY fr_delete_own ON facturas_recurrentes FOR DELETE USING (auth.uid()::text = "perfilId"); END IF; END $$`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON facturas_recurrentes TO authenticated`,
]

try {
  for (const sql of stmts) {
    await prisma.$executeRawUnsafe(sql)
  }
  console.log('✅ Tabla "facturas_recurrentes" + RLS + GRANTS configurados')
} catch (e) {
  console.error('⚠️  Error:', e.message)
} finally {
  await prisma.$disconnect()
}
