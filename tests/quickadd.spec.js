import { test, expect } from '@playwright/test'
import { enterApp } from './harness.js'

/* Плюсът на хранене: отметнатото се добавя цялото, дори когато търсенето
   междувременно е скрило част от него. Дотук се добавяше само видимото —
   „Добави 2“ пращаше един ред. */

const HIST = [
  { name: 'Нектарина', grams: 250, kcal: 110, protein: 2, carbs: 25, fat: 0.5, times_used: 10 },
  { name: 'Пилешка шунка', grams: 200, kcal: 215, protein: 30, carbs: 2, fat: 9, times_used: 37 },
  { name: 'Банан', grams: 200, kcal: 177, protein: 2, carbs: 45, fat: 0.5, times_used: 93 },
]

async function openSheet(page, history, after = async () => {}) {
  await enterApp(page, { tables: { food_logs: [] }, rpc: { food_history: history } })
  await after()
  const tab = page.locator('nav').first().locator('button', { hasText: 'ХРАНЕНЕ' }).first()
  await tab.click()
  await expect(tab).toHaveAttribute('aria-current', 'page', { timeout: 10000 })
  await page.getByRole('button', { name: /Добави в/ }).first().click()
  return page.getByRole('dialog', { name: /Добави в/ })
}

function watchInserts(page) {
  const names = []
  page.on('request', r => {
    if (r.method() === 'POST' && r.url().includes('/rest/v1/food_logs')) names.push(JSON.parse(r.postData()).name)
  })
  return names
}

test('добавя всички отметнати храни', async ({ page }) => {
  test.setTimeout(60000)
  const sheet = await openSheet(page, HIST)
  const sent = watchInserts(page)
  await sheet.getByRole('button', { name: /Нектарина/ }).click()
  await sheet.getByRole('button', { name: /Пилешка шунка/ }).click()
  await sheet.getByRole('button', { name: 'Добави 2' }).click()
  await expect(sheet).toBeHidden()
  await expect.poll(() => sent.slice().sort()).toEqual(['Нектарина', 'Пилешка шунка'])
})

test('отметнатото остава, след като търсенето го скрие', async ({ page }) => {
  test.setTimeout(60000)
  /* Мокът връща едно и също за всяко търсене — затова тук търсенето се
     подменя: каквото е написано, това се връща. Регистрира се след харнеса,
     иначе неговият маршрут печели. */
  const searchable = () => page.route('**/rest/v1/rpc/food_history', async route => {
    const q = (JSON.parse(route.request().postData() || '{}').search || '').toLowerCase()
    const rows = q ? HIST.filter(h => h.name.toLowerCase().includes(q)) : HIST
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rows) })
  })
  const sheet = await openSheet(page, HIST, searchable)
  const sent = watchInserts(page)
  const search = sheet.getByRole('searchbox')

  await search.fill('нект')
  await sheet.getByRole('button', { name: /Нектарина/ }).click()
  await search.fill('шунка')
  await sheet.getByRole('button', { name: /Пилешка шунка/ }).click()
  await expect(sheet.getByRole('button', { name: /Нектарина/ })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Добави 2' }).click()
  await expect(sheet).toBeHidden()
  await expect.poll(() => sent.slice().sort()).toEqual(['Нектарина', 'Пилешка шунка'])
})
