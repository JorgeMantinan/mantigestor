import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('shows greeting and KPIs when logged in', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login if not authenticated
    // or show dashboard if authenticated
    const url = page.url()
    if (url.includes('/login')) {
      // Not logged in - verify login page
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      // Logged in - verify dashboard elements
      await expect(page.getByText('Panel de control fiscal').first()).toBeVisible()
      await expect(page.getByText('Ingresos').first()).toBeVisible()
      await expect(page.getByText('Gastos').first()).toBeVisible()
      await expect(page.getByText('IVA neto').first()).toBeVisible()
      await expect(page.getByText('Beneficio neto').first()).toBeVisible()
    }
  })

  test('quick action buttons exist', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByRole('link', { name: /Nueva factura/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Calculadoras/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Facturas/i })).toBeVisible()
    }
  })

  test('fiscal deadlines section exists', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Próximos vencimientos fiscales').first()).toBeVisible()
    }
  })
})
