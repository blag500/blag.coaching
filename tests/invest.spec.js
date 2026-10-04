import { test, expect } from '@playwright/test'
import { signIn } from './harness.js'

/* Таблото за инвестициите (/invest/).
 *
 * Данните са измислени, но по формата, която invest-sync пише: часови
 * снимки за месец, два депозита, три дивидента. Снимката на екрана отива в
 * shots/ — тя е начинът да се погледне таблото, не твърдение. */

const HOUR = 60 * 60 * 1000

const POSITIONS = [
  { ticker: 'VUSAl_EQ', name: 'Vanguard S&P 500 UCITS ETF', currency: 'GBP', qty: 52.3, avg: 78.1, price: 91.4, value: 5620.4, cost: 4810.2, pnl: 810.2, fx: -42.1, opened: '2025-03-02T10:00:00Z' },
  { ticker: 'AAPL_US_EQ', name: 'Apple Inc.', currency: 'USD', qty: 8.5, avg: 182.4, price: 231.6, value: 1690.3, cost: 1420.0, pnl: 270.3, fx: 12.4, opened: '2025-05-12T10:00:00Z' },
  { ticker: 'SAPd_EQ', name: 'SAP SE', currency: 'EUR', qty: 4, avg: 251.0, price: 238.2, value: 952.8, cost: 1004.0, pnl: -51.2, fx: 0, opened: '2025-09-01T10:00:00Z' },
  { ticker: 'MSFT_US_EQ', name: 'Microsoft Corporation', currency: 'USD', qty: 2.1, avg: 402.0, price: 455.1, value: 820.6, cost: 724.9, pnl: 95.7, fx: 4.0, opened: '2025-06-20T10:00:00Z' },
]

function seed() {
  const now = Date.now()
  const snaps = []
  for (let i = 0; i < 24 * 30; i++) {
    const t = now - i * HOUR
    // Депозитът преди двайсет дни вдига стойността с три хиляди.
    const drift = 6200 + (i < 20 * 24 ? 3000 : 0) + (24 * 30 - i) * 1.4 + Math.sin(i / 9) * 60
    snaps.push({
      id: 10000 - i,
      taken_at: new Date(t).toISOString(),
      currency: 'EUR',
      total_value: Math.round((drift + 310) * 100) / 100,
      current_value: drift,
      total_cost: 7959.1,
      unrealized: 1125.0,
      realized: 214.6,
      cash_free: 310.0,
      cash_in_pies: 0,
      cash_reserved: 0,
      positions: i === 0 ? POSITIONS : null,
    })
  }
  const daily = snaps.filter((_, i) => i % 24 === 0).reverse()
    .map((s) => ({ day: s.taken_at.slice(0, 10), taken_at: s.taken_at, total_value: s.total_value }))
  return {
    invest_snapshots: snaps,
    invest_daily: daily,
    invest_transactions: [
      { reference: 't1', at: new Date(now - 300 * 24 * HOUR).toISOString(), type: 'DEPOSIT', amount: 5000, currency: 'EUR' },
      { reference: 't2', at: new Date(now - 20 * 24 * HOUR).toISOString(), type: 'DEPOSIT', amount: 3000, currency: 'EUR' },
    ],
    invest_dividends: [
      { reference: 'd1', paid_on: new Date(now - 10 * 24 * HOUR).toISOString(), ticker: 'AAPL_US_EQ', name: 'Apple Inc.', amount: 1.84, currency: 'EUR' },
      { reference: 'd2', paid_on: new Date(now - 40 * 24 * HOUR).toISOString(), ticker: 'MSFT_US_EQ', name: 'Microsoft Corporation', amount: 1.52, currency: 'EUR' },
      { reference: 'd3', paid_on: new Date(now - 100 * 24 * HOUR).toISOString(), ticker: 'AAPL_US_EQ', name: 'Apple Inc.', amount: 1.80, currency: 'EUR' },
    ],
    invest_sync_state: [
      { kind: 'dividends', done: true },
      { kind: 'transactions', done: true },
    ],
  }
}

test('таблото показва сметката, позициите и дивидентите', async ({ page }, info) => {
  await signIn(page, { theme: 'glass', tables: seed() })
  await page.goto('/invest/')

  await expect(page.getByRole('heading', { name: 'ИНВЕСТИЦИИ' })).toBeVisible()
  await expect(page.getByText('Стойност на сметката')).toBeVisible()
  await expect(page.getByRole('button', { name: /Vanguard S&P 500/ })).toBeVisible()
  // Внесено нето: 5000 + 3000.
  await expect(page.getByText(/8\s?000,00\s€/).first()).toBeVisible()

  await page.getByRole('button', { name: /Apple/ }).click()
  await expect(page.getByText('Средна цена')).toBeVisible()

  await page.getByRole('tab', { name: '3М' }).click()
  await expect(page.getByRole('tab', { name: '3М' })).toHaveAttribute('aria-selected', 'true')

  await page.screenshot({ path: `shots/invest-${info.project.name}.png`, fullPage: true })
})

test('без собственик таблото не показва нищо', async ({ page }) => {
  await signIn(page, { theme: 'glass', tables: seed() })
  await page.route('**/rest/v1/rpc/is_invest_owner', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: 'false',
    headers: { 'access-control-allow-origin': '*' },
  }))
  await page.goto('/invest/')
  await expect(page.getByText('Нямаш достъп до това табло.')).toBeVisible()
  await expect(page.getByText('Vanguard')).toHaveCount(0)
})
