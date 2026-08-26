/**
 * Configura RLS policies para la tabla nominas.
 * Ejecutar: node --experimental-modules packages/database/scripts/add-nominas-rls.mjs
 */
import { PrismaClient } from '@prisma/client'

for (const line of (await import('fs')).readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const prisma = new PrismaClient()

const stmts = [
  `ALTER TABLE nominas ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominas_select_own' AND tablename = 'nominas') THEN CREATE POLICY nominas_select_own ON nominas FOR SELECT USING (auth.uid()::text = "perfilId"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominas_insert_own' AND tablename = 'nominas') THEN CREATE POLICY nominas_insert_own ON nominas FOR INSERT WITH CHECK (auth.uid()::text = "perfilId"); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominas_delete_own' AND tablename = 'nominas') THEN CREATE POLICY nominas_delete_own ON nominas FOR DELETE USING (auth.uid()::text = "perfilId"); END IF; END $$`,
]

for (const sql of stmts) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`✅ ${sql.slice(0, 60)}...`)
  } catch (e) {
    console.error(`⚠️  ${sql.slice(0, 60)}... → ${e.message}`)
  }
}

await prisma.$disconnect()
