/**
 * Añade columna 'diaEmail' a facturas_recurrentes.
 * Ejecutar: node --experimental-modules packages/database/scripts/add-dia-email.mjs
 */
import { PrismaClient } from '@prisma/client'

for (const line of (await import('fs')).readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE facturas_recurrentes ADD COLUMN IF NOT EXISTS "diaEmail" INTEGER DEFAULT NULL
  `)
  console.log('✅ Columna "diaEmail" añadida')
} catch (e) {
  console.error('⚠️  Error:', e.message)
} finally {
  await prisma.$disconnect()
}
