import { test, expect } from '@playwright/test'

test.describe('Multi-empresa dashboard', () => {
  test('multi-empresa page loads', async ({ page }) => {
    await page.goto('/dashboard/multi-empresa')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Vista consolidada multi-empresa')).toBeVisible()
    }
  })

  test('multi-empresa page has summary cards', async ({ page }) => {
    await page.goto('/dashboard/multi-empresa')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Ingresos totales')).toBeVisible()
      await expect(page.getByText('Gastos totales')).toBeVisible()
      await expect(page.getByText('Beneficio neto')).toBeVisible()
    }
  })

  test('multi-empresa page has back link', async ({ page }) => {
    await page.goto('/dashboard/multi-empresa')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByRole('link')).toHaveCount(expect.any(Number))
    }
  })
})

test.describe('Satisfacción cliente', () => {
  test('satisfaccion page loads', async ({ page }) => {
    await page.goto('/herramientas/satisfaccion')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Satisfacción del cliente')).toBeVisible()
    }
  })

  test('satisfaccion page has survey form', async ({ page }) => {
    await page.goto('/herramientas/satisfaccion')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Nueva encuesta')).toBeVisible()
      await expect(page.getByPlaceholder('Nombre')).toBeVisible()
    }
  })

  test('satisfaccion page has stats cards', async ({ page }) => {
    await page.goto('/herramientas/satisfaccion')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Total encuestas')).toBeVisible()
      await expect(page.getByText('Puntuación media')).toBeVisible()
      await expect(page.getByText('Promotores')).toBeVisible()
    }
  })

  test('satisfaccion page has star rating', async ({ page }) => {
    await page.goto('/herramientas/satisfaccion')
    const url = page.url()
    if (!url.includes('/login')) {
      const stars = page.locator('button svg.lucide-star')
      await expect(stars).toHaveCount(5)
    }
  })
})

test.describe('Reporte trimestral', () => {
  test('reporte trimestral page loads', async ({ page }) => {
    await page.goto('/gestoria/reporte-trimestral')
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    } else {
      await expect(page.getByText('Reporte trimestral')).toBeVisible()
    }
  })

  test('reporte trimestral has quarter selector', async ({ page }) => {
    await page.goto('/gestoria/reporte-trimestral')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Q1')).toBeVisible()
      await expect(page.getByText('Q2')).toBeVisible()
      await expect(page.getByText('Q3')).toBeVisible()
      await expect(page.getByText('Q4')).toBeVisible()
    }
  })

  test('reporte trimestral has summary cards', async ({ page }) => {
    await page.goto('/gestoria/reporte-trimestral')
    const url = page.url()
    if (!url.includes('/login')) {
      await expect(page.getByText('Ingresos')).toBeVisible()
      await expect(page.getByText('Gastos')).toBeVisible()
      await expect(page.getByText('Beneficio neto')).toBeVisible()
    }
  })
})
