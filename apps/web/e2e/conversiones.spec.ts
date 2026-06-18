import { test, expect } from '@playwright/test'

test.describe('Conversiones page', () => {
  test('redirects to login without auth', async ({ page }) => {
    await page.goto('/dashboard/conversiones')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect preserves original path', async ({ page }) => {
    await page.goto('/dashboard/conversiones')
    const url = page.url()
    expect(url).toContain('redirect=%2Fdashboard%2Fconversiones')
  })
})
