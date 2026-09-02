import { test } from '@playwright/test'
import { enterApp } from './harness.js'

/* Не е тест, а поглед.
 *
 * Снима всеки основен екран, за да може промяна по цветовете, движението или
 * стъклото да се види, вместо да се твърди. Пуска се на ръка:
 *   npx playwright test shots --project=mobile
 */

/* Разделите се хващат по надписа, който носят на екрана — той е адресът им
   за човек и за тест. Средният бутон е действието, затова индекси няма. */
const TABS = ['ФИЙД', 'ХРАНЕНЕ', 'ТРЕНИРОВКА', 'ПРОФИЛ']

for (const theme of ['dark', 'light', 'glass']) {
  test(`екрани — тема ${theme}`, async ({ page }) => {
    // Сплашът, пристигането на картите и четири раздела по секунда не се
    // побират в трийсетте секунди по подразбиране.
    test.setTimeout(120000)
    await enterApp(page, { theme })
    // Пристигането на картите се харчи веднъж; изчаква се да свърши, за да не
    // снимаме половин анимация.
    await page.waitForTimeout(1200)

    for (const name of TABS) {
      await page.locator('nav button', { hasText: name }).first().click()
      await page.waitForTimeout(1100)
      await page.screenshot({ path: `shots/${theme}-${name}.png` })
    }
  })
}
