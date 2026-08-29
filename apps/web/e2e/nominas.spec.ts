import { test, expect } from '@playwright/test'

test.describe('Nóminas', () => {
  test('nominas page loads', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Nóminas').first()).toBeVisible()
      await expect(page.getByText('Gestión de nóminas')).toBeVisible()
    }
  })

  test('nominas page has search input', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByPlaceholder('Buscar por empleada...')).toBeVisible()
    }
  })

  test('nominas page has add button', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByRole('button', { name: 'Nueva nómina' })).toBeVisible()
    }
  })

  test('nominas page has role toggle buttons', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByRole('button', { name: 'Soy el jefe' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Soy la empleada' })).toBeVisible()
    }
  })

  test('nominas page has year filters', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      const currentYear = new Date().getFullYear()
      await expect(page.getByRole('button', { name: String(currentYear) })).toBeVisible()
    }
  })

  test('nominas form appears on button click', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      await page.getByRole('button', { name: 'Nueva nómina' }).click()
      await expect(page.getByText('Nueva nómina')).toBeVisible()
      await expect(page.getByLabel('Nombre de la empleada')).toBeVisible()
      await expect(page.getByLabel('Salario bruto mensual (€)')).toBeVisible()
    }
  })

  test('nominas page has filter buttons', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByRole('button', { name: 'Todas' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Jefe' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Empleada' })).toBeVisible()
    }
  })

  test('nominas page has empty state or list', async ({ page }) => {
    await page.goto('/nominas')
    const url = page.url()
    if (!url.includes('/login')) {
      const hasEmpty = await page.getByText(/No hay nóminas/).isVisible().catch(() => false)
      const hasList = await page.getByText(/nómina/).first().isVisible().catch(() => false)
      expect(hasEmpty || hasList).toBeTruthy()
    }
  })
})
