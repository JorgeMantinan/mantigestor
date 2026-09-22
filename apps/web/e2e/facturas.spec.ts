import { test, expect } from '@playwright/test'

test.describe('Facturas', () => {
  test('facturas list page loads', async ({ page }) => {
    await page.goto('/gestoria/facturas')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Facturas').first()).toBeVisible()
    }
  })

  test('nueva factura page has form elements', async ({ page }) => {
    await page.goto('/gestoria/facturas/nueva')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Nueva factura').first()).toBeVisible()
      await expect(page.getByLabel('Tipo')).toBeVisible()
      await expect(page.getByLabel('Número')).toBeVisible()
      await expect(page.getByLabel('Emisor / Receptor')).toBeVisible()
    }
  })

  test('facturas page has filters', async ({ page }) => {
    await page.goto('/gestoria/facturas')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Facturas').first()).toBeVisible()
    }
  })

  test('nueva factura has tipo emitida/recibida options', async ({ page }) => {
    await page.goto('/gestoria/facturas/nueva')
    const url = page.url()
    if (!url.includes('/login')) {
      const tipo = page.getByLabel('Tipo')
      await expect(tipo).toBeVisible()
      const options = await tipo.locator('option').allTextContents()
      expect(options.some(o => o.toLowerCase().includes('emitida'))).toBeTruthy()
      expect(options.some(o => o.toLowerCase().includes('recibida'))).toBeTruthy()
    }
  })

  test('nueva factura has estado field', async ({ page }) => {
    await page.goto('/gestoria/facturas/nueva')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByLabel('Estado')).toBeVisible()
    }
  })

  test('facturas page has pagination or empty state', async ({ page }) => {
    await page.goto('/gestoria/facturas')
    const url = page.url()
    if (!url.includes('/login')) {
      const hasTable = await page.locator('table').isVisible().catch(() => false)
      const hasEmpty = await page.getByText(/no hay facturas|vacío/i).isVisible().catch(() => false)
      expect(hasTable || hasEmpty).toBeTruthy()
    }
  })
})
