import { test, expect } from '@playwright/test'
import { signIn } from './harness.js'

/* Личното табло (/tablo/).
 *
 * Данните са измислени, но по формата, която пишат scripts/tablo-sync.mjs и
 * tablo_business(): 28 дни работа с Claude, комити, една сесия, идеи, задачи.
 * Снимката отива в shots/ — начинът да се погледне таблото. */

const DAY = 24 * 60 * 60 * 1000
const day = (n) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(new Date(Date.now() - n * DAY))

function seed() {
  const daily = []
  for (let i = 0; i < 28; i++) {
    const d = day(i)
    // Тази седмица е двойно по-тежка от обичайната.
    const k = i < 7 ? 2 : 1
    daily.push({ day: d, key: 'tok.cache_read', value: 8_000_000 * k })
    daily.push({ day: d, key: 'tok.cache_write', value: 300_000 * k })
    daily.push({ day: d, key: 'tok.output', value: 40_000 * k })
    daily.push({ day: d, key: 'tok.input', value: 200 })
    daily.push({ day: d, key: 'claude.calls', value: 60 })
    daily.push({ day: d, key: 'claude.tools', value: 55 })
    daily.push({ day: d, key: 'git.app', value: i % 3 ? 4 : 0 })
    daily.push({ day: d, key: 'git.vault', value: 1 })
  }
  const now = new Date().toISOString()
  return {
    tablo_daily: daily,
    tablo_sessions: [{
      id: 's1', started_at: new Date(Date.now() - 3 * 3600e3).toISOString(), ended_at: now,
      project: 'blag coaching', title: 'Таблото и одитът', model: 'claude-opus-5-5',
      calls: 120, tool_calls: 140, tok_input: 300, tok_cache_read: 9_000_000, tok_cache_write: 400_000, tok_output: 60_000,
    }],
    tablo_sync: [{ source: 'computer', synced_at: now, note: '1 сесия' }],
    tablo_items: [
      { id: 'focus', kind: 'focus', title: 'Прати гласов текст', why: 'За гласа.', done: false, sort: 0, updated_at: now },
      { id: 'insight', kind: 'insight', title: 'Кухнята е тясното място.', done: false, sort: 0, updated_at: now },
      { id: 'w1', kind: 'weekly', title: 'Онлайн лекция от 14:00', dow: 4, done: false, sort: 0, updated_at: now },
      { id: 'i1', kind: 'idea', title: 'Сертификатът от J3U', area: 'Blag', status: 'doing', why: 'Отключва Blag.', done: false, sort: 0, updated_at: now },
      { id: 'i2', kind: 'idea', title: 'Тениската', area: 'Blag', status: 'park', done: false, sort: 0, updated_at: now },
      { id: 't1', kind: 'you', title: 'Отпечатай картата', area: 'Чийт Код', done: false, sort: 1, updated_at: now },
      { id: 't2', kind: 'decide', title: 'Сплаш на светлата тема', done: false, sort: 1, updated_at: now },
      { id: 'f1', kind: 'finding', title: 'Бутонът се крие под лентата', area: 'Чийт Код', severity: 'high', state: 'open', done: false, sort: 0, updated_at: now },
      { id: 'f2', kind: 'finding', title: 'Стар файл в корена', area: 'Repo', severity: 'low', state: 'proposal', done: false, sort: 0, updated_at: now },
      { id: 'f3', kind: 'finding', title: 'Шрифтът е оправен', area: 'Дизайн', severity: 'low', state: 'fixed', done: false, sort: 0, updated_at: now },
    ],
  }
}

const BUSINESS = {
  clients: 14,
  orders_total: 2,
  orders: [{ day: day(2), n: 1, eur: 6.3 }],
  active_loggers: [{ day: day(0), n: 2 }, { day: day(1), n: 2 }],
  new_clients: [],
  errors: [{ day: day(1), n: 3 }],
  top_errors: [{ message: 'TypeError: x is undefined', screen: 'nutrition', n: 3, last: new Date().toISOString() }],
  bot: [{ day: day(3), calls: 2, tokens: 1200 }],
}

test('„Сега" показва стъпката, чакащото и бизнеса — без работата на Claude', async ({ page }, info) => {
  await signIn(page, { tables: seed(), rpc: { tablo_business: BUSINESS } })
  await page.goto('/tablo/')

  await expect(page.getByRole('heading', { name: 'Сега' })).toBeVisible()
  await expect(page.getByText('Прати гласов текст')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Отпечатай картата/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Сплаш на светлата тема/ })).toBeVisible()
  await expect(page.getByText('TypeError: x is undefined')).toBeVisible()
  await expect(page.getByText(/предложение от одита/)).toBeVisible()
  // Сесиите и токените са в „Работа", не тук.
  await expect(page.getByText('Таблото и одитът')).toHaveCount(0)

  const box = page.getByRole('checkbox', { name: /Отпечатай картата/ })
  await box.check()
  await expect(box).toBeChecked()

  await page.screenshot({ path: `shots/tablo-${info.project.name}.png`, fullPage: true })
})

test('„План" отваря само „В работа" и сменя състоянието на идея', async ({ page }, info) => {
  await signIn(page, { tables: seed(), rpc: { tablo_business: BUSINESS } })
  await page.goto('/tablo/#plan')
  await expect(page.getByRole('heading', { name: 'План' })).toBeVisible()
  await expect(page.getByText('Онлайн лекция от 14:00').first()).toBeVisible()
  await expect(page.getByText('Сертификатът от J3U')).toBeVisible()
  // „Отложено" е сгънато, докато не се натисне.
  await expect(page.getByText('Тениската')).toBeHidden()
  await page.getByRole('heading', { name: 'Отложено' }).click()
  await page.getByRole('combobox', { name: 'Състояние на „Тениската“' }).selectOption('think')
  await expect(page.getByRole('heading', { name: 'Обмисля се' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Нова идея' }).fill('Подкаст')
  await page.getByRole('button', { name: 'Добави' }).click()
  await page.getByRole('heading', { name: 'Искра' }).click()
  await expect(page.getByText('Подкаст')).toBeVisible()

  await page.screenshot({ path: `shots/tablo-plan-${info.project.name}.png`, fullPage: true })
})

test('„Одит" показва предложенията и отвореното, поправеното е сгънато', async ({ page }) => {
  await signIn(page, { tables: seed(), rpc: { tablo_business: BUSINESS } })
  await page.goto('/tablo/#audit')
  await expect(page.getByRole('heading', { name: 'Отворени' })).toBeVisible()
  await expect(page.getByText('Бутонът се крие под лентата')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Чакат твоето „да“' })).toBeVisible()
  await expect(page.getByText('Шрифтът е оправен')).toBeHidden()
})

test('„Работа" държи сесиите и тежестта', async ({ page }) => {
  await signIn(page, { tables: seed(), rpc: { tablo_business: BUSINESS } })
  await page.goto('/tablo/#work')
  await expect(page.getByText('Таблото и одитът')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Откъде идва тежестта' })).toBeVisible()
})

test('без собственик таблото не показва нищо', async ({ page }) => {
  await signIn(page, { tables: seed(), rpc: { is_tablo_owner: false } })
  await page.goto('/tablo/')
  await expect(page.getByText('Нямаш достъп до това табло.')).toBeVisible()
  await expect(page.getByText('Прати гласов текст')).toHaveCount(0)
})
