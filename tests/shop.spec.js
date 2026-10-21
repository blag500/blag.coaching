import { test, expect } from '@playwright/test'
import { signIn } from './harness.js'

/* Онлайн магазинът (/shop/).
 *
 * Каталогът и доставката идват от подменената база; shop-checkout е подменен
 * тук — тестът проверява какво праща страницата и как показва отговора, не
 * Stripe. Снимката отива в shots/. */

const PRODUCTS = [
  { id: 'whey', category: 'protein', name: 'Тест Whey', size_label: '1000 г', price_cents: 3349, image: '/shop/img/la-whey-1000.webp', description: 'Суроватъчен протеин.', flavors: ['Ванилия', 'Шоколад'], sort: 0, active: true },
  { id: 'crea', category: 'creatine', name: 'Тест Креатин', size_label: '500 г', price_cents: 1999, image: '/shop/img/6pak-creatine-500.webp', description: 'Креатин монохидрат.', flavors: [], sort: 1, active: true },
]
const DELIVERY = [
  { id: 'econt-office', label: 'Офис на Еконт', hint: '1–2 работни дни', price_cents: 349, free_from_cents: 6000, needs: 'office', sort: 0, active: true },
  { id: 'pickup', label: 'Взимане на място', hint: '', price_cents: 0, free_from_cents: null, needs: 'none', sort: 1, active: true },
]

async function open(page, path = '/shop/') {
  await signIn(page, { tables: { shop_products: PRODUCTS, shop_delivery: DELIVERY } })
  await page.goto(path)
}

test('каталогът показва продуктите и филтрира по категория', async ({ page }, info) => {
  await open(page)
  await expect(page.getByText('Тест Whey')).toBeVisible()
  await expect(page.getByText('33,49 €')).toBeVisible()
  await page.getByRole('link', { name: 'Креатин', exact: true }).click()
  await expect(page.getByText('Тест Креатин')).toBeVisible()
  await expect(page.getByText('Тест Whey')).toHaveCount(0)
  await page.screenshot({ path: `shots/shop-${info.project.name}.png`, fullPage: true })
})

test('вкусът е задължителен, количката смята сумата', async ({ page }) => {
  await open(page, '/shop/#/p/whey')
  const add = page.getByRole('button', { name: 'Избери вкус' })
  await expect(add).toBeDisabled()
  await page.getByText('Шоколад').click()
  await page.getByRole('button', { name: 'Повече Тест Whey' }).click()
  await page.getByRole('button', { name: 'Добави в количката' }).click()
  await page.goto('/shop/#/cart')
  await expect(page.getByText('1000 г · Шоколад')).toBeVisible()
  await expect(page.getByText('66,98 €').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Количка, 2 продукта' })).toBeVisible()
})

test('касата праща количката и показва номера, когато плащането не е пуснато', async ({ page }) => {
  let sent = null
  await open(page, '/shop/#/p/crea')
  // След обвивката: тя също отговаря на /functions/v1/, а последният маршрут печели.
  await page.route('**/functions/v1/shop-checkout', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ json: { number: 1001, order: 'o1', stripe: false } })
  })
  await page.getByRole('button', { name: 'Добави в количката' }).click()
  await page.goto('/shop/#/checkout')
  await page.getByLabel('Име и фамилия').fill('Иван Петров')
  await page.getByLabel('Имейл').fill('ivan@example.com')
  await page.getByLabel('Телефон').fill('0888123456')
  await page.getByText('Офис на Еконт').click()
  await page.getByLabel('Град и офис').fill('София, офис Младост 1')
  await expect(page.getByText('23,48 €').first()).toBeVisible()
  await page.getByRole('button', { name: /Плати 23,48 €/ }).click()
  await expect(page.getByRole('heading', { name: 'Поръчка № 1001' })).toBeVisible()
  expect(sent.items).toEqual([{ id: 'crea', flavor: null, qty: 1 }])
  expect(sent.delivery).toEqual({ id: 'econt-office', details: 'София, офис Младост 1' })
})
