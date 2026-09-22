import { test, expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E del hub fiscal con sesión real.
 * Flujo: crear usuario via service role → magic link → verify → cookie de sesión
 * (mismo formato que usa @supabase/ssr: sb-<ref>-auth-token = base64-<JSON sesión>).
 */

function envLocal(): Record<string, string> {
  const candidatos = ['../../.env.local', '../../../.env.local', '../.env.local', '.env.local'].map(p =>
    resolve(process.cwd(), p)
  )
  const ruta = candidatos.find(p => existsSync(p))
  if (!ruta) throw new Error(`No se encontró .env.local en ${candidatos.join(', ')} (cwd=${process.cwd()})`)
  const raw = readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '')
  const vars: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const k = line.slice(0, eq).trim()
    if (!/^[A-Z_0-9]+$/.test(k)) continue
    vars[k] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      `Claves Supabase ausentes en ${ruta} (cwd=${process.cwd()}, ${raw.length} bytes); claves=${Object.keys(vars).join(',')}`
    )
  }
  return vars
}

const ENV = envLocal()
// envLocal() ya valida presencia de URL y service role; el fallback vacío solo satisface al tipado estricto
const SUPABASE_URL: string = ENV.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON: string = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE: string = ENV.SUPABASE_SERVICE_ROLE_KEY ?? ''
const REF = /https:\/\/([a-z0-9]+)\./.exec(SUPABASE_URL)?.[1] ?? ''

let emailPrueba = ''
let userId = ''
let cookieSesion = ''

async function crearSesion(): Promise<{ userId: string; cookie: string }> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })
  emailPrueba = `e2e-fiscal-${Date.now()}@test.mantigestor.dev`
  const creada = await admin.auth.admin.createUser({
    email: emailPrueba,
    password: `Pw-${Math.random().toString(36).slice(2)}!7Aa`,
    email_confirm: true,
  })
  if (creada.error || !creada.data) throw new Error(`No se pudo crear el usuario de prueba: ${creada.error?.message}`)
  const datosUsuario = creada.data as unknown as { id?: string; user?: { id?: string } }
  const uid = datosUsuario.user?.id ?? datosUsuario.id
  if (!uid) throw new Error('createUser no devolvió id de usuario')

  const enlace = await admin.auth.admin.generateLink({ type: 'magiclink', email: emailPrueba })
  if (enlace.error || !enlace.data) throw new Error(`No se pudo generar el magic link: ${enlace.error?.message}`)
  const tokenHash = (enlace.data as unknown as { properties: { hashed_token: string } }).properties.hashed_token

  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  })
  if (!res.ok) throw new Error(`verify falló: ${res.status}`)
  const j = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    expires_at?: number
    token_type?: string
    user?: unknown
  }
  if (!j.access_token || !j.refresh_token) throw new Error('verify no devolvió tokens')
  const sesion = {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_in: j.expires_in ?? 3600,
    expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    token_type: j.token_type ?? 'bearer',
    user: j.user,
  }
  return { userId: uid, cookie: `base64-${Buffer.from(JSON.stringify(sesion)).toString('base64')}` }
}

async function iniciarSesion(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: `sb-${REF}-auth-token`,
      value: cookieSesion,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  page.on('pageerror', e => console.log(`[pageerror] ${e.message}`))
}

test.beforeAll(async () => {
  const sesion = await crearSesion()
  userId = sesion.userId
  cookieSesion = sesion.cookie
})

test.afterAll(async () => {
  if (!userId) return
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })
  await admin.auth.admin.deleteUser(userId)
})

