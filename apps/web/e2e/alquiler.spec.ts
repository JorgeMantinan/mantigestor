import { test, expect } from '@playwright/test'

test.describe('Alquiler', () => {
  test('alquiler page loads', async ({ page }) => {
    await page.goto('/alquiler')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Alquiler').first()).toBeVisible()
      await expect(page.getByText('Gestión de propiedades en alquiler')).toBeVisible()
    }
  })

  test('alquiler page has search input', async ({ page }) => {
    await page.goto('/alquiler')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByPlaceholder('Buscar por dirección o inquilino...')).toBeVisible()
    }
  })

  test('alquiler page has add button', async ({ page }) => {
    await page.goto('/alquiler')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByRole('button', { name: 'Añadir propiedad' })).toBeVisible()
    }
  })

  test('alquiler form appears on button click', async ({ page }) => {
    await page.goto('/alquiler')
    const url = page.url()
    if (!url.includes('/login')) {
      await page.getByRole('button', { name: 'Añadir propiedad' }).click()
      await expect(page.getByText('Nueva propiedad')).toBeVisible()
      await expect(page.getByLabel('Dirección')).toBeVisible()
      await expect(page.getByLabel('Ingreso mensual (€)')).toBeVisible()
    }
  })

  test('alquiler form has cancel button', async ({ page }) => {
    await page.goto('/alquiler')
    const url = page.url()
    if (!url.includes('/login')) {
      await page.getByRole('button', { name: 'Añadir propiedad' }).click()
      await expect(page.getByText('Nueva propiedad')).toBeVisible()
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(page.getByText('Nueva propiedad')).not.toBeVisible()
    }
  })

  test('alquiler page has empty state', async ({ page }) => {
    await page.goto('/alquiler')
    const url = page.url()
    if (!url.includes('/login')) {
      // Empty state or property list should be visible
      const hasProperties = await page.getByText('No hay propiedades').isVisible().catch(() => false)
      const hasList = await page.getByText('Propiedad en alquiler').isVisible().catch(() => false)
      expect(hasProperties || hasList).toBeTruthy()
    }
  })
})
