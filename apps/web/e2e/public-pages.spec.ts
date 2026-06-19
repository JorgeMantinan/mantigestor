import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('home page shows app name', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('MantiGestor').first()).toBeVisible()
  })

  test('login page has form elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Iniciar sesión').first()).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('register page has form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Crear cuenta').first()).toBeVisible()
    await expect(page.getByLabel('Nombre')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
  })

  test('precios page mentions plans', async ({ page }) => {
    await page.goto('/precios')
    await expect(page.getByRole('heading', { name: 'BASIC' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'PRO' })).toBeVisible()
  })
})
