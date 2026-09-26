import { test } from '@playwright/test'
import { signIn } from './harness.js'

/* Не е тест, а поглед — същото като shots.spec.js, но за регистрацията.
 *
 * Общият shots влиза с готов профил и затова никога не вижда онбординга.
 * Тук профилът е недовършен, така че приложението отваря него.
 *   npx playwright test shots-onboarding --project=mobile
 */

for (const theme of ['dark', 'light', 'glass']) {
  test(`онбординг — тема ${theme}`, async ({ page }) => {
    test.setTimeout(120000)

    await signIn(page, {
      theme,
      /* Празно име, за да тръгне от първата стъпка; нищо зададено, за да
         минем през всичките шест. */
      profile: {
        onboarding_done: false,
        name: '', full_name: '',
        goal: null, gender: null, weight_kg: null, activity_level: null,
        calories: null, protein: null, carbs: null, fat: null,
        target_weight: null,
      },
    })
    await page.goto('/')

    /* Сплашът стои отгоре. Чака се заглавието на първата стъпка, не таймер. */
    await page.getByText('ДОБРЕ ДОШЪЛ').waitFor({ state: 'visible', timeout: 20000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `shots/ob-${theme}-1-име.png` })

    await page.getByRole('textbox').first().fill('Иван')
    await page.getByRole('button', { name: /НАПРЕД|ПРОДЪЛЖИ/i }).click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `shots/ob-${theme}-2-цел.png` })

    /* Целевият екран е този, който се преправя — снима се и с направен избор,
       защото цветът на пиктограмата се вижда чак тогава. */
    await page.locator('button').filter({ hasText: /ИЗГАРЯНЕ|ПОДДЪРЖАНЕ|ПОКАЧВАНЕ/ }).first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `shots/ob-${theme}-2-цел-избрана.png` })
  })
}
