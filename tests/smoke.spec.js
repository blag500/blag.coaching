import { test, expect } from '@playwright/test'
import { enterApp, TABLES, USER_ID, today } from './harness.js'

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
    for (const label of ['ПОТОК', 'ХРАНЕНЕ', 'ТРЕНИРОВКА', 'ПРОФИЛ']) {
      await expect(nav.locator('button', { hasText: label }).first()).toBeVisible()
    }
  })

  test('всеки раздел се отваря', async ({ page }) => {
    await goTab(page, 'ХРАНЕНЕ')
    await expect(page.getByText('ПРИЕМ ДНЕС')).toBeVisible()

    await goTab(page, 'ПРОФИЛ')
    await expect(page.getByText('НАВИЦИ ДНЕС')).toBeVisible()

    await goTab(page, 'ТРЕНИРОВКА')
    await goTab(page, 'ПОТОК')
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

      const tab = page.locator('nav').first().locator('button', { hasText: 'ПОТОК' }).first()
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
    await page.locator('[class*="mergeSelect"]').first().selectOption('Лежанка с щанга')
    await page.waitForTimeout(1500)

    // След обединяването кривата носи и двете
    await expect(entries).toHaveText('2')
  })
})


test.describe('Дневникът с храната', () => {
  /* Списъкът е по-дълъг от екрана, а докато редът е вдигнат, страницата е
     заключена — иначе тя щеше да се плъзга под пръста. Значи вдигнатият ред
     трябва сам да кара страницата да пълзи, щом пръстът стигне ръба; без
     това последното ястие не може да се премести в закуската, защото
     закуската е три екрана нагоре. */
  test('влаченият ред кара страницата да пълзи към горния ръб', async ({ page }) => {
    test.setTimeout(90000)

    // Толкова редове, че екранът да не ги побира.
    const seeded = TABLES.food_logs.slice()
    for (let i = 0; i < 24; i++) {
      TABLES.food_logs.push({
        id: `fx${i}`, user_id: USER_ID, date: today(), name: `Продукт ${i}`,
        grams: 100, kcal: 100, protein: 10, carbs: 10, fat: 1,
        meal_type: 'dinner', estimated: null,
      })
    }

    try {
      await enterApp(page)
      await goTab(page, 'ХРАНЕНЕ')
      const grips = page.locator('[aria-label="Влачи, за да преместиш"]')
      await expect(grips.first()).toBeVisible({ timeout: 15000 })

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(300)
      const before = await page.evaluate(() => window.scrollY)
      expect(before).toBeGreaterThan(200)

      const grip = grips.last()
      const box = await grip.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      // Пръстът отива в горната ивица и стои там — движение вече няма,
      // пълзенето трябва да продължи само.
      await page.mouse.move(box.x + box.width / 2, 24, { steps: 8 })
      await page.waitForTimeout(600)
      const after = await page.evaluate(() => window.scrollY)
      await page.mouse.up()

      expect(after).toBeLessThan(before - 100)
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })

  /* Влаченето стига до съседната секция; за трите екрана нататък е моливът.
     Тестът върви по краткия път: молив → хапче → запази, и ястието трябва да
     е сменило секцията си. */
  test('моливът мести ястието в друго хранене', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await goTab(page, 'ХРАНЕНЕ')

    const row = page.locator('li', { hasText: 'Пилешко филе' }).first()
    await expect(row).toBeVisible({ timeout: 15000 })
    // Заварено е в обяда.
    await expect(page.locator('section', { has: page.getByText('Пилешко филе') })
      .locator('[class*="mealName"]')).toHaveText('Обяд')

    await page.locator('[aria-label="Редактирай Пилешко филе"]').click()
    await page.locator('button', { hasText: 'Закуска' }).last().click()
    await page.locator('button', { hasText: 'Запази' }).click()
    await page.waitForTimeout(600)

    await expect(page.locator('section', { has: page.getByText('Пилешко филе') })
      .locator('[class*="mealName"]')).toHaveText('Закуска')
  })

  /* Един пръст държи ястието, друг върти страницата — и то работи, защото
     дръжката е с touch-action: none и пръстът от нея не превърта нищо.
     Тестът минава през CDP, защото Playwright знае само едно докосване, а
     тук целият смисъл е във второто. */
  test('втори пръст върти страницата, докато първият държи ястието', async ({ page, browserName }, testInfo) => {
    // Две докосвания наведнъж се пращат само през CDP, а CDP го има само на
    // Chromium — и то на профил с екран за пипане. WebKit остава за телефона.
    test.skip(browserName !== 'chromium' || !testInfo.project.use.hasTouch,
      'иска Chromium с докосване (профил mobile)')
    test.setTimeout(90000)

    const seeded = TABLES.food_logs.slice()
    for (let i = 0; i < 24; i++) {
      TABLES.food_logs.push({
        id: `ft${i}`, user_id: USER_ID, date: today(), name: `Продукт ${i}`,
        grams: 100, kcal: 100, protein: 10, carbs: 10, fat: 1,
        meal_type: 'dinner', estimated: null,
      })
    }

    try {
      await enterApp(page)
      await goTab(page, 'ХРАНЕНЕ')
      const grips = page.locator('[aria-label="Влачи, за да преместиш"]')
      await expect(grips.first()).toBeVisible({ timeout: 15000 })

      await page.evaluate(() => window.scrollTo(0, 400))
      await page.waitForTimeout(300)
      const before = await page.evaluate(() => window.scrollY)

      // Първият пръст хваща ястието в средата на екрана — далеч от ивиците,
      // за да не се намеси самопревъртането и да отчетем чуждо движение.
      // Дръжките под сгъвката имат кутия извън прозореца; търси се първата,
      // която наистина се вижда.
      const vh = page.viewportSize().height
      const mid = vh / 2
      let box = null
      for (let i = 0; i < await grips.count(); i++) {
        const b = await grips.nth(i).boundingBox()
        if (b && b.y > 200 && b.y < vh - 240) { box = b; break }
      }
      expect(box).not.toBeNull()
      const gx = box.x + box.width / 2
      const gy = box.y + box.height / 2

      const cdp = await page.context().newCDPSession(page)
      const one = { x: gx, y: gy, id: 1 }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [one] })
      await page.waitForTimeout(150)

      const row = page.locator('[class*="entryDragging"]')
      await expect(row).toHaveCount(1)
      const grabbed = await row.evaluate(el => el.style.transform)

      // Вторият пръст тръгва отдолу и дърпа страницата нагоре.
      const two = y => ({ x: gx + 150, y, id: 2 })
      const from = vh - 200
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [one, two(from)] })
      for (let dy = 20; dy <= 200; dy += 20) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [one, two(from - dy)] })
        await page.waitForTimeout(16)
      }
      await page.waitForTimeout(150)

      const after = await page.evaluate(() => window.scrollY)
      // Ястието още е в ръката, не е скочило при втория пръст и е отчело
      // изминалото под него.
      await expect(row).toHaveCount(1)
      const still = await row.evaluate(el => el.style.transform)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

      expect(after).toBeGreaterThan(before + 150)
      expect(still).not.toBe(grabbed)
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })
})


