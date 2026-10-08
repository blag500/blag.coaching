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
    let placed = null
    await page.route(ORDER_URL, async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      if (!body.action) placed = body
      if (body.action === 'status') {
        asked.push(body.orders)
        return route.fulfill({ json: { orders: [{ code: 'ЧК-4321', status: 'ready', confirmed: true }] } })
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
    // Имейлът е задължителен — оттам се потвърждава поръчката — и трябва да е цял.
    await page.locator('#orderBtn').click()
    await expect(page.locator('#fErr')).toHaveText('Трябва ни имейл — оттам потвърждаваш поръчката.')
    await page.locator('#fEmail').fill('niki@')
    await page.locator('#orderBtn').click()
    await expect(page.locator('#fErr')).toHaveText('Имейлът изглежда непълен.')
    expect(placed).toBeNull()
    await page.locator('#fEmail').fill('niki@primer.bg')
    await page.locator('#orderBtn').click()
    await expect(page.locator('#doneCode')).toHaveText('ЧК-4321')
    expect(placed.email).toBe('niki@primer.bg')
    // Снимката на ястието тръгва с реда — за писмото до клиента.
    expect(placed.lines[0].photo).toMatch(/^\/cheatcode\/[\w-]+\.jpe?g$/)
    await expect(page.locator('#doneTitle')).toHaveText('Потвърди от имейла')
    await expect(page.locator('#doneNote')).toContainText('Пратихме писмо на niki@primer.bg')

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
    // Формата се попълва от последната поръчка — не се пише всеки път.
    await expect(page.locator('#fName')).toHaveValue('Ники')
    await expect(page.locator('#fPhone')).toHaveValue('0898 281 221')
    await expect(page.locator('#fEmail')).toHaveValue('niki@primer.bg')
  })

  /* „Потвърди поръчката“ от писмото: поръчката отива в кухнята, а телефонът
     получава ключ за „Моите поръчки“ — без регистрация. */
  test('линкът „Потвърди“ потвърждава и отваря поръчките', async ({ page }) => {
    const TOKEN = 'confirmtokenconfirmtoken0123'
    const calls = []
    await page.route(ORDER_URL, async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      calls.push(body)
      if (body.action === 'confirm') {
        return route.fulfill({ json: { code: 'ЧК-2951', test: true, already: false, status: 'new',
          me: 'metokenmetokenmetoken012345', name: 'Ники', phone: '0898 281 221', email: 'niki@primer.bg' } })
      }
      if (body.action === 'me') {
        return route.fulfill({ json: { email: 'niki@primer.bg', name: 'Ники', phone: '0898 281 221',
          orders: [{ code: 'ЧК-2951', at: '2026-10-08T13:24:00Z', when: '16:30', n: 1, total: 410,
            status: 'new', test: true, confirmed: true, phone: '0898 281 221',
            lines: [{ name: 'Грис на стероиди', cfg: 'Оризов грис 80 г', qty: 1, unit: 410, kcal: 500, p: 30, c: 70, f: 8, allerg: [] }] }] } })
      }
      return route.fulfill({ json: { ok: true, orders: [] } })
    })
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html#confirm=' + TOKEN)

    await expect(page.locator('#meMsg')).toHaveText('Поръчка ЧК-2951 е потвърдена и е в кухнята. (Проба — не се готви.)')
    await expect(page.locator('#meBox')).toContainText('niki@primer.bg')
    const card = page.locator('.ord', { hasText: 'ЧК-2951' })
    await expect(card.locator('.ord-st')).toHaveText('Чака потвърждение')
    expect(page.url()).not.toContain('confirm=')
    expect(calls.find(c => c.action === 'confirm').token).toBe(TOKEN)
    expect(await page.evaluate(() => localStorage.getItem('cc_me'))).toBe('metokenmetokenmetoken012345')
  })

  test('непотвърдената поръчка казва, че чака имейла', async ({ page }) => {
    await page.route(ORDER_URL, route => route.fulfill({ json: { orders: [{ code: 'ЧК-1000', status: 'new', confirmed: false }] } }))
    await page.addInitScript(() => {
      sessionStorage.setItem('cc_splash', '1')
      localStorage.setItem('cc_orders', JSON.stringify([{ code: 'ЧК-1000', at: new Date().toISOString(), phone: '0898281221',
        when: '', n: 1, total: 410, test: true, status: 'new', confirmed: false, lines: [] }]))
    })
    await page.goto('/cheatcode/index.html')
    await page.locator('.nav-inner [data-go="orders"]').click()
    await expect(page.locator('.ord', { hasText: 'ЧК-1000' }).locator('.ord-st')).toHaveText('Потвърди от имейла')
  })

  /* Линкът от писмото отваря поръчките на нов телефон: нищо на устройството,
     всичко идва от функцията по ключа в адреса. */
  test('линкът по имейл носи поръчките и данните на нов телефон', async ({ page }) => {
    const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345'
    const calls = []
    await page.route(ORDER_URL, async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      calls.push(body)
      if (body.action === 'me') {
        expect(body.token).toBe(TOKEN)
        return route.fulfill({ json: {
          email: 'niki@primer.bg', name: 'Ники', phone: '0898 281 221',
          orders: [{ code: 'ЧК-7777', at: '2026-10-07T11:00:00Z', when: '12:30', n: 2, total: 1380,
            status: 'picked_up', test: true, phone: '0898 281 221',
            lines: [{ name: 'Телешки боул', cfg: 'кайма 250 г', qty: 2, unit: 690, kcal: 700, p: 60, c: 80, f: 15, allerg: ['Глутен (следи)'] }] }],
        } })
      }
      return route.fulfill({ json: { ok: true, orders: [] } })
    })
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html#me=' + TOKEN)

    // Отваря направо поръчките, а ключът излиза от адреса.
    const card = page.locator('.ord', { hasText: 'ЧК-7777' })
    await expect(card).toBeVisible()
    expect(page.url()).not.toContain('me=')
    await expect(page.locator('#meBox')).toContainText('niki@primer.bg')
    await expect(card.locator('.ord-st')).toHaveText('Взета')
    await card.locator('.lhead').click()
    await expect(card.getByText('Алергени: Глутен (следи)')).toBeVisible()

    await card.getByRole('button', { name: 'Поръчай пак' }).click()
    await expect(page.locator('#cartLines .line')).toHaveCount(1)
    await expect(page.locator('#fName')).toHaveValue('Ники')
    await expect(page.locator('#fEmail')).toHaveValue('niki@primer.bg')

    // „Забрави този телефон“ маха ключа, поръчките и данните оттук.
    await page.locator('.nav-inner [data-go="orders"]').click()
    await page.getByRole('button', { name: 'Забрави този телефон' }).click()
    await expect(page.getByText('Още нямаш поръчки оттук.')).toBeVisible()
    expect(calls.some(c => c.action === 'logout' && c.token === TOKEN)).toBe(true)
    expect(await page.evaluate(() => localStorage.getItem('cc_me'))).toBeNull()
  })

  test('линк по имейл се иска от „Поръчки“', async ({ page }) => {
    let asked = null
    await page.route(ORDER_URL, async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.action === 'link') asked = body
      return route.fulfill({ json: { ok: true } })
    })
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html')
    await page.locator('.nav-inner [data-go="orders"]').click()
    await page.locator('#meEmail').fill('niki@')
    await page.getByRole('button', { name: 'Прати линк' }).click()
    await expect(page.locator('#meMsg')).toHaveText('Имейлът изглежда непълен.')
    expect(asked).toBeNull()
    await page.locator('#meEmail').fill('niki@primer.bg')
    await page.getByRole('button', { name: 'Прати линк' }).click()
    await expect(page.locator('#meMsg')).toContainText('Пратихме линк на niki@primer.bg')
    expect(asked).toEqual({ action: 'link', email: 'niki@primer.bg' })
  })

  /* Изтекъл линк не оставя човека пред празен екран без обяснение. */
  test('изтекъл линк казва какво да направиш', async ({ page }) => {
    await page.route(ORDER_URL, route => route.fulfill({ status: 401, json: { error: 'link' } }))
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html#me=abcdefghijklmnopqrstuvwxyz012345')
    await expect(page.locator('#meMsg')).toContainText('Линкът е изтекъл')
    await expect(page.getByRole('button', { name: 'Прати линк' })).toBeVisible()
  })

  /* Стъклената верига в сплаша е само от кеша. Първото отваряне не тегли
     600 KB three.js заради марка — свири плоската. */
  test('първото отваряне не тегли three.js за сплаша', async ({ page }) => {
    const asked = []
    page.on('request', r => { if (r.url().includes('three-r128')) asked.push(r.url()) })
    await page.goto('/cheatcode/index.html')
    await expect(page.locator('#splash')).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.locator('#splash.glass')).toHaveCount(0)
    expect(await page.locator('script[src*="three-r128"]').count()).toBe(0)
    expect(asked).toEqual([])
  })

  test('без поръчки — казва го', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('cc_splash', '1'))
    await page.goto('/cheatcode/index.html')
    await page.locator('.nav-inner [data-go="orders"]').click()
    await expect(page.getByText('Още нямаш поръчки оттук.')).toBeVisible()
  })
})
