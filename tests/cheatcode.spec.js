import { test, expect } from '@playwright/test'

/* Чийт Код е статична страница без вход: поръчката отива във функцията
   cheatcode-order, а „Моите поръчки“ живеят на устройството и питат същата
   функция за статуса. Функцията тук е подменена — нищо не стига до базата. */

// Vite в разработка отговаря на /cheatcode/ с приложението — пренаписването е
// на Vercel. Затова страницата се иска по име на файла.
const ORDER_URL = '**/functions/v1/cheatcode-order'

test.describe('Чийт Код · моите поръчки', () => {
  test('поръчката остава в „Моите поръчки“, носи статуса си и се поръчва пак', async ({ page }) => {
    test.setTimeout(60000)
    const asked = []
    await page.route(ORDER_URL, async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.action === 'status') {
        asked.push(body.orders)
        return route.fulfill({ json: { orders: [{ code: 'ЧК-4321', status: 'ready' }] } })
      }
      return route.fulfill({ json: { code: 'ЧК-4321', test: true, push: 200 } })
    })
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html')

    await page.locator('button.dish:not(.soon)').first().click()
    await page.locator('#orderBtn').click()
    await page.locator('.nav-inner [data-go="cart"]').click()
    await page.locator('#fName').fill('Ники')
    await page.locator('#fPhone').fill('0898 281 221')
    await page.locator('#orderBtn').click()
    await expect(page.locator('#doneCode')).toHaveText('ЧК-4321')

    await page.locator('#doneView [data-go="orders"]').click()
    const card = page.locator('.ord', { hasText: 'ЧК-4321' })
    await expect(card).toBeVisible()
    await expect(card.getByText('1 кутия', { exact: false })).toBeVisible()
    await expect(card.getByText('Проба — не се готви.')).toBeVisible()
    // Статусът идва от функцията, по код и телефон.
    await expect(card.locator('.ord-st')).toHaveText('Готова за вземане')
    expect(asked[0]).toEqual([{ code: 'ЧК-4321', phone: '0898 281 221' }])

    // Помни се и след презареждане — на устройството, не в сесията.
    await page.reload()
    await page.locator('.nav-inner [data-go="orders"]').click()
    await expect(page.locator('.ord', { hasText: 'ЧК-4321' }).locator('.ord-st')).toHaveText('Готова за вземане')

    await page.locator('.ord').getByRole('button', { name: 'Поръчай пак' }).click()
    await expect(page.locator('#cartView')).toBeVisible()
    await expect(page.locator('#cartLines .line')).toHaveCount(1)
    await expect(page.locator('#cartCount')).toHaveText('1')
  })

  test('без поръчки — казва го', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html')
    await page.locator('.nav-inner [data-go="orders"]').click()
    await expect(page.getByText('Още нямаш поръчки оттук.')).toBeVisible()
  })
})
