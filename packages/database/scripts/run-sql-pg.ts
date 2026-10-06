// Ejecuta un fichero SQL completo contra la BD (multi-sentencia, DO $$ incluidos).
// Uso: pnpm --filter=database exec -- dotenv -e ../../.env.local -- tsx scripts/run-sql-pg.ts prisma/migrations/<x>/migration.sql
// Nota: usa DIRECT_URL si existe (conexión directa, mejor para DDL).
import { Client } from 'pg'
import fs from 'node:fs'

const ruta = process.argv[2]
if (!ruta) {
  console.error('Uso: tsx scripts/run-sql-pg.ts <archivo.sql>')
  process.exit(1)
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL (o DIRECT_URL) en el entorno')
  process.exit(1)
}

const sql = fs.readFileSync(ruta, 'utf8')

async function main() {
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(sql)
    console.log(`OK: ${ruta} ejecutado completo`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message ?? e)
  process.exit(1)
})
