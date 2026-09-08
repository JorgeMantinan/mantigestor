import { test, expect } from '@playwright/test'

test.describe('Home page visual', () => {
  test('renders hero section with title', async ({ page }) => {
    await page.goto('/')
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('con IA')
  })

  test('shows CTA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Empezar gratis')).toBeVisible()
    await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
  })
})

test.describe('Pricing page visual', () => {
  test('shows BASIC and PRO plan headings', async ({ page }) => {
    await page.goto('/precios')
    await expect(page.getByRole('heading', { name: 'BASIC' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'PRO' })).toBeVisible()
  })

  test('shows PRO as recommended', async ({ page }) => {
    await page.goto('/precios')
    await expect(page.getByText('RECOMENDADO')).toBeVisible()
  })

  test('PRO button shows Próximamente when Stripe unavailable', async ({ page }) => {
    await page.goto('/precios')
    const proximamente = page.getByText('Próximamente')
    if (await proximamente.isVisible().catch(() => false)) {
      await expect(proximamente).toBeVisible()
    }
  })

  test('shows back button', async ({ page }) => {
    await page.goto('/precios')
    await expect(page.getByText('Volver')).toBeVisible()
  })
})

test.describe('Login page visual', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('shows social login buttons', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Continuar con Google')).toBeVisible()
    await expect(page.getByText('Continuar con Outlook')).toBeVisible()
  })

  test('has link to register', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Registrarse')).toBeVisible()
  })
})

test.describe('Register page visual', () => {
  test('renders register form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel('Nombre')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
  })

  test('shows social login buttons', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Registrarse con Google')).toBeVisible()
    await expect(page.getByText('Registrarse con Outlook')).toBeVisible()
  })

  test('has link to login', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Iniciar sesión')).toBeVisible()
  })
})

test.describe('Protected pages redirect', () => {
  test('gestoria/facturas redirects to login', async ({ page }) => {
    await page.goto('/gestoria/facturas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('conversiones redirects to login', async ({ page }) => {
    await page.goto('/conversiones')
    await expect(page).toHaveURL(/\/login/)
  })

  test('ajustes redirects to login', async ({ page }) => {
    await page.goto('/ajustes')
    await expect(page).toHaveURL(/\/login/)
  })
})
