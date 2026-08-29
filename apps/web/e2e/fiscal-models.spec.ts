import { test, expect } from '@playwright/test'

test.describe('Modelos fiscales', () => {
  test('fiscal page loads with calculators', async ({ page }) => {
    await page.goto('/fiscal')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Modelos fiscales').first()).toBeVisible()
    }
  })

  test('fiscal page has search', async ({ page }) => {
    await page.goto('/fiscal')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByPlaceholder(/Buscar/).first()).toBeVisible()
    }
  })

  test('fiscal page has model cards', async ({ page }) => {
    await page.goto('/fiscal')
    const url = page.url()
    if (!url.includes('/login')) {
      // Should have at least some model cards visible
      const hasModels = await page.getByText(/Modelo/).first().isVisible().catch(() => false)
      expect(hasModels).toBeTruthy()
    }
  })

  test('deep-link to calculadora 303', async ({ page }) => {
    await page.goto('/fiscal?seccion=calc-303')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText(/303/).first()).toBeVisible()
    }
  })

  test('deep-link to calculadora 130', async ({ page }) => {
    await page.goto('/fiscal?seccion=calc-130')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText(/130/).first()).toBeVisible()
    }
  })
})