test.describe('Награди', () => {
  /* Наградата се печели навсякъде, значи трябва да се вижда навсякъде и да
     иска натискане, за да си отиде. Тестът отмята последните два навика и
     чака прозорчето отпред. */
  test('изпълнените навици вдигат прозорче, което чака натискане', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await goTab(page, 'ПРОФИЛ')

    // Четири от шест са отметнати в харнеса; последните два ги затваряме тук.
    for (const name of ['10 000 крачки', 'Без захар']) {
      await page.locator('button', { hasText: name }).first().click()
      await page.waitForTimeout(400)
    }

    const popup = page.locator('[role="dialog"]')
    await expect(popup).toBeVisible({ timeout: 10000 })
    await expect(popup).toContainText('НАВИЦИ')

    // Не си отива само. Изчакваме по-дълго от стария таймер от три секунди.
    await page.waitForTimeout(3500)
    await expect(popup).toBeVisible()

    await popup.click({ position: { x: 10, y: 10 } })
    await expect(popup).toHaveCount(0)
  })

  /* Първото отваряне за деня. Другите награди чакат да свършиш нещо; тази
     чака само да се появиш — и носи числото на низа. */
  test('първото отваряне за деня вдига поздрав с низа', async ({ page }) => {
    test.setTimeout(90000)
    const seeded = TABLES.food_logs.slice()
    for (let d = 0; d < 4; d++) {
      TABLES.food_logs.push({
        id: `fnd${d}`, user_id: USER_ID, date: today(d), name: 'Ден',
        grams: 100, kcal: 900, protein: 10, carbs: 10, fat: 1,
        meal_type: 'lunch', estimated: null,
      })
    }
    try {
      await enterApp(page, { keepGreeting: true })
      const popup = page.locator('[role="dialog"]')
      await expect(popup).toBeVisible({ timeout: 15000 })
      // Числото е заглавието, не част от изречение — и се брои нагоре, затова
      // се чака да стигне.
      await expect(popup).toContainText('ДНИ ПОДРЕД')
      await expect(popup.locator('[class*="bigNum"]')).toHaveText('4', { timeout: 5000 })
      await popup.click({ position: { x: 10, y: 10 } })
      await expect(popup).toHaveCount(0)
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })

  /* Двата входа към наградите. Чекмеджето на треньора нямаше такъв ред —
     единственият човек, който я поиска, нямаше как да стигне до нея. А
     огънчето в лентата води до страницата за самото него. */
  test('огънчето води до страницата с наградите', async ({ page }) => {
    test.setTimeout(90000)
    const seeded = TABLES.food_logs.slice()
    for (let d = 0; d < 6; d++) {
      TABLES.food_logs.push({
        id: `fst${d}`, user_id: USER_ID, date: today(d), name: 'Ден',
        grams: 100, kcal: 2200, protein: 10, carbs: 10, fat: 1,
        meal_type: 'lunch', estimated: null,
      })
    }
    try {
      await enterApp(page)
      const streak = page.locator('header [class*="streak"]').first()
      await expect(streak).toBeVisible({ timeout: 15000 })
      await streak.click()
      await expect(page.locator('text=ПЪРВА КРАЧКА').first()).toBeVisible({ timeout: 15000 })
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })

  /* Страницата с наградите: спечелените отпред, останалите угаснали и
     подредени по близост. Смята се от вписаното, значи важи и назад. */
  test('страницата с наградите показва спечеленото и следващото', async ({ page }) => {
    test.setTimeout(90000)
    const seeded = TABLES.food_logs.slice()
    for (let d = 0; d < 9; d++) {
      TABLES.food_logs.push({
        id: `faw${d}`, user_id: USER_ID, date: today(d), name: 'Ден',
        grams: 100, kcal: 2200, protein: 10, carbs: 10, fat: 1,
        meal_type: 'lunch', estimated: null,
      })
    }
    try {
      await enterApp(page)
      await page.locator('header button').first().click()
      await page.waitForTimeout(600)
      await page.locator('button', { hasText: 'НАГРАДИ' }).first().click()
      await page.waitForTimeout(2500)

      // Девет дни поред: седмицата е взета, месецът още не.
      await expect(page.locator('text=СЕДМИЦА').first()).toBeVisible()
      await expect(page.locator('text=9 от 30').first()).toBeVisible()
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })

  /* Низът брои дни с вписано нещо, а днешният ден не го къса, докато е още
     празен — денят не е свършил. Тук са пет поред, значи значката казва пет. */
  test('низът брои дните подред и стои на снимката', async ({ page }) => {
    test.setTimeout(90000)
    const seeded = TABLES.food_logs.slice()
    for (let d = 0; d < 5; d++) {
      TABLES.food_logs.push({
        id: `fstr${d}`, user_id: USER_ID, date: today(d), name: 'Ден',
        grams: 100, kcal: 500, protein: 10, carbs: 10, fat: 1,
        meal_type: 'lunch', estimated: null,
      })
    }
    try {
      await enterApp(page)
      await goTab(page, 'ХРАНЕНЕ')
      const streak = page.locator('header [class*="streak"]').first()
      await expect(streak).toBeVisible({ timeout: 15000 })
      await expect(streak).toHaveText('5')
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })

  /* Обратното е също толкова важно: ден, който вече е изпълнен, не е
     постижение, случило се сега. Наградата тръгва от преминаване, а докато
     мрежата мълчи, празният ден е неизвестен, не празен — точно там се
     раждаше прозорче при всяко отваряне. */
  test('вече изпълненият ден не вдига прозорче при отваряне', async ({ page }) => {
    test.setTimeout(90000)
    const seeded = TABLES.food_logs.slice()
    TABLES.food_logs.push({
      id: 'fbig', user_id: USER_ID, date: today(), name: 'Голяма чиния',
      grams: 1000, kcal: 3000, protein: 100, carbs: 300, fat: 80,
      meal_type: 'dinner', estimated: null,
    })
    try {
      await enterApp(page)
      await goTab(page, 'ХРАНЕНЕ')
      await page.waitForTimeout(2500)
      await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    } finally {
      TABLES.food_logs.length = 0
      TABLES.food_logs.push(...seeded)
    }
  })
})


test.describe('Рецепти', () => {
  /* Рецептата се пише вътре в раздел, който се сменя със замятане на пръст.
     Дотук едно погрешно замятане изтриваше събраните съставки, без нищо да се
     е счупило — просто сменена страница. Черновата прави излизането
     прекъсване, а не загуба. */
  test('недовършената рецепта се връща след излизане', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await goTab(page, 'ХРАНЕНЕ')
    await page.locator('button', { hasText: 'РЕЦЕПТИ' }).first().click()
    await page.waitForTimeout(800)
    await page.locator('[class*="newBtn"]').first().click()
    await page.waitForTimeout(600)

    const nameInput = page.locator('input[placeholder*="рецептата"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })
    await nameInput.fill('Овесена каша')
    await page.waitForTimeout(400)

    // Излизане: стрелката назад е същото размонтиране като смяна на раздел.
    await page.locator('[class*="backBtn"]').first().click()
    await page.waitForTimeout(500)
    await expect(nameInput).toHaveCount(0)

    await page.locator('[class*="newBtn"]').first().click()
    await page.waitForTimeout(600)
    await expect(page.locator('text=Върнах недовършеното')).toBeVisible()
    await expect(nameInput).toHaveValue('Овесена каша')

    // И начисто наистина чисти.
    await page.locator('button', { hasText: 'Начисто' }).click()
    await expect(nameInput).toHaveValue('')
  })

  /* Входовете за рецепта са два и другият е по-крехкият: листът в
     БИБЛИОТЕКА се затваря при допир по фона, без да пита. Числата там са на
     100 грама, както пише на кутията, и редът казва колко дава след
     умножението. */
  test('библиотеката отваря същия редактор и пази недовършеното', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await goTab(page, 'ХРАНЕНЕ')
    await page.locator('[aria-label="Библиотека"]').first().click()
    await page.waitForTimeout(700)
    await page.locator('[class*="newBtn"]').first().click()
    await page.waitForTimeout(700)

    /* Същият редактор като при рецептите — значи същото поле за име. Ако
       някога пак се разделят на два, този тест ще е първият, който го каже. */
    const nameInput = page.locator('input[placeholder*="рецептата"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })
    await nameInput.fill('Моя закуска')
    await page.waitForTimeout(400)

    await page.locator('[class*="backBtn"]').first().click()
    await page.waitForTimeout(500)
    await page.locator('[class*="newBtn"]').first().click()
    await page.waitForTimeout(700)
    await expect(page.locator('text=Върнах недовършеното')).toBeVisible()
    await expect(nameInput).toHaveValue('Моя закуска')
  })
})


test.describe('Без мрежа', () => {
  /* Дотук неуспешният запис махаше отметката и вибрираше — вибрация в джоба,
     след като телефонът е прибран, значи тихо неотчетено. Сега записът чака,
     вижда се, че чака, и тръгва сам, щом мрежата се върне. */
  test('отметка без мрежа остава и чака, после заминава', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await goTab(page, 'ПРОФИЛ')
    await page.waitForTimeout(1200)

    // Мрежата пада само за навиците — останалото продължава да работи,
    // както би било при слаб сигнал.
    await page.route('**/*.supabase.co/**/habit_completions**', r => r.abort())

    const chip = page.locator('button', { hasText: '10 000 крачки' }).first()
    await chip.click()
    await page.waitForTimeout(800)

    const banner = page.locator('text=Незаписано: 1')
    await expect(banner).toBeVisible({ timeout: 10000 })

    // Мрежата се връща и опашката тръгва сама при натискане.
    await page.unroute('**/*.supabase.co/**/habit_completions**')
    await page.locator('button', { hasText: 'ОПИТАЙ' }).click()
    await expect(banner).toHaveCount(0, { timeout: 10000 })
  })
})


test.describe('Тренировка', () => {
  /* Огънчето трябва да е на всеки екран — то е състояние, не функция на една
     страница. ПРОГРАМА се натиска веднъж на няколко седмици и слезе при
     прогресията, където така или иначе се мисли за плана. */
  test('лентата носи снимката с низа, а ПРОГРАМА е при прогресията', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page, { profile: { role: 'coach' } })
    await goTab(page, 'ТРЕНИРОВКА')

    await expect(page.locator('header button', { hasText: 'ПРОГРАМА' })).toHaveCount(0)
    await expect(page.locator('header [class*="avatarBtn"]')).toBeVisible()

    await page.locator('[role="tab"]').nth(1).click()
    await expect(page.locator('button', { hasText: 'ПРОГРАМА' })).toHaveCount(1)
  })

  /* Планът го нарича „Почивка / Кардио"; редът казва само каквото решава
     деня, а подробността стои отдолу. */
  test('почивката е само почивка и носи свой знак', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await goTab(page, 'ТРЕНИРОВКА')
    const rest = page.locator('li', { hasText: 'Почивка' }).first()
    await expect(rest).toBeVisible({ timeout: 15000 })
    await expect(rest.locator('[class*="chapterName"]')).toHaveText('Почивка')
    await expect(rest.locator('[class*="chapterIcon"] svg')).toBeVisible()
  })
})

