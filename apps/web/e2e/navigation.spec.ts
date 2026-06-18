import { test, expect } from '@playwright/test'

test.describe('Protected routes redirect', () => {
  test('gestoria/facturas redirects to login', async ({ page }) => {
    await page.goto('/dashboard/gestoria/facturas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('ai redirects to login', async ({ page }) => {
    await page.goto('/dashboard/ai')
    await expect(page).toHaveURL(/\/login/)
  })
})
