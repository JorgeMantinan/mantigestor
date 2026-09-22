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
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
  })

  test('redirect preserves dashboard path', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    expect(url).toContain('redirect=%2Fdashboard')
  })

  test('visiting /fiscal redirects to login', async ({ page }) => {
    await page.goto('/fiscal')
    await expect(page).toHaveURL(/\/login/)
  })

  test('visiting /gestoria/facturas redirects to login', async ({ page }) => {
    await page.goto('/gestoria/facturas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('register page is accessible', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Crear cuenta').first()).toBeVisible({ timeout: 10000 })
  })

  test('login form has email validation', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('invalid-email')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    // Should show error or stay on login
    await expect(page).toHaveURL(/\/login/)
  })
})
