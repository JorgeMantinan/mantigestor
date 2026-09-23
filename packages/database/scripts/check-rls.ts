/* eslint-disable @typescript-eslint/no-explicit-any */
// Script temporal de verificación RLS: node --loader ... o tsx
// Uso: pnpm --filter=database exec tsx scripts/check-rls.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tablas: any[] = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname='public' AND tablename IN
    ('perfiles','notificaciones','invitaciones_pendientes','perfil_asociado','facturas','documentos')
    ORDER BY tablename`)
  console.log('== RLS ENABLED ==')
  console.table(tablas)

  const policies: any[] = await prisma.$queryRawUnsafe(`
    SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
    WHERE schemaname='public' AND tablename IN
    ('perfiles','notificaciones','invitaciones_pendientes','perfil_asociado')
    ORDER BY tablename, policyname`)
  console.log('== POLICIES ==')
  for (const p of policies) {
    console.log(`${p.tablename} | ${p.policyname} | ${p.cmd}`)
    console.log(`  USING: ${p.qual}`)
    console.log(`  CHECK: ${p.with_check}`)
  }
}

main().finally(() => prisma.$disconnect())
