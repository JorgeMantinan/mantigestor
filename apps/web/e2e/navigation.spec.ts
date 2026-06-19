import { test, expect } from '@playwright/test'

test.describe('Protected routes redirect', () => {
  test('gestoria/facturas redirects to login', async ({ page }) => {
    await page.goto('/gestoria/facturas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('ai redirects to login', async ({ page }) => {
    await page.goto('/ai')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renta redirects to login', async ({ page }) => {
    await page.goto('/gestoria/renta')
    await expect(page).toHaveURL(/\/login/)
  })
})
