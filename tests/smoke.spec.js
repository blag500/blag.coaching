import { test, expect } from '@playwright/test'
import { enterApp } from './harness.js'

/* Смоук набор срещу приложението, каквото е.
 *
 * Предишният беше писан срещу версия с четири раздела на английски, „food log"
 * и SOS бутон — двайсет и шест провала, всичките от години. Тест, който винаги
 * е червен, е същото като никакъв тест: следващият истински провал няма да се
 * забележи сред останалите.
 *
 * Тук всичко минава през харнеса: сесия в localStorage и Supabase, посрещнат
 * от таблици в паметта. Нищо не отива към продукционната база.
 */

/* Пейджърът нарочно преглъща втори натиск, докато страницата още пътува —
   четиристотин милисекунди мълчание са по-малкото зло от две страници, които
   се разминават. Затова тук не се цъка наред, а се чака разделът да кацне. */
async function goTab(page, label) {
  const tab = page.locator('nav').first().locator('button', { hasText: label }).first()
  await tab.click()
  await expect(tab).toHaveAttribute('aria-current', 'page', { timeout: 10000 })
}

test.describe('Влизане и навигация', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await enterApp(page)
  })

  test('минава сплаша и стига до лентата', async ({ page }) => {
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()
    // Четири раздела и бутонът за действие между тях.
    for (const label of ['ФИЙД', 'ХРАНЕНЕ', 'ТРЕНИРОВКА', 'ПРОФИЛ']) {
      await expect(nav.locator('button', { hasText: label }).first()).toBeVisible()
    }
  })

  test('всеки раздел се отваря', async ({ page }) => {
    await goTab(page, 'ХРАНЕНЕ')
    await expect(page.getByText('ПРИЕМ ДНЕС')).toBeVisible()

    await goTab(page, 'ПРОФИЛ')
    await expect(page.getByText('НАВИЦИ ДНЕС')).toBeVisible()

    await goTab(page, 'ТРЕНИРОВКА')
    await goTab(page, 'ФИЙД')
  })
})

