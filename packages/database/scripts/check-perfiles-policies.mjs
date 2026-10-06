import { Client } from 'pg'
import fs from 'node:fs'

const env = fs.readFileSync('C:/web2026/MantiGestor/.env.local', 'utf8')
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
}

async function main() {
  const client = new Client({ connectionString: get('DIRECT_URL') || get('DATABASE_URL') })
  await client.connect()
  try {
    const policies = await client.query(
      'SELECT policyname, cmd, with_check FROM pg_policies WHERE schemaname=$1 AND tablename=$2 ORDER BY policyname',
      ['public', 'perfiles']
    )
    console.log(`POLICIES de perfiles (${policies.rowCount}):`)
    for (const p of policies.rows) console.log(` - ${p.policyname} | ${p.cmd} | CHECK: ${p.with_check}`)

    const sinRls = await client.query(
      "SELECT count(*)::int n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity"
    )
    console.log('tablas sin RLS:', sinRls.rows[0].n)

    // ¿puede un rol 'anon' con INSERT crear perfiles? (regresión de registro)
    const grants = await client.query(
      "SELECT grantee, string_agg(DISTINCT privilege_type, ',') g FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='perfiles' AND grantee IN ('anon','authenticated') GROUP BY grantee"
    )
    console.log('grants en perfiles:')
    for (const g of grants.rows) console.log(` - ${g.grantee}: ${g.g}`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
