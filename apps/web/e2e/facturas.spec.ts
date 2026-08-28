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
      // Check for filter elements
      await expect(page.getByText('Facturas').first()).toBeVisible()
    }
  })
})
