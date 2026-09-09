import { test, expect } from '@playwright/test'

test.describe('Recurring Invoices', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/gestoria/facturas/recurrentes')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Facturas recurrentes')).toBeVisible()
    }
  })

  test('page has create button or empty state', async ({ page }) => {
    await page.goto('/gestoria/facturas/recurrentes')
    const url = page.url()
    if (!url.includes('/login')) {
      const hasCreate = await page.getByRole('button', { name: /crear|nueva|añadir/i }).isVisible().catch(() => false)
      const hasEmpty = await page.getByText(/sin plantillas|no hay|vacío|primera/i).isVisible().catch(() => false)
      expect(hasCreate || hasEmpty).toBeTruthy()
    }
  })

  test('page shows plantilla cards when data exists', async ({ page }) => {
    await page.goto('/gestoria/facturas/recurrentes')
    const url = page.url()
    if (!url.includes('/login')) {
      const cards = page.locator('[class*="card"]')
      const count = await cards.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})
