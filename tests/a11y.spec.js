import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { enterApp } from './harness.js'

/* Достъпността на четирите раздела, в кристала и в светлата тема.
 *
 * Пада при сериозно или критично нарушение — бутон без име, скрит елемент,
 * до който стига фокусът, липсващ етикет. Контрастът е извън проверката
 * нарочно: избледнелите дни в календара и етикетите от 9 px са решения по
 * дизайн системата (виж „Отворената дупка" в docs/DESIGN.md), не грешки, и
 * се гледат в одита на /tablo/, не тук. */

const TABS = ['ПОТОК', 'ХРАНЕНЕ', 'ТРЕНИРОВКА', 'ПРОФИЛ']

for (const theme of ['glass', 'light']) {
  test(`достъпност — тема ${theme}`, async ({ page }) => {
    test.setTimeout(120000)
    await enterApp(page, { theme })
    await page.waitForTimeout(1200)
    const found = []
    for (const name of TABS) {
      await page.locator('nav button', { hasText: name }).first().click()
      await page.waitForTimeout(900)
      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast'])
        .analyze()
      for (const v of r.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') {
          found.push(`${name}: ${v.id} (${v.nodes.length}) — ${v.nodes[0]?.target.join(' ')}`)
        }
      }
    }
    expect(found).toEqual([])
  })
}
