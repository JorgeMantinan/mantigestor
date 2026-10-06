// Diagnóstico RLS completo: tablas públicas sin RLS + grants de anon/authenticated.
// Uso: pnpm --filter=database exec -- dotenv -e ../../.env.local -- tsx scripts/rls-audit.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sinRls = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS tabla
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  `) as { tabla: string }[]

  console.log(`\n== TABLAS SIN RLS (${sinRls.length}) ==`)
  if (sinRls.length > 0) console.table(sinRls.map(r => ({ tabla: r.tabla })))

  if (sinRls.length > 0) {
    const nombres = sinRls.map(r => `'${r.tabla}'`).join(',')
    const grants = await prisma.$queryRawUnsafe(`
      SELECT table_name AS tabla, grantee,
             string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privilegios
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN (${nombres})
        AND grantee IN ('anon', 'authenticated')
      GROUP BY table_name, grantee
      ORDER BY table_name, grantee
    `) as { tabla: string; grantee: string; privilegios: string }[]
    console.log('== GRANTS (anon/authenticated) de esas tablas ==')
    console.table(grants)

    const policies = await prisma.$queryRawUnsafe(`
      SELECT tablename, count(*)::int AS policies
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (${nombres})
      GROUP BY tablename
      ORDER BY tablename
    `) as { tablename: string; policies: number }[]
    console.log('== POLICIES existentes sobre esas tablas ==')
    console.table(policies)
  }

  // Resumen general: todas las tablas con su estado
  const todas = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS tabla,
           c.relrowsecurity AS rls,
           (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `) as { tabla: string; rls: boolean; policies: number }[]
  console.log(`\n== RESUMEN (${todas.length} tablas) ==`)
  console.table(todas)
}

main().finally(() => prisma.$disconnect())