test.describe('Счупено', () => {
  /* Конзолата на телефон никой не я отваря: клиент, на когото екранът е
     гръмнал, или пише, или просто спира да влиза. Редът трябва да замине сам,
     и то с достатъчно, за да се намери мястото — кой екран, коя сглобка, кой
     телефон. */
  test('грешката извън рисуването заминава към базата', async ({ page }) => {
    test.setTimeout(90000)
    const sent = []
    page.on('request', r => {
      if (r.url().includes('client_errors')) sent.push(r.postData() || '')
    })

    await enterApp(page)
    await page.waitForTimeout(1200)

    /* Отхвърлено обещание, не грешка при рисуване: точно това ErrorBoundary
       не лови и точно то не оставяше следа никъде. */
    await page.evaluate(() => {
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('нарочно счупено за проба'),
      }))
    })
    await page.waitForTimeout(1500)

    expect(sent.length).toBe(1)
    const row = JSON.parse(sent[0])
    expect(row.message).toContain('нарочно счупено за проба')
    expect(row.screen).toBeTruthy()
    expect(row.app_version).toBeTruthy()
    expect(row.user_id).toBeTruthy()
  })

  /* Един и същ ред, който гърми при всяко рисуване, би напълнил таблицата за
     секунди — а от втория запис нататък не казва нищо ново. */
  test('един и същи ред не се праща два пъти', async ({ page }) => {
    test.setTimeout(90000)
    const sent = []
    page.on('request', r => {
      if (r.url().includes('client_errors')) sent.push(r.postData() || '')
    })

    await enterApp(page)
    await page.waitForTimeout(1200)

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.resolve(),
          reason: new Error('същото счупено'),
        }))
      })
      await page.waitForTimeout(500)
    }

    expect(sent.length).toBe(1)
  })
})

