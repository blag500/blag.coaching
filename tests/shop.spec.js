import { test, expect } from '@playwright/test'
import { signIn } from './harness.js'

/* Онлайн магазинът (/shop/).
 *
 * Каталогът и доставката идват от подменената база; shop-checkout е подменен
 * тук — тестът проверява какво праща страницата и как показва отговора, не
 * Stripe. Снимката отива в shots/. */

const P = (o) => ({ description: '', flavors: [], goals: [], tags: [], servings: 1, serving_unit: 'доза', size_group: null, active: true, ...o })
const PRODUCTS = [
  P({ id: 'whey', category: 'protein', name: 'Тест Whey', size_label: '1000 г', price_cents: 3349, image: '/shop/img/la-whey-1000.webp', flavors: ['Ванилия', 'Шоколад'], goals: ['strength', 'recovery'], servings: 33, sort: 0 }),
  P({ id: 'crea-300', category: 'creatine', name: 'Тест Креатин', size_label: '300 г · 50 дози', price_cents: 1349, image: '/shop/img/6pak-creatine-300.webp', goals: ['strength'], servings: 50, size_group: 'crea', sort: 1 }),
  P({ id: 'crea-500', category: 'creatine', name: 'Тест Креатин', size_label: '500 г · 83 дози', price_cents: 1999, image: '/shop/img/6pak-creatine-500.webp', goals: ['strength'], servings: 83, size_group: 'crea', sort: 2 }),
  P({ id: 'd3', category: 'vitamins', name: 'Тест D3', size_label: '120 капсули', price_cents: 799, image: '/shop/img/nutriversum-d3k2-120.webp', goals: ['health'], servings: 120, sort: 3 }),
  P({ id: 'gris', category: 'pantry', name: 'Тест Оризов грис', size_label: '500 г', net_g: 500, price_cents: 199, image: '/shop/img/izzi-rice-semolina-500.webp', goals: ['mealprep'], servings: null, sort: 4,
    per100: { kcal: 357, protein: 6.5, carbs: 79, fat: 0.6, source: 'Ориентировъчно.' } }),
]
const DELIVERY = [
  { id: 'econt-office', label: 'Офис на Еконт', hint: '', price_cents: 349, free_from_cents: 6000, needs: 'office', sort: 0, active: true },
  { id: 'pickup', label: 'Взимане на място', hint: '', price_cents: 0, free_from_cents: null, needs: 'none', sort: 1, active: true },
]
const OFFICES = [
  { c: '1', n: 'Варна Младост', t: 'Варна', a: 'Варна кв. Младост', m: 0 },
  { c: '2', n: 'София Младост 1А', t: 'София', a: 'София бул. Ал. Малинов 27', m: 1 },
]

const DEALS = [{ product_id: 'd3', deal_price_cents: 599, was_cents: 799, starts_at: '2026-01-01T00:00:00Z', ends_at: '2099-01-01T00:00:00Z', sort: 1 }]

async function open(page, path = '/shop/#/c/all', deals = []) {
  await signIn(page, { tables: { shop_products: PRODUCTS, shop_delivery: DELIVERY, shop_deals: deals } })
  await page.route('**/shop/econt-offices.json', (route) => route.fulfill({ json: OFFICES }))
  await page.goto(path)
}

test('каталогът: целта филтрира, размерите са една карта, адресът пази избора', async ({ page }, info) => {
  await open(page)
  await expect(page.getByText('4 продукта')).toBeVisible()          // двата креатина — една карта
  await expect(page.getByText('2 размера')).toBeVisible()
  await expect(page.getByText('1,01 € / доза')).toBeVisible()       // 33,49 / 33
  await page.getByRole('button', { name: /Здраве всеки ден/ }).click()
  await expect(page.getByText('1 продукт', { exact: true })).toBeVisible()
  await expect(page.getByText('Тест Whey')).toHaveCount(0)
  expect(page.url()).toContain('goal=health')
  await page.getByRole('button', { name: 'Махни Здраве всеки ден' }).click()
  await expect(page.getByText('4 продукта')).toBeVisible()
  await page.screenshot({ path: `shots/shop-${info.project.name}.png`, fullPage: true })
})

test('филтрите показват броя и бутонът казва колко ще останат', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: /^Филтри/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Филтри' })
  await expect(dialog.getByText('Сила и маса')).toBeVisible()
  await dialog.getByLabel('Креатин').check()
  await dialog.getByRole('button', { name: 'Покажи 1 продукт' }).click()
  await expect(page.getByRole('button', { name: 'Махни Креатин' })).toBeVisible()
})