test.describe('Табло ДНЕС', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    await enterApp(page)
    await goTab(page, 'ПРОФИЛ')
    await expect(page.getByText('НАВИЦИ ДНЕС')).toBeVisible()
  })

  test('макросите стигат стойностите си', async ({ page }) => {
    /* Числата се качват — затова се чака резултатът, а не се чете първият
       кадър. 1302 kcal е сборът на четирите реда в харнеса; ако броячът
       спре по средата или подмине целта, това пада. */
    await expect(page.getByText('1302', { exact: false }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('/2400').first()).toBeVisible()
  })

  test('навик се отмята и се връща', async ({ page }) => {
    const chip = page.getByRole('button', { name: 'Без захар' }).first()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  test('чаша вода се добавя', async ({ page }) => {
    await expect(page.getByText('5/8')).toBeVisible()
    await page.getByRole('button', { name: /чаша|glass/i }).first().click()
    await expect(page.getByText('6/8')).toBeVisible()
  })

  test('готовността се показва', async ({ page }) => {
    await expect(page.getByText('ГОТОВНОСТ')).toBeVisible()
  })
})

test.describe('Теми', () => {
  /* Пази поправка, която вече е била счупена веднъж: долната лента държеше
     кремав текст и почти черен овал, записани на ръка. На светла тема това
     значеше надписи, които не се четат, и активен раздел с тъмен текст върху
     тъмно. Токенът --text-rgb е причината да не се повтори — тестът пази
     него, а не конкретния цвят. */
  for (const [theme, dark] of [['dark', true], ['light', false], ['glass', true]]) {
    test(`лентата се чете на тема ${theme}`, async ({ page }) => {
      test.setTimeout(60000)
      await enterApp(page, { theme })

      const tab = page.locator('nav').first().locator('button', { hasText: 'ФИЙД' }).first()
      const rgb = await tab.evaluate(el => getComputedStyle(el).color)
      const [r, g, b] = rgb.match(/[\d.]+/g).map(Number)
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

      // Светъл текст върху тъмна тема, тъмен върху светла. Обратното е бъгът.
      if (dark) expect(luma).toBeGreaterThan(0.5)
      else      expect(luma).toBeLessThan(0.5)
    })
  }
})

test.describe('Времевата линия', () => {
  /* Жестовете тук не са украса: линията е единственият екран, на който нещо
     се създава с влачене, а тези два теста вече хванаха сгрешена мишена —
     натискането падаше в реда за часа вместо в платното. */
  async function openTasks(page) {
    await enterApp(page)
    await page.locator('header button').first().click()
    await page.waitForTimeout(700)
    await page.locator('button', { hasText: 'ЗАДАЧИ' }).first().click()
    await page.waitForTimeout(1800)
  }

  test('задържане върху празно изрязва и пита за име', async ({ page }) => {
    test.setTimeout(90000)
    await openTasks(page)
    // Видимата част на линията, не цялото платно: то е превъртяно и горният му
    // ръб стои извън екрана.
    const view = page.locator('[class*="scroller"]').first()
    const b = await view.boundingBox()
    const x = b.x + b.width - 40
    const y = b.y + b.height - 120

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(420)              // задържането
    await page.mouse.move(x, y + 90, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    await expect(page.getByPlaceholder('Какво има тогава?')).toBeVisible()
  })

  test('кратко натискане не изрязва нищо', async ({ page }) => {
    test.setTimeout(90000)
    await openTasks(page)
    const view = page.locator('[class*="scroller"]').first()
    const b = await view.boundingBox()
    await page.mouse.click(b.x + b.width - 40, b.y + b.height - 120)
    await page.waitForTimeout(500)
    await expect(page.getByPlaceholder('Какво има тогава?')).toHaveCount(0)
  })

  test('час, написан в текста, слага задачата на линията', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await page.locator('header button').first().click()
    await page.waitForTimeout(700)
    await page.locator('button', { hasText: 'ЗАДАЧИ' }).first().click()
    await page.waitForTimeout(1800)

    await page.getByPlaceholder('Нова задача...').fill('Масаж 16:00 90м')
    await page.locator('[class*="submitBtn"]').first().click()
    await page.waitForTimeout(800)

    // Името е без часа, а блокът е на линията
    const block = page.locator('[class*="block_"]').filter({ hasText: 'Масаж' }).first()
    await expect(block).toBeVisible()
    await expect(block).not.toContainText('16:00 90')
    await page.screenshot({ path: 'shots/quick.png' })
  })

  test('препоръките ги няма', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await page.locator('header button').first().click()
    await page.waitForTimeout(700)
    await page.locator('button', { hasText: 'ЗАДАЧИ' }).first().click()
    await page.waitForTimeout(1500)
    await expect(page.getByText('ПРЕПОРЪКИ')).toHaveCount(0)
  })
})

test.describe('Прогресия', () => {
  /* Две имена за едно движение са най-честият начин осем седмици прогрес да
     се разцепят на две криви. Тестът пази точно това — и вече хвана един
     истински бъг: след обединяване екранът оставаше на изчезнало име. */
  test('обединяване на две имена дава една прогресия', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await page.locator('nav').first().locator('button', { hasText: 'ТРЕНИРОВКА' }).first().click()
    await page.waitForTimeout(2000)
    await page.locator('[role="tab"], [class*="homeTab"]').nth(1).click().catch(() => {})
    await page.waitForTimeout(1000)
    await page.locator('button', { hasText: 'Upper A' }).first().click()
    await page.waitForTimeout(800)
    await page.locator('button', { hasText: 'Лежанка' }).first().click()
    await page.waitForTimeout(1000)

    // Само своите вписвания: едно
    const entries = page.locator('[class*="statVal"]').first()
    await expect(entries).toHaveText('1')

    await page.locator('button', { hasText: 'Това е същото като' }).first().click()
    await page.waitForTimeout(400)
    await page.locator('button', { hasText: 'Лежанка с щанга' }).first().click()
    await page.waitForTimeout(1500)

    // След обединяването кривата носи и двете
    await expect(entries).toHaveText('2')
  })
})