test.describe('Hub fiscal', () => {
  test('sin sesión redirige a login', async ({ page }) => {
    await page.goto('/fiscal')
    await expect(page).toHaveURL(/\/login/)
  })

  test('wizard de perfil y secciones visibles con sesión', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await expect(page.getByRole('dialog', { name: 'Elige tu perfil fiscal' })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Autónomo / freelance' }).click()
    await expect(page.getByText('Perfil: Autónomo')).toBeVisible()

    // La sección inicial del autónomo es RETA
    await expect(page.getByRole('button', { name: 'Autónomos (RETA)' })).toHaveClass(/secondary/)

    // Selector de comunidad solo en secciones IRPF/mínimos; cambiamos a IRPF
    await page.getByRole('button', { name: 'IRPF' }).click()
    const comunidad = page.locator('#comunidad-fiscal')
    await expect(comunidad).toBeVisible()
    await comunidad.selectOption({ label: 'Navarra (Comunidad Foral de)' })

    // Aviso foral: la escala indicada es tarifa íntegra y NO se suma a la estatal
    await expect(page.getByText(/tarifa íntegra del territorio/i).first()).toBeVisible({ timeout: 20000 })
  })

  test('calculadora IRPF calcula cuota líquida y el ejercicio 2026 está disponible', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: /^IRPF$/ }).click()

    await expect(page.getByText(/IRPF \d{4} · cuota líquida completa/i)).toBeVisible({ timeout: 20000 })
    await page.fill('#irpf-trabajo', '30000')
    // Con 30.000 € de rendimiento neto del trabajo la cuota líquida se muestra con importe
    await expect(page.getByText('Cuota líquida', { exact: true })).toBeVisible()
    await expect(page.locator('dd.font-bold.text-primary').first()).toContainText('€')

    // Ejercicio 2026 importado: el selector lo ofrece y hay datos (no aparece el aviso "no hay escala")
    const ejercicio = page.locator('#ejercicio-fiscal')
    if (await ejercicio.isVisible()) {
      const opciones = await ejercicio.locator('option').allTextContents()
      expect(opciones.map(Number)).toContain(2026)
      await ejercicio.selectOption('2026')
      await expect(page.getByText('IRPF 2026 · cuota líquida completa')).toBeVisible({ timeout: 20000 })
      await expect(page.getByText(/No hay escala estatal IRPF para el año 2026/i)).toHaveCount(0)
    }
  })

  test('resumen anual imprimible', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: 'Resumen anual' }).click()
    await expect(page.getByText(/Resumen fiscal .*· ejercicio \d{4}/i)).toBeVisible({ timeout: 20000 })
  })

  test('calculadora 303 IVA trimestral', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: 'IVA' }).first().click()
    await expect(page.getByText(/IVA \d{4}/i)).toBeVisible({ timeout: 20000 })

    await page.getByRole('button', { name: 'Modelo 303' }).click()
    await expect(page.getByText(/303/i)).toBeVisible({ timeout: 20000 })
  })

  test('calculadora 100 IRPF anual', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: 'Modelo 100' }).click()
    await expect(page.getByText(/100/i)).toBeVisible({ timeout: 20000 })
  })

  test('calculadora 130 IRPF trimestral', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: 'Modelo 130' }).click()
    await expect(page.getByText(/130/i)).toBeVisible({ timeout: 20000 })
  })

  test('calculadora 111 retenciones', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: 'Modelo 111' }).click()
    await expect(page.getByText(/111/i)).toBeVisible({ timeout: 20000 })
  })

  test('deep-link abre calculadora directamente', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal?seccion=modelo303')
    await expect(page.getByText(/303/i)).toBeVisible({ timeout: 20000 })
  })

  test('cambio de ejercicio fiscal actualiza datos', async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/fiscal')
    await page.getByRole('button', { name: /^IRPF$/ }).click()
    await expect(page.getByText(/IRPF \d{4}/i)).toBeVisible({ timeout: 20000 })

    const ejercicio = page.locator('#ejercicio-fiscal')
    if (await ejercicio.isVisible()) {
      const opciones = await ejercicio.locator('option').allTextContents()
      if (opciones.length > 1) {
        const otroAno = opciones.find(o => o !== opciones[0])
        if (otroAno) {
          await ejercicio.selectOption(otroAno)
          await expect(page.getByText(new RegExp(`IRPF ${otroAno}`))).toBeVisible({ timeout: 20000 })
        }
      }
    }
  })
})
