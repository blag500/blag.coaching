import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { signIn } from './harness.js'

/* Разделът „Пари" на /tablo/. Данните в repo-то са измислени — истинските
 * живеят само в tablo_money. С MONEY_JSON=<път> се рендират истинските
 * (локално, за да се погледнат снимките в shots/). */

function fixture() {
  const card = []
  const cats = [['Kaufland', 'food', 9.5], ['Casper', 'coffee', 3.2], ['Shell', 'moto', 30], ['Claude', 'subs', 21.6], ['Sofia Transit', 'travel', 1.6]]
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10)
    const [mer, cat, amt] = cats[i % cats.length]
    card.push([d, `${String(8 + (i % 12)).padStart(2, '0')}:15`, mer, amt, cat, 0])
  }
  card.push(['2026-09-10', '12:00', 'Сервиз', 300, 'moto', 1])
  const events = []
  for (let i = 1; i <= 80; i++) {
    const d = new Date(Date.UTC(2026, 9, 31 + i)).toISOString().slice(0, 10)
    const w = new Date(d).getUTCDay()
    if (w === 1) events.push([d, 'VUSA', -25, 'invest'])
    if (d.endsWith('-01')) events.push([d, 'Кредит', -140, 'debt'])
  }
  events.push(['2026-11-30', 'Заплата', 1450, 'salary'], ['2026-12-31', 'Заплата', 1450, 'salary'])
  return {
    asOf: '2026-10-31', period: ['2026-09-01', '2026-10-30'],
    cash: { t212: 1200, pot: 5, bank: 10 }, invested: 500,
    salary: { min: 1400, max: 1500, mid: 1450, next: '2026-11-30' }, reserve: 200, roundups: 2,
    card, extra: [['2026-09-20', 35]], bank: [['2026-10-30', 'Заплата', 1450, 'salary'], ['2026-10-01', 'Кредит', -140, 'fixed']],
    fixed: [['Кредит', 140, 'month', 'на 1-во', 'debt'], ['VUSA', 108, 'week', 'понеделник', 'invest']],
    events, outlet: [['Маратонки', 60]],
  }
}

test('„Пари" показва свободните пари и местят ги плъзгачите', async ({ page }, info) => {
  const data = process.env.MONEY_JSON ? JSON.parse(readFileSync(process.env.MONEY_JSON, 'utf8')) : fixture()
  await signIn(page, { tables: { tablo_money: [{ id: 'current', data, updated_at: new Date().toISOString() }], tablo_items: [], tablo_daily: [], tablo_sessions: [], tablo_sync: [], tablo_jobs: [] } })
  await page.goto('/tablo/#money')
  await expect(page.getByRole('heading', { name: 'Пари' })).toBeVisible()
  await expect(page.getByText('Свободни за монитор, дрехи, техника')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Къде отива една заплата' })).toBeVisible()
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `shots/tablo-money-${info.project.name}.png`, fullPage: true })

  const verdict = page.locator('[data-lv]').filter({ hasText: /остават|Не стига/ }).first()
  const before = await verdict.textContent()
  await page.locator('#m-buy').fill('400')
  await expect(verdict).not.toHaveText(before)
})
