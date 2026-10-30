import { test, expect } from '@playwright/test'

/* Светът „Благ“ (/svyat/, Р20). Лекият изглед носи същия текст и същата
 * карта — тестовете на съдържанието вървят там (без зависимост от WebGL);
 * 3D изгледът се проверява, че тръгва и че менюто движи скрола. Снимките
 * отиват в shots/. */

test('лекият изглед: адресът отваря спирката, менюто скача, картата праща', async ({ page }, info) => {
  let sent = null
  await page.route('**/functions/v1/svyat-contact', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ json: { ok: true } })
  })
  await page.goto('/svyat/?lite=1#magazin')
  await expect(page.getByRole('heading', { name: 'Здраве и Сила' })).toBeInViewport()
  await expect(page.getByText('Докосни неона.')).toHaveCount(0)
  await page.screenshot({ path: `shots/svyat-lite-${info.project.name}.png` })

  await page.getByRole('navigation', { name: 'Светът' }).getByRole('button', { name: 'Контакт' }).click()
  await expect(page.getByRole('heading', { name: 'Пиши ми.' })).toBeInViewport()
  await page.getByRole('button', { name: /Прати с неона/ }).click()
  await expect(page.getByText('Напиши поне няколко думи.')).toBeVisible()
  await expect(page.getByText('Имейлът изглежда непълен.')).toBeVisible()
  expect(sent).toBeNull()

  await page.getByLabel('Какво ти трябва?').fill('Искам програма за маса.')
  await page.getByRole('textbox', { name: 'Име', exact: true }).fill('Иван')
  await page.getByRole('textbox', { name: 'Имейл' }).fill('ivan@example.com')
  await page.getByRole('button', { name: /Прати с неона/ }).click()
  await expect(page.getByText('Получено. Ще ти отговоря на имейла.')).toBeVisible()
  expect(sent).toEqual({ body: 'Искам програма за маса.', name: 'Иван', email: 'ivan@example.com', website: '' })
})

test('лекият изглед: залата има своя спирка и води към приложението', async ({ page }) => {
  await page.goto('/svyat/?lite=1#zala')
  await expect(page.getByRole('heading', { name: 'Залата' })).toBeInViewport()
  await expect(page.locator('#zala').getByRole('link', { name: /Приложението/ })).toHaveAttribute('href', '/')
  await expect(page.getByText('Натисни щангата.')).toHaveCount(0)
})

test('картата казва грешката от сървъра', async ({ page }) => {
  await page.route('**/functions/v1/svyat-contact', (route) => route.fulfill({ status: 429, json: { error: 'Много писма за кратко. Опитай пак след час.' } }))
  await page.goto('/svyat/?lite=1#kontakt')
  await page.getByLabel('Какво ти трябва?').fill('Здравей, въпрос.')
  await page.getByRole('textbox', { name: 'Име', exact: true }).fill('Иван')
  await page.getByRole('textbox', { name: 'Имейл' }).fill('ivan@example.com')
  await page.getByRole('button', { name: /Прати с неона/ }).click()
  await expect(page.getByRole('alert')).toHaveText('Много писма за кратко. Опитай пак след час.')
})

test('3D: зарежда се, зареждането изчезва, менюто движи камерата', async ({ page }, info) => {
  test.setTimeout(120000)  // без видеокарта залата се компилира бавно; паралелно — още по-бавно
  await page.goto('/svyat/')
  const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))
  test.skip(!webgl, 'няма WebGL в този браузър — лекият изглед е покрит отгоре')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.loader.gone')).toHaveCount(1, { timeout: 20000 })
  // без спирка в адреса излиза изборът на проект; „Към целия свят“ го маха
  await page.getByRole('dialog', { name: 'Избери проект' }).getByRole('button', { name: /Към целия свят/ }).click()
  await expect(page.getByRole('dialog', { name: 'Избери проект' })).toHaveCount(0)
  await page.waitForTimeout(3500)                                   // неонът се пали
  await page.screenshot({ path: `shots/svyat-3d-${info.project.name}.png` })
  await page.getByRole('navigation', { name: 'Светът' }).getByRole('button', { name: 'Контакт' }).click()
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#kontakt')
  await expect(page.getByRole('heading', { name: 'Пиши ми.' })).toBeInViewport({ timeout: 5000 })
  // окото скрива текста и менюто, второто натискане ги връща
  await page.getByRole('button', { name: 'Скрий текста' }).click()
  await expect(page.locator('body.clean')).toHaveCount(1)
  await expect(page.locator('.card')).toHaveCSS('opacity', '0')
  await page.getByRole('button', { name: 'Покажи текста' }).click()
  await expect(page.locator('body.clean')).toHaveCount(0)
})
