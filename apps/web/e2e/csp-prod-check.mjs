// Test temporal de producción: verifica que la CSP con nonce no bloquea scripts.
// Uso: node e2e/csp-prod-check.mjs (con next start corriendo en el puerto dado)
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:3123'
const violaciones = []
const pageErrors = []

const b = await chromium.launch()
const page = await b.newPage()
page.on('console', (m) => {
  const t = m.text()
  if (/Content Security Policy|Refused to (execute|load|apply)/.test(t)) violaciones.push(t)
})
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))

const resultados = {}
try {
  for (const ruta of ['/', '/precios', '/login']) {
    await page.goto(base + ruta, { waitUntil: 'networkidle', timeout: 30000 })
    resultados[ruta] = 'ok'
  }

  // Login hidratado: React ejecutó los bundles (si la CSP bloqueara, no habría form)
  await page.goto(base + '/login', { waitUntil: 'networkidle', timeout: 30000 })
  resultados.inputsLogin = await page.locator('input').count()
  resultados.botonLogin = await page.locator('button[type="submit"]').count()

  // El script inline de next-themes ejecutó (aplica clases de tema)
  resultados.clasesHtml = (await page.evaluate(() => document.documentElement.className)).slice(0, 60)

  // JSON-LD con nonce y legible
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 30000 })
  resultados.ldJson = await page.evaluate(() => {
    const s = document.querySelector('script[type="application/ld+json"]')
    if (!s) return { presente: false }
    return { presente: true, nonceAttr: Boolean(s.getAttribute('nonce')), parseable: Boolean(JSON.parse(s.textContent || '{}')) }
  })
} catch (e) {
  resultados.errorNavegacion = String(e).slice(0, 300)
}

console.log(JSON.stringify({ violacionesCsp: violaciones, pageErrors, ...resultados }, null, 2))
await b.close()
process.exit(violaciones.length > 0 || pageErrors.length > 0 ? 1 : 0)