test('бързо добавяне: вкусът е задължителен, количката смята и показва прага', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Добави Тест Whey в количката' }).click()
  const sheet = page.getByRole('dialog', { name: 'Тест Whey' })
  await expect(sheet.getByRole('button', { name: 'Избери вкус' })).toBeDisabled()
  await sheet.getByRole('button', { name: 'Шоколад' }).click()
  await sheet.getByRole('button', { name: /Добави · 33,49 €/ }).click()
  await expect(page.getByRole('status').getByText('Добавено в количката')).toBeVisible()
  await page.goto('/shop/#/cart')
  await expect(page.getByText('1000 г · Шоколад')).toBeVisible()
  await expect(page.getByText(/до безплатна доставка/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Количка, 1 продукта' })).toBeVisible()
})

test('продуктът: размерите са бутони и сменят цената', async ({ page }) => {
  await open(page, '/shop/#/p/crea-300')
  await expect(page.getByText('13,49 €').first()).toBeVisible()
  await page.getByRole('link', { name: /500 г · 19,99 €/ }).click()
  await expect(page.getByRole('button', { name: /Добави · 19,99 €/ })).toBeVisible()
})

test('касата: конкретни грешки, офис от списък, праща количката', async ({ page }) => {
  let sent = null
  await open(page, '/shop/#/p/d3')
  await page.route('**/functions/v1/shop-checkout', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ json: { number: 1001, order: 'o1', stripe: false } })
  })
  await page.getByRole('button', { name: /Добави · 7,99 €/ }).click()
  await page.goto('/shop/#/checkout')
  await page.getByRole('button', { name: /^Плати/ }).click()
  await expect(page.getByText('Напиши име и фамилия — куриерът ги иска.')).toBeVisible()
  await expect(page.getByText('Избери как да ти стигне.')).toBeVisible()

  await page.getByLabel('Име и фамилия').fill('Иван Петров')
  await page.getByLabel('Имейл').fill('ivan@example.com')
  await page.getByLabel('Телефон').fill('0888123456')
  await page.getByText('Офис на Еконт').click()
  await page.getByPlaceholder(/Град, квартал/).fill('младост')
  const first = page.getByRole('option').first()
  await expect(first).toContainText('София')                     // София преди Варна
  await first.click()
  await expect(page.getByText(/София — София Младост 1А \(автомат\)/)).toBeVisible()
  await expect(page.getByText('11,48 €').first()).toBeVisible()  // 7,99 + 3,49
  await page.getByRole('button', { name: /Плати 11,48 €/ }).click()
  await expect(page.getByRole('heading', { name: 'Поръчка № 1001' })).toBeVisible()
  expect(sent.items).toEqual([{ id: 'd3', flavor: null, qty: 1 }])
  expect(sent.delivery.id).toBe('econt-office')
  expect(sent.delivery.details).toContain('[2]')
})

test('храната: макросите на 100 г и цената на кг', async ({ page }) => {
  await open(page)
  await expect(page.getByText('3,98 € / кг')).toBeVisible()             // 1,99 € за 500 г
  await page.getByText('Тест Оризов грис').click()
  const macros = page.getByRole('region', { name: 'Хранителни стойности на 100 г' })
  await expect(macros.getByText('357')).toBeVisible()
  await expect(macros.getByText('6,5')).toBeVisible()
  await expect(page.getByText('Ориентировъчно — точните са на опаковката.')).toBeVisible()
})

test('началото: промоцията с таймер и стара цена, видовете водят към своя страница', async ({ page }) => {
  await open(page, '/shop/', DEALS)
  await expect(page.getByRole('heading', { name: 'Промоции на седмицата' })).toBeVisible()
  await expect(page.getByRole('timer')).toBeVisible()
  const deal = page.locator('li', { hasText: 'Тест D3' }).first()
  await expect(deal.getByText('5,99 €')).toBeVisible()
  await expect(deal.getByText('7,99 €')).toBeVisible()              // старата цена
  await expect(deal.getByText('−25 %')).toBeVisible()
  await page.getByRole('link', { name: /Креатин/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Креатин' })).toBeVisible()
  await expect(page.getByText('1 продукт', { exact: true })).toBeVisible()  // двата размера — една карта
  expect(page.url()).toContain('#/c/creatine')
})
