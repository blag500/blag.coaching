import { test, expect } from '@playwright/test'
import { enterApp, USER_ID, today } from './harness.js'

/* Позингът: блокове, превключватели, снимане и сравнение.
 *
 * Камерата е фалшивата на Chromium (шарка вместо картина), затова снимането
 * се проверява само там. Пляскането не се проверява: фалшивият микрофон
 * пиука на секунда и би стрелял, когато си иска — тестът натиска затвора. */

test.use({
  // launchOptions тук замества тези от конфигурацията — пътят до Chromium
  // в облака (PW_CHROMIUM_PATH) се повтаря, иначе се търси свален браузър.
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
  },
  permissions: ['camera', 'microphone'],
})

async function openPosing(page, opts) {
  await enterApp(page, opts)
  await page.locator('button[aria-label="Меню"]').first().click()
  await page.waitForTimeout(600)
  await page.getByText('ПОУЗИНГ', { exact: true }).first().click()
  await expect(page.getByText('Класически бодибилдинг')).toBeVisible()
}

test('блокът сменя позите, превключвателят маха една', async ({ page }) => {
  await openPosing(page)
  const shoot = page.getByRole('button', { name: /СНИМАЙ · \d+/ })
  await expect(shoot).toHaveText('СНИМАЙ · 12')

  await page.getByText('Класическа физика').click()
  await expect(shoot).toHaveText('СНИМАЙ · 10')
  // Най-мускулестата не е в класическата физика.
  await expect(page.getByRole('switch', { name: 'НАЙ-МУСКУЛЕСТА' })).toHaveAttribute('aria-checked', 'false')

  await page.getByRole('switch', { name: 'ВАКУУМ' }).click()
  await expect(shoot).toHaveText('СНИМАЙ · 9')
})

test('камерата снима позата и минава на следващата', async ({ page }, info) => {
  test.skip(info.project.name === 'ios', 'фалшива камера има само в Chromium')
  const uploads = []
  page.on('request', r => { if (r.url().includes('/storage/v1/object/posing/')) uploads.push(r.url()) })

  await openPosing(page)
  await page.getByRole('button', { name: /СНИМАЙ · \d+/ }).click()
  await expect(page.getByText('ЧЕТВЪРТИНКА: ФРОНТ')).toBeVisible()

  // Без отброяване — направо.
  await page.getByRole('button', { name: '0', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0)
  await page.getByRole('button', { name: 'Снимай', exact: true }).click()

  await expect.poll(() => uploads.length).toBe(1)
  expect(uploads[0]).toContain(`/posing/${USER_ID}/`)
  await expect(page.getByText('ЧЕТВЪРТИНКА: ЛЯВА СТРАНА')).toBeVisible()
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible()
})

test('сравнението показва две дати на плъзгач', async ({ page }) => {
  await openPosing(page, {
    tables: {
      posing_shots: [
        { id: 'p1', user_id: USER_ID, pose_id: 'fdb', taken_on: today(30), path: `${USER_ID}/a/fdb.jpg` },
        { id: 'p2', user_id: USER_ID, pose_id: 'fdb', taken_on: today(1),  path: `${USER_ID}/b/fdb.jpg` },
      ],
    },
  })
  await page.getByRole('button', { name: 'СРАВНИ' }).click()
  await page.getByRole('button', { name: 'FDB', exact: true }).click()
  await expect(page.getByText('ФРОНТ ДВОЕН БИЦЕП')).toBeVisible()
  // Две снимки в плъзгача, с подписан линк към частната кофа.
  const imgs = page.locator('img[src*="/object/sign/posing/"]')
  await expect(imgs).toHaveCount(4) // две в плъзгача + две в лентата с датите
  await page.getByRole('button', { name: 'Една до друга' }).click()
  await expect(page.locator('figure')).toHaveCount(2)
})

test('библиотеката: филтрите стесняват, редът се разгъва', async ({ page }) => {
  await openPosing(page)
  await page.getByRole('button', { name: /Библиотека с пози/ }).click()
  await expect(page.getByText('95 пози')).toBeVisible()

  await page.getByRole('button', { name: 'В напад', exact: true }).click()
  await page.getByRole('button', { name: 'Гръб', exact: true }).click()
  await expect(page.getByText('9 пози')).toBeVisible()

  await page.getByRole('button', { name: /Стрелец/ }).click()
  await expect(page.getByText('Side Lunge Rear Archer')).toBeVisible()
  await expect(page.getByText(/опъва тетива/)).toBeVisible()
  await expect(page.getByText(/страничен напад: единият крак/)).toBeVisible()

  await page.getByRole('button', { name: 'Назад към списъка' }).or(page.locator('button', { hasText: '←' })).first().click()
  await expect(page.getByText('Класически бодибилдинг')).toBeVisible()
})