test.describe('Чат', () => {
  /* Разговорът се теглеше цял — и не веднъж при отваряне, а на всеки
     петнайсет секунди, докато екранът стои отворен. При двайсет съобщения е
     незабележимо; при година разговор са хиляди реда по мрежата, само за да
     се види дали има един нов. Тестът гледа формата на заявката, защото точно
     тя е поправката: последните петдесет, подредени по време. */
  test('нишката иска последните петдесет, не всичко', async ({ page }) => {
    test.setTimeout(90000)
    const asked = []
    page.on('request', r => {
      const u = r.url()
      if (u.includes('/rest/v1/messages')) asked.push(decodeURIComponent(u))
    })

    await enterApp(page)
    await page.locator('button[aria-label="Меню"]').first().click()
    await page.waitForTimeout(600)
    await page.getByText('ЧАТ', { exact: true }).first().click()
    await page.waitForTimeout(1200)
    // Списъкът с разговори; нишката е зад един ред от него.
    await page.getByText('Николай Благьов').first().click()
    await page.waitForTimeout(1500)

    const first = asked.find(u => u.includes('from_user_id'))
    expect(first, 'нишката изобщо не пита за съобщения').toBeTruthy()
    expect(first).toContain('limit=50')
    expect(first).toContain('order=created_at.desc')

    /* И самата нишка се рисува. Проверка само на заявката мина и над екран,
       който гърми: един ефект беше попаднал вътре в друг и React вдигаше
       „невалидно извикване на кука" — а за теста това беше все едно. */
    await expect(page.locator('text=Всичко е вписано.').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Нещо се счупи')).toHaveCount(0)
  })
})

test.describe('Балончето на бота', () => {
  /* Балонче, което стои върху всичко, рано или късно застава точно върху
     онова, което трябва да се натисне. Затова се мести — и си отива, ако
     съвсем пречи. Тестът минава целия кръг, защото трите парчета живеят на
     различни места: жестът е в балончето, скриването е в localStorage, а
     връщането е бутон на друга страница. */
  test('откача се след задържане, маха се и се връща', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await page.waitForTimeout(1600)

    const bubble = page.locator('button[aria-label="БЛАГ БОТ"]')
    await expect(bubble).toBeVisible()
    const box = await bubble.boundingBox()

    // Задържане над прага — мишената се появява.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(900)
    await expect(page.locator('[class*="drop"]').first()).toBeVisible()

    // Влачене до мишената и пускане.
    const vw = await page.evaluate(() => window.innerWidth)
    await page.mouse.move(vw / 2, 115, { steps: 12 })
    await page.waitForTimeout(300)
    await page.mouse.up()
    await page.waitForTimeout(500)
    await expect(bubble).toHaveCount(0)

    // Връща се от своята страница.
    await page.locator('button[aria-label="Меню"]').first().click()
    await page.waitForTimeout(600)
    await page.getByText('БЛАГ БОТ', { exact: true }).first().click()
    await page.waitForTimeout(1000)
    const restore = page.getByText('Върни балончето на екрана')
    await expect(restore).toBeVisible()
    await restore.click()
    await page.waitForTimeout(500)
    /* Разговорът е слой над страницата — свива се, не се напуска. */
    await page.locator('button[aria-label="Свий разговора"]').first().click()
    await page.waitForTimeout(900)
    await expect(page.locator('button[aria-label="БЛАГ БОТ"]')).toBeVisible()
  })
})

