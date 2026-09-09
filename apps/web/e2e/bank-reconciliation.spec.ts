import { test, expect } from '@playwright/test'

test.describe('Bank Reconciliation', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/gestoria/conciliacion')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Conciliación bancaria')).toBeVisible()
    }
  })

  test('page has import section', async ({ page }) => {
    await page.goto('/gestoria/conciliacion')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText(/subir|importar|archivo/i).first()).toBeVisible()
    }
  })

  test('page has movements table or empty state', async ({ page }) => {
    await page.goto('/gestoria/conciliacion')
    const url = page.url()
    if (!url.includes('/login')) {
      const hasTable = await page.getByRole('table').isVisible().catch(() => false)
      const hasEmpty = await page.getByText(/sin movimientos|no hay|vacío/i).isVisible().catch(() => false)
      expect(hasTable || hasEmpty).toBeTruthy()
    }
  })
})
