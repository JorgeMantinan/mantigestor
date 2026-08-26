/**
 * Grants para la tabla nominas (Supabase REST API).
 * Ejecutar: node --experimental-modules packages/database/scripts/add-nominas-grants.mjs
 */
import { PrismaClient } from '@prisma/client'

for (const line of (await import('fs')).readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const prisma = new PrismaClient()

const stmts = [
  `GRANT SELECT, INSERT, UPDATE, DELETE ON public.nominas TO authenticated`,
  `GRANT SELECT ON public.nominas TO anon`,
]

for (const sql of stmts) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`✅ ${sql}`)
  } catch (e) {
    console.error(`⚠️  ${sql} → ${e.message}`)
  }
}

await prisma.$disconnect()