test.describe('Слоят на бота', () => {
  test('ботът е прозрачен слой и се свива от лицето', async ({ page }) => {
    test.setTimeout(60000)
    await enterApp(page)
    await page.waitForTimeout(1500)
    await page.locator('nav button', { hasText: 'ТРЕНИРОВКА' }).first().click()
    await page.waitForTimeout(1200)
  
    await page.locator('button[aria-label="БЛАГ БОТ"]').click()
    await page.waitForTimeout(900)
    /* Балончето пита кой разговор — нов или някой отпреди. */
    await page.getByText('Нов разговор').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Аз съм Благ Бот.')).toBeVisible()
    // Страницата отдолу още я има.
    await expect(page.locator('nav')).toHaveCount(1)
    await page.screenshot({ path: 'shots/tmp-layer.png' })
  
    // Свиване от лицето до отговора.
    await page.locator('button[aria-label="Свий разговора"]').last().click()
    await page.waitForTimeout(700)
    await expect(page.getByText('Аз съм Благ Бот.')).toHaveCount(0)
    await expect(page.locator('button[aria-label="БЛАГ БОТ"]')).toBeVisible()
  })
})

test.describe('Балончето и бутоните под него', () => {
  test('пускането на балончето не натиска бутона отдолу', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await page.waitForTimeout(1500)
    await page.locator('nav button', { hasText: 'ХРАНЕНЕ' }).first().click()
    await page.waitForTimeout(1400)
  
    const recipes = page.getByText('РЕЦЕПТИ', { exact: true }).first()
    const target = await recipes.boundingBox()
    const bubble = page.locator('button[aria-label="БЛАГ БОТ"]')
    const box = await bubble.boundingBox()
  
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(900)
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 14 })
    await page.waitForTimeout(200)
    await page.mouse.up()
    await page.waitForTimeout(900)
  
    // Рецептите НЕ трябва да са се отворили: решетката още показва избора.
    await expect(page.getByText('ЧЕРНОВА', { exact: true })).toBeVisible()
    await page.screenshot({ path: 'shots/tmp-ghost.png' })
  })
})

