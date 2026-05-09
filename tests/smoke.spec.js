import { test, expect } from '@playwright/test'

test.describe('Bottom navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows 4 nav tabs', async ({ page }) => {
    const tabs = page.locator('nav[aria-label="Основна навигация"] button')
    await expect(tabs).toHaveCount(4)
  })

  test('nutrition tab is active by default', async ({ page }) => {
    const nutritionTab = page.getByRole('button', { name: /nutrition/i })
    await expect(nutritionTab).toHaveAttribute('aria-current', 'page')
  })

  test('switches to food log tab', async ({ page }) => {
    await page.getByRole('button', { name: /food log/i }).click()
    await expect(page.getByRole('heading', { name: /food log/i })).toBeVisible()
  })

  test('switches to habits tab', async ({ page }) => {
    await page.getByRole('button', { name: /habits/i }).click()
    await expect(page.getByRole('heading', { name: /habits/i })).toBeVisible()
  })

  test('switches to training tab', async ({ page }) => {
    await page.getByRole('button', { name: /training/i }).click()
    await expect(page.getByRole('heading', { name: /training/i })).toBeVisible()
  })
})

test.describe('Nutrition flip cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows 4 flip cards', async ({ page }) => {
    const cards = page.locator('[role="button"][aria-label*="натисни"]')
    await expect(cards).toHaveCount(4)
  })

  test('flips card on click', async ({ page }) => {
    const card = page.locator('[role="button"][aria-label*="PROTEIN"]')
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Daily compliance tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /habits/i }).click()
  })

  test('shows 6 habit checkboxes', async ({ page }) => {
    const habits = page.locator('[role="checkbox"]')
    await expect(habits).toHaveCount(6)
  })

  test('toggles habit on click', async ({ page }) => {
    const first = page.locator('[role="checkbox"]').first()
    await expect(first).toHaveAttribute('aria-checked', 'false')
    await first.click()
    await expect(first).toHaveAttribute('aria-checked', 'true')
  })

  test('shows SOS button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sos/i })).toBeVisible()
  })
})

test.describe('Training split', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /training/i }).click()
  })

  test('shows 7 day pills', async ({ page }) => {
    const pills = page.locator('[role="tab"]')
    await expect(pills).toHaveCount(7)
  })

  test('switches day on pill click', async ({ page }) => {
    await page.getByRole('tab', { name: /пон/i }).click()
    await expect(page.getByText('Понеделник')).toBeVisible()
  })
})

test.describe('Food logger', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /food log/i }).click()
  })

  test('shows search input', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: /търси храна/i })).toBeVisible()
  })
})
