import { test, expect } from '@playwright/test'

/* ---------- 1. No‑JS baseline search (method GET) ---------- */
test.describe('baseline (JavaScript disabled)', () => {
  test.use({ javaScriptEnabled: false })

  test('search reloads page and shows count', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('checkbox', { name: 'Intern' }).check()
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page).toHaveURL(/search/)
    await expect(page.locator('#count')).toContainText(/1 job/)
  })
})

/* ---------- 2. JS enhancement: instant search ---------- */
test.describe('enhanced (JavaScript enabled)', () => {
  test('search updates results without navigation', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[name="q"]', 'remote')

    // Wait for POST /search to complete
    await Promise.all([
      page.waitForResponse(r => r.url().endsWith('/search') && r.status() === 204),
      page.press('input[name="q"]', 'Enter') // or click the button
    ])

    // Ensure URL did NOT change
    await expect(page).not.toHaveURL(/q=remote/)

    // Results list updated
    await expect(page.locator('#results >> #count')).toContainText(/job/)
  })
})