test.describe('Историята на разговорите', () => {
  test('балончето пита нов или отпреди', async ({ page }) => {
    test.setTimeout(60000)
    await enterApp(page)
    await page.waitForTimeout(1600)

    // Натискането на балончето не отваря празен разговор, а избор.
    await page.locator('button[aria-label="БЛАГ БОТ"]').click()
    await page.waitForTimeout(900)
    await expect(page.getByText('Нов разговор').first()).toBeVisible()
    // В списъка полето е скрито: написаното там няма къде да отиде.
    await expect(page.locator('input[placeholder="Питай ме нещо"]')).toBeHidden()
    await page.screenshot({ path: 'shots/tmp-chatlist.png' })

    await page.getByText('Нов разговор').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Аз съм Благ Бот.')).toBeVisible()
    await expect(page.locator('input[placeholder="Питай ме нещо"]')).toBeVisible()
  })
})

test.describe('Полетът на лицето', () => {
  test('лицето пътува до заглавието и се връща', async ({ page }) => {
    test.setTimeout(90000)
    await enterApp(page)
    await page.waitForTimeout(1600)

    const bubble = page.locator('button[aria-label="БЛАГ БОТ"]')
    const box = await bubble.boundingBox()
    const fly  = page.locator('img[aria-hidden="true"][src="/bot.webp"]')

    await bubble.click()
    await page.waitForTimeout(120)

    /* Пътят се чете от стиловете, не от кадрите: кадърът в тази среда се хваща
       наслуки, а WebKit без компоузитор не брои rAF. Тук се проверява самата
       уговорка — откъде тръгва, колко е голямо и по кой път. */
    const fl = await fly.evaluate(el => ({
      anim: getComputedStyle(el).animationName,
      disp: getComputedStyle(el).display,
      dx:   parseFloat(el.style.getPropertyValue('--fly-dx')),
      dy:   parseFloat(el.style.getPropertyValue('--fly-dy')),
      s:    parseFloat(el.style.getPropertyValue('--fly-s')),
      /* Мястото на кацане, а не къде е точно сега: рамката се мести всеки
           кадър и стойността ѝ зависи от това кога е четена. */
      top:  parseFloat(el.style.getPropertyValue('--fly-top')),
    }))
    expect(fl.disp).toBe('block')
    expect(fl.anim).toContain('flyUp')
    // Тръгва долу при балончето и в неговия размер.
    expect(fl.dy).toBeGreaterThan(300)
    /* Настрани се мери само посоката: на телефон балончето и заглавието са на
       един и същи десен ръб, на широк екран разговорът е колона в средата и
       пътят става наклонен. */
    expect(Math.sign(fl.dx) >= 0 || Math.abs(fl.dx) < 40).toBeTruthy()
    expect(fl.s).toBeGreaterThan(1.4)
    // Каца горе, в заглавието.
    expect(fl.top).toBeLessThan(80)
    // А тръгването е при балончето: мястото на кацане плюс пътя дава началото.
    expect(Math.abs(fl.top + fl.dy - (box.y + box.height / 2))).toBeLessThan(40)

    // Полетът свършва и лицето в заглавието поема.
    await page.waitForTimeout(700)
    expect(await fly.evaluate(el => getComputedStyle(el).display)).toBe('none')

    // Обратно: същият път, изминат назад.
    await page.getByText('Нов разговор').first().click()
    await page.waitForTimeout(600)
    await page.locator('button[aria-label="Свий разговора"]').last().click()
    await page.waitForTimeout(120)
    const back = await fly.evaluate(el => ({
      anim: getComputedStyle(el).animationName,
      disp: getComputedStyle(el).display,
    }))
    expect(back.disp).toBe('block')
    expect(back.anim).toContain('flyBack')

    await page.waitForTimeout(700)
    await expect(bubble).toBeVisible()
  })
})
