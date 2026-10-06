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
    const r = await client.query(
      `SELECT tablename, policyname, qual FROM pg_policies
       WHERE schemaname = 'public' AND cmd = 'SELECT' AND qual LIKE '%es_gestor_del_perfil%'
       ORDER BY tablename, policyname`
    )
    console.log(`== SELECT policies con es_gestor_del_perfil (${r.rowCount}) ==`)
    for (const p of r.rows) console.log(`${p.tablename} | ${p.policyname}\n   ${p.qual}`)

    const p2 = await client.query(
      `SELECT policyname, cmd, qual, with_check FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'perfiles' ORDER BY policyname`
    )
    console.log(`== perfiles policies (${p2.rowCount}) ==`)
    for (const p of p2.rows) console.log(`${p.policyname} | ${p.cmd}\n   USING: ${p.qual}\n   CHECK: ${p.with_check}`)

    const p3 = await client.query(
      `SELECT policyname, cmd, qual FROM pg_policies
       WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname`
    )
    console.log(`== storage.objects policies (${p3.rowCount}) ==`)
    for (const p of p3.rows) console.log(`${p.policyname} | ${p.cmd}\n   ${p.qual}`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
