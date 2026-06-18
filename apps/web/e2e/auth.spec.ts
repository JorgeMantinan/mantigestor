import { test, expect } from '@playwright/test'

test.describe('Auth flow', () => {
  test('visiting dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows sign-in form after redirect', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
  })

  test('redirect preserves dashboard path', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    expect(url).toContain('redirect=%2Fdashboard')
  })
})
