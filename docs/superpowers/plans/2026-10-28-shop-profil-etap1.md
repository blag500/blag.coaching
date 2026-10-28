# Профилът в магазина — етап 1: план за изпълнение

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** купувачите в `/shop` имат профил:
- вход с телефон и код по SMS;
- запазена карта в Stripe;
- поръчват само с профил;
- виждат „Моите покупки“;
- могат да изключат профила си.

**Architecture:**
- Supabase Auth в същия проект, вход с телефон. Регистрация от магазина носи `app: 'shop'`, а `handle_new_user` я насочва към нова таблица `shop_customers`, не към `profiles`.
- Магазинът има собствен клиент на Supabase със свой ключ за сесията (`zs-auth`), за да не се смесва със сесията на приложението на същия домейн.
- Картата, имейлът и изтриването минават през нова функция `shop-account`. `shop-checkout` започва да иска вход.

**Tech Stack:** React 18 + Vite, Supabase (Postgres, Auth с телефон и Twilio, Edge Functions на Deno), Stripe Checkout (режим `setup` и `payment`), Resend, Playwright.

**Проект:** `docs/superpowers/specs/2026-10-28-edin-profil-magazin-obekt-design.md` — части 1 и 4. Вратата и изходът (части 2–3) са етап 2, таблото е етап 3; те имат отделни планове.

## Global Constraints

- Целият текст в интерфейса е на български.
- Видът е на магазина:
  - класовете от `src/shop/Shop.module.css`;
  - токените от `src/shop/shop.css`;
  - никакви цветове на ръка;
  - без емоджита и без рекламни лозунги.
- `src/lib/supabase.js` **не се пипа.** Неговият ключ за сесията остава по подразбиране (коментарът там казва защо).
- Купувач от `/shop` **никога** не получава ред в `profiles` (Р9/Р10).
- Stripe: докато `SHOP_LIVE` не е `'1'`, се приема само `sk_test_…`, както в `shop-checkout`.
- Без браузърни диалози (`alert` / `confirm`). Потвърждението е бутон на страницата.
- Миграциите се пускат с `supabase db query --linked -f <файл>` (`supabase db push` не работи — 44 стари миграции). Следващият номер е **143**.
- Тестовете за базата вървят в `begin … rollback` срещу свързания проект. Нищо не остава.
- Комит след всяка задача, после `git push` към `main` (правилото на проекта). Краят на всяко съобщение:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01EQMiKfBy3otTZWt7iKtyxo
  ```

## Преди Task 1 — ръчно, от Николай

Кодът може да се пише и тества без тях. Входът с истински SMS тръгва чак след тях.
1. Акаунт в Twilio, номер или Messaging Service, който праща до България.
2. Supabase → Authentication → Providers → **Phone**:
   - включен;
   - доставчик Twilio, със SID, токен и Messaging Service SID;
   - „Enable phone confirmations“ включено.
3. Тайни за функциите. `STRIPE_SHOP_SECRET_KEY` и `RESEND_API_KEY` вече има. Нови тайни няма.

## Файлове

| Файл | Отговорност |
|---|---|
| `supabase/migrations/143_shop_customers.sql` | `shop_customers`, `shop_email_links`, `shop_orders.customer_id`, разклонението в `handle_new_user` |
| `supabase/migrations/144_shop_anonymise.sql` | нощно изтриване на изключени профили след 90 дни |
| `tests/sql/143_shop_customers.test.sql` | регистрация от магазина ≠ клиент на коучинга |
| `src/shop/db.js` | клиент на Supabase само за магазина (`storageKey: 'zs-auth'`) |
| `src/shop/phone.js` | `normalisePhone(raw) → '+359…' \| null` |
| `src/shop/session.js` | `useShopSession()` — сесията и редът от `shop_customers` |
| `src/shop/Login.jsx` | вход с телефон и код |
| `src/shop/Profile.jsx` | профилът, картата, имейлът, покупките, изтриването, линкът за имейла |
| `src/shop/Privacy.jsx` | чернова на политиката (сроковете от проекта) |
| `src/shop/ShopApp.jsx` | новите адреси, бутон „Профил“, сесията към касата |
| `src/shop/Checkout.jsx` | касата без полета за контакт; иска профил |
| `supabase/functions/shop-account/logic.ts` | чисти помощници (имейл, токен, sha256, html) |
| `supabase/functions/shop-account/checks.ts` | проверки на помощниците |
| `supabase/functions/shop-account/index.ts` | `setup`, `setup-confirm`, `link-email`, `link-confirm`, `delete` |
| `supabase/functions/shop-checkout/index.ts` | иска вход, пише `customer_id`, ползва клиента в Stripe |
| `tests/shop-phone.spec.js` | `normalisePhone` |
| `tests/shop-helpers.js` | `shopIn(page, customer, tables)`, `CUSTOMER` — сесия на купувач в тестовете |
| `tests/shop-account.spec.js` | вход, профил, карта, покупки, изтриване, линк |
| `tests/shop.spec.js` | тестът на касата — с профил |
| `docs/DECISIONS.md`, `CLAUDE.md` | Р19 и абзацът за магазина |

---

### Task 1: Базата — купувачите отделно от клиентите

**Files:**
- Create: `supabase/migrations/143_shop_customers.sql`
- Create: `tests/sql/143_shop_customers.test.sql`

**Interfaces:**
- Produces:
  - таблица `public.shop_customers(id uuid pk → auth.users, phone text, name text, email text, email_verified_at timestamptz, stripe_customer text, has_card bool, created_at, deactivated_at)`;
  - купувачът чете своя ред и може да сменя само `name`;
  - таблица `public.shop_email_links(token_hash pk, customer_id, email, expires_at, used_at)`, само за service role;
  - колона `public.shop_orders.customer_id uuid → shop_customers`; купувачът чете своите поръчки.

- [ ] **Step 1: Напиши провалящия се тест**

`tests/sql/143_shop_customers.test.sql`:

```sql
-- Регистрация от /shop (app: 'shop') прави купувач, не клиент на коучинга;
-- регистрация от приложението работи както досега. Всичко се връща назад.
begin;

insert into auth.users (id, instance_id, aud, role, phone, raw_user_meta_data, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', '359888000001', '{"app":"shop"}', now(), now());

do $$ begin
  if not exists (select 1 from public.shop_customers
                  where id = '11111111-1111-4111-8111-111111111111' and phone = '359888000001') then
    raise exception 'FAIL: няма ред в shop_customers';
  end if;
  if exists (select 1 from public.profiles where id = '11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL: купувачът стана клиент на коучинга';
  end if;
end $$;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'shop-test-143@example.com', '{}', now(), now());

do $$ begin
  if not exists (select 1 from public.profiles where id = '22222222-2222-4222-8222-222222222222') then
    raise exception 'FAIL: регистрацията в приложението не прави профил';
  end if;
  if exists (select 1 from public.shop_customers where id = '22222222-2222-4222-8222-222222222222') then
    raise exception 'FAIL: клиент на приложението стана купувач';
  end if;
end $$;

select 'OK 143' as result;
rollback;
```

- [ ] **Step 2: Пусни го — трябва да се провали**

Run: `supabase db query --linked -f tests/sql/143_shop_customers.test.sql`
Expected: грешка `relation "public.shop_customers" does not exist`.

- [ ] **Step 3: Напиши миграцията**

`supabase/migrations/143_shop_customers.sql`:

```sql
-- 143_shop_customers.sql — профилите на купувачите в /shop и в обекта (Р19), 28.10.2026.
--
-- Вход с телефон (Supabase Auth + Twilio). Регистрацията от магазина носи
-- user_metadata.app = 'shop' и handle_new_user я пише тук, не в profiles —
-- купувачите не са клиенти на коучинга (капанът от Р9/Р10). Картата е в Stripe;
-- тук стои само номерът на клиента там и дали има запазена карта.

create table if not exists public.shop_customers (
  id                uuid primary key references auth.users on delete cascade,
  phone             text not null,
  name              text not null default '',
  email             text,
  email_verified_at timestamptz,
  stripe_customer   text,
  has_card          boolean not null default false,
  created_at        timestamptz not null default now(),
  deactivated_at    timestamptz
);
alter table public.shop_customers enable row level security;

drop policy if exists "customer reads own row" on public.shop_customers;
create policy "customer reads own row" on public.shop_customers
  for select using (id = auth.uid() or public.is_tablo_owner());

-- Купувачът сменя само името си; картата и имейлът минават през shop-account.
drop policy if exists "customer renames self" on public.shop_customers;
create policy "customer renames self" on public.shop_customers
  for update using (id = auth.uid() and deactivated_at is null) with check (id = auth.uid());
revoke insert, update, delete on public.shop_customers from anon, authenticated;
grant select on public.shop_customers to authenticated;
grant update (name) on public.shop_customers to authenticated;

-- Линкът за потвърждение на имейла — пази се отпечатъкът, не линкът (както 132).
create table if not exists public.shop_email_links (
  token_hash  text primary key,
  customer_id uuid not null references public.shop_customers on delete cascade,
  email       text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz
);
alter table public.shop_email_links enable row level security;   -- без политики: само service role

-- Поръчките онлайн — към купувача.
alter table public.shop_orders add column if not exists customer_id uuid
  references public.shop_customers on delete set null;
create index if not exists shop_orders_customer_idx on public.shop_orders (customer_id);
drop policy if exists "customer reads own orders" on public.shop_orders;
create policy "customer reads own orders" on public.shop_orders
  for select using (customer_id = auth.uid());

-- handle_new_user: разклонение за магазина; останалото е 085 дума по дума.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key text;
begin
  if coalesce(new.raw_user_meta_data->>'app', '') = 'shop' then
    insert into public.shop_customers (id, phone)
    values (new.id, coalesce(new.phone, ''))
    on conflict (id) do nothing;
    return new;
  end if;

  key := public.normalise_email(new.email);

  if exists (select 1 from public.disposable_domains
              where domain = split_part(key, '@', 2)) then
    raise exception 'blag_disposable_email';
  end if;

  if exists (select 1 from public.profiles where email_key = key) then
    raise exception 'blag_duplicate_account';
  end if;

  insert into public.profiles (id, email, email_key, approved, onboarding_done)
  values (new.id, new.email, key, true, false)
  on conflict (id) do nothing;

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
```

- [ ] **Step 4: Пусни миграцията и теста**

Run: `supabase db query --linked -f supabase/migrations/143_shop_customers.sql`
Expected: без грешка.

Run: `supabase db query --linked -f tests/sql/143_shop_customers.test.sql`
Expected: ред `OK 143`.

- [ ] **Step 5: Комит**

```bash
git add supabase/migrations/143_shop_customers.sql tests/sql/143_shop_customers.test.sql
git commit -m "Магазин: купувачите в shop_customers — регистрацията с телефон не прави клиент на коучинга"
git push
```

---

### Task 2: Телефонът — един формат

**Files:**
- Create: `src/shop/phone.js`
- Test: `tests/shop-phone.spec.js`

**Interfaces:**
- Produces: `normalisePhone(raw: string) → string | null`. Връща `'+359XXXXXXXXX'` или `null`.

- [ ] **Step 1: Напиши провалящия се тест**

`tests/shop-phone.spec.js`:

```js
import { test, expect } from '@playwright/test'
import { normalisePhone } from '../src/shop/phone.js'

/* Номерът, който хората пишат, към формата, който SMS доставчикът иска. */
test('телефонът: всички обичайни записи стават +359…', () => {
  expect(normalisePhone('0888 123 456')).toBe('+359888123456')
  expect(normalisePhone('+359 888 123 456')).toBe('+359888123456')
  expect(normalisePhone('00359888123456')).toBe('+359888123456')
  expect(normalisePhone('359888123456')).toBe('+359888123456')
  expect(normalisePhone('(0888) 12-34-56')).toBe('+359888123456')
  expect(normalisePhone('+44 7700 900123')).toBe('+447700900123')
})

test('телефонът: непълното е null', () => {
  expect(normalisePhone('')).toBeNull()
  expect(normalisePhone('0888')).toBeNull()
  expect(normalisePhone('888123456')).toBeNull()
  expect(normalisePhone('абв')).toBeNull()
})
```

- [ ] **Step 2: Пусни го — трябва да се провали**

Run: `npx playwright test shop-phone --project=chromium`
Expected: FAIL — `Cannot find module '../src/shop/phone.js'`.

- [ ] **Step 3: Напиши функцията**

`src/shop/phone.js`:

```js
/* Телефонът, както го пише човек → E.164 (+359…), както го иска Twilio.
 * Българските 0… стават +359…; чужд номер се приема само с + или 00 отпред. */
export function normalisePhone(raw) {
  const s = String(raw ?? '').replace(/[^\d+]/g, '')
  let d = s.replace(/^\+/, '')
  if (s.startsWith('00')) d = s.slice(2)
  if (/^0\d{8,9}$/.test(d)) d = '359' + d.slice(1)
  if (/^359\d{8,9}$/.test(d)) return '+' + d
  if ((s.startsWith('+') || s.startsWith('00')) && /^\d{8,15}$/.test(d)) return '+' + d
  return null
}
```

- [ ] **Step 4: Пусни го — трябва да мине**

Run: `npx playwright test shop-phone --project=chromium`
Expected: 2 passed.

- [ ] **Step 5: Комит**

```bash
git add src/shop/phone.js tests/shop-phone.spec.js
git commit -m "Магазин: телефонът в един формат (+359…)"
git push
```

---

### Task 3: Отделна сесия за магазина

**Files:**
- Create: `src/shop/db.js`
- Create: `src/shop/session.js`
- Modify: `src/shop/ShopApp.jsx` — импортът на `supabase` (ред 2)
- Modify: `src/shop/Checkout.jsx` — импортът на `supabase` (ред 2)
- Create: `tests/shop-helpers.js`
- Test: `tests/shop-account.spec.js` (нов файл, първи тест)

**Interfaces:**
- Produces:
  - `db`: клиент на Supabase само за магазина;
  - `useShopSession() → { session: object|null|undefined, customer: object|null, reload(): Promise<void>, ready: boolean }`. `undefined` значи, че още се зарежда. `ready` е вярно при телефон, карта и неизключен профил.

- [ ] **Step 1: Напиши провалящия се тест**

`tests/shop-helpers.js` (помощникът е отделно — Playwright не бива да внася
тестов файл в друг, иначе тестовете му се регистрират двойно):

```js
import { signIn } from './harness.js'

/* signIn подменя мрежата и слага сесия на ПРИЛОЖЕНИЕТО; shopIn слага и сесия
 * на МАГАЗИНА (ключ zs-auth). customer = null — купувачът не е влязъл. */
export const CUSTOMER = {
  id: '00000000-0000-4000-8000-0000000000c1', phone: '+359888123456', name: 'Иван Петров',
  email: 'ivan@example.com', email_verified_at: '2026-10-28T10:00:00Z', stripe_customer: 'cus_test',
  has_card: true, created_at: '2026-10-28T10:00:00Z', deactivated_at: null,
}
const PRODUCTS = [{ id: 'd3', category: 'vitamins', name: 'Тест D3', size_label: '120 капсули', price_cents: 799,
  image: '/shop/img/nutriversum-d3k2-120.webp', description: '', flavors: [], goals: [], tags: [], servings: 120,
  serving_unit: 'доза', size_group: null, active: true, sort: 0 }]
const DELIVERY = [{ id: 'pickup', label: 'Взимане на място', hint: '', price_cents: 0, free_from_cents: null, needs: 'none', sort: 0, active: true }]

export async function shopIn(page, customer = CUSTOMER, tables = {}) {
  await signIn(page, { tables: { shop_products: PRODUCTS, shop_delivery: DELIVERY, shop_deals: [], shop_customers: customer ? [customer] : [], shop_orders: [], ...tables } })
  if (!customer) return
  await page.addInitScript(({ id, phone }) => {
    localStorage.setItem('zs-auth', JSON.stringify({
      access_token: 'shop-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'shop-refresh',
      user: { id, aud: 'authenticated', role: 'authenticated', phone, app_metadata: {}, user_metadata: { app: 'shop' }, created_at: new Date().toISOString() },
    }))
  }, { id: customer.id, phone: customer.phone })
}
```

`tests/shop-account.spec.js`:

```js
import { test, expect } from '@playwright/test'
import { PROJECT_REF } from './harness.js'
import { CUSTOMER, shopIn } from './shop-helpers.js'

/* Профилът в магазина (Р19). */

test('сесията на приложението не влиза в магазина', async ({ page }) => {
  await shopIn(page, null)
  await page.goto('/shop/#/profile')
  await expect(page.getByRole('heading', { name: 'Вход с телефон' })).toBeVisible()
  // ключът на приложението е там, но магазинът не го ползва
  expect(await page.evaluate((ref) => !!localStorage.getItem(`sb-${ref}-auth-token`), PROJECT_REF)).toBe(true)
})
```

- [ ] **Step 2: Пусни го — трябва да се провали**

Run: `npx playwright test shop-account --project=chromium`
Expected: FAIL — заглавието „Вход с телефон“ го няма (адресът `#/profile` още не съществува).

- [ ] **Step 3: Клиентът и сесията**

`src/shop/db.js`:

```js
import { createClient } from '@supabase/supabase-js'

/* Клиентът на магазина. Отделен от src/lib/supabase.js нарочно: магазинът и
 * приложението са на един домейн, а купувач, влязъл с телефон, не бива да се
 * окаже „влязъл“ в приложението на коучинга (няма профил там — то се чупи).
 * Свой ключ за сесията — zs-auth. Каталогът се чете анонимно, както досега. */
export const db = createClient(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'zs-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
```

`src/shop/session.js`:

```js
import { useCallback, useEffect, useState } from 'react'
import { db } from './db'

/* Сесията на купувача и неговият ред в shop_customers.
 * session: undefined — още се зарежда; null — не е влязъл. */
export function useShopSession() {
  const [session, setSession] = useState(undefined)
  const [customer, setCustomer] = useState(null)

  const load = useCallback(async (s) => {
    if (!s) { setCustomer(null); return }
    const { data } = await db.from('shop_customers').select('*').eq('id', s.user.id).maybeSingle()
    setCustomer(data ?? null)
  }, [])

  useEffect(() => {
    db.auth.getSession().then(({ data }) => { setSession(data.session); load(data.session) })
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => { setSession(s); load(s) })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const reload = useCallback(async () => {
    const { data } = await db.auth.getSession()
    await load(data.session)
  }, [load])

  const ready = Boolean(customer && customer.phone && customer.has_card && !customer.deactivated_at)
  return { session, customer, reload, ready }
}
```

В `src/shop/ShopApp.jsx` и `src/shop/Checkout.jsx` смени ред 2:

```js
import { db as supabase } from './db'
```

- [ ] **Step 4: Временен адрес за профила**

Само за да мине тестът, а Task 5 го заменя. В `src/shop/ShopApp.jsx`:
- добави импорта `import { useShopSession } from './session'`;
- в `ShopApp()` след `const toastTimer = useRef(0)` добави `const shop = useShopSession()`;
- в каскадата `body` преди `else if (route.page === 'c')` добави:

```jsx
  else if (route.page === 'profile' && shop.session === null) body = <h1 className={styles.h1}>Вход с телефон</h1>
```

Run: `npx playwright test shop-account shop --project=chromium`
Expected: всички минават — новият тест и старите тестове на магазина.

- [ ] **Step 5: Комит**

```bash
git add src/shop/db.js src/shop/session.js src/shop/ShopApp.jsx src/shop/Checkout.jsx tests/shop-helpers.js tests/shop-account.spec.js
git commit -m "Магазин: своя сесия (zs-auth), отделна от приложението"
git push
```

---

### Task 4: Входът с телефон и код

**Files:**
- Create: `src/shop/Login.jsx`
- Create: `src/shop/Privacy.jsx`
- Modify: `src/shop/ShopApp.jsx` — адресите `login`, `privacy`, временният `profile` от Task 3
- Test: `tests/shop-account.spec.js`

**Interfaces:**
- Consumes: `db` (Task 3), `normalisePhone` (Task 2).
- Produces: `<Login next={string} />` — след верен код праща към `next` (адрес с `#`). `<Privacy />`.

- [ ] **Step 1: Напиши провалящия се тест**

Добави в `tests/shop-account.spec.js`:

```js
test('вход: номерът става +359, кодът влиза и води към профила', async ({ page }) => {
  await shopIn(page, null, { shop_customers: [CUSTOMER] })
  let otp = null
  await page.route('**/auth/v1/otp', async (route) => { otp = route.request().postDataJSON(); await route.fulfill({ json: {} }) })
  await page.route('**/auth/v1/verify', (route) => route.fulfill({ json: {
    access_token: 'shop-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'r', user: { id: CUSTOMER.id, aud: 'authenticated', role: 'authenticated', phone: CUSTOMER.phone, app_metadata: {}, user_metadata: { app: 'shop' } },
  } }))
  await page.goto('/shop/#/profile')
  await page.getByLabel('Телефон').fill('0888 123 456')
  await page.getByRole('button', { name: 'Изпрати код' }).click()
  expect(otp.phone).toBe('+359888123456')
  expect(otp.data).toEqual({ app: 'shop' })
  await page.getByLabel('Код от SMS').fill('123456')
  await page.getByRole('button', { name: 'Влез' }).click()
  await expect(page.getByRole('heading', { name: 'Профил' })).toBeVisible()
})

test('вход: грешен номер казва какво не е наред', async ({ page }) => {
  await shopIn(page, null)
  await page.goto('/shop/#/login')
  await page.getByLabel('Телефон').fill('0888')
  await page.getByRole('button', { name: 'Изпрати код' }).click()
  await expect(page.getByText('Телефонът не изглежда като български номер — напр. 0888 123 456.')).toBeVisible()
})
```

Профилът е временно заглавие и Task 5 го прави истински. За да мине този тест, заглавието „Профил“ трябва да се показва при влязъл купувач. Виж Step 3.

- [ ] **Step 2: Пусни ги — трябва да се провалят**

Run: `npx playwright test shop-account --project=chromium`
Expected: FAIL — няма поле „Телефон“.

- [ ] **Step 3: Входът, политиката и адресите**

`src/shop/Login.jsx`:

```jsx
import { useState } from 'react'
import { db } from './db'
import { normalisePhone } from './phone'
import styles from './Shop.module.css'

/* Вход с телефон (Р19): номер → код по SMS → вътре. Без парола.
 * Регистрацията носи app: 'shop' — така handle_new_user прави купувач
 * (shop_customers), не клиент на коучинга. */
export default function Login({ next = '#/profile' }) {
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(null)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e) {
    e.preventDefault()
    const p = normalisePhone(phone)
    if (!p) { setErr('Телефонът не изглежда като български номер — напр. 0888 123 456.'); return }
    setErr('')
    setBusy(true)
    const { error } = await db.auth.signInWithOtp({ phone: p, options: { channel: 'sms', data: { app: 'shop' } } })
    setBusy(false)
    if (error) { setErr('Кодът не тръгна. Опитай пак след минута.'); return }
    setSent(p)
  }

  async function verify(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setErr('Кодът е 6 цифри.'); return }
    setErr('')
    setBusy(true)
    const { error } = await db.auth.verifyOtp({ phone: sent, token: code, type: 'sms' })
    setBusy(false)
    if (error) { setErr('Кодът не е верен или е изтекъл.'); return }
    window.location.hash = next
  }

  return (
    <form className={styles.checkout} onSubmit={sent ? verify : send} noValidate>
      <h1 className={styles.h1}>Вход с телефон</h1>
      <p className={styles.note}>С профила поръчваш онлайн и влизаш в обекта. Без парола — пращаме код по SMS.</p>
      <fieldset className={styles.group}>
        {!sent ? (
          <label data-field="phone" className={err ? styles.hasError : undefined}>
            Телефон
            <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!err} />
            {err && <small className={styles.fieldError}>{err}</small>}
          </label>
        ) : (
          <label data-field="code" className={err ? styles.hasError : undefined}>
            Код от SMS
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-invalid={!!err} />
            <small className={styles.hint}>Пратихме го на {sent}.</small>
            {err && <small className={styles.fieldError}>{err}</small>}
          </label>
        )}
      </fieldset>
      <button type="submit" className={`${styles.primary} ${styles.wide}`} disabled={busy}>
        {busy ? 'Изпраща…' : sent ? 'Влез' : 'Изпрати код'}
      </button>
      {sent && <button type="button" className={styles.ghost} onClick={() => { setSent(null); setCode(''); setErr('') }}>Друг номер</button>}
      <p className={styles.note}>Продължавайки, приемаш <a href="#/privacy">как пазим данните</a>.</p>
    </form>
  )
}
```

`src/shop/Privacy.jsx`:

```jsx
import styles from './Shop.module.css'

/* Чернова — сроковете от проекта (Р19). Преди старта я преглежда адвокат. */
const ROWS = [
  ['Влизанията в обекта (телефон, име)', '90 дни след посещението, после се заличават'],
  ['Посещение, свързано с липса', 'докато случаят се приключи, най-много 5 години'],
  ['Записите от камерите', '30 дни; запис от случай — колкото случаят'],
  ['Продажби, бонове, фактури', '10 години — Закон за счетоводството'],
  ['Номерът ти в Stripe', 'колкото продажбите — за спорове по плащания'],
]

export default function Privacy() {
  return (
    <article className={styles.checkout}>
      <h1 className={styles.h1}>Как пазим данните</h1>
      <p>Пазим телефона, името и имейла ти, за да поръчваш и да влизаш в обекта. Картата е при Stripe — номерът ѝ не стига до нас.</p>
      <p>Когато изтриеш профила, той спира веднага: няма вход и картата се маха. Данните, които го свързват с посещенията и продажбите, се пазят по сроковете долу и после се заличават сами.</p>
      <div className={styles.summary}>
        {ROWS.map(([what, how]) => <div key={what} className={styles.sumLine}><span>{what}</span><span>{how}</span></div>)}
      </div>
      <p className={styles.note}>Благ Холдинг ЕООД · ЕИК 208845685 · София. Въпроси — на имейла от писмата ни.</p>
    </article>
  )
}
```

В `src/shop/ShopApp.jsx`:
- добави импортите `import Login from './Login.jsx'` и `import Privacy from './Privacy.jsx'`;
- махни временния ред от Task 3 и сложи на същото място:

```jsx
  else if (route.page === 'login') body = <Login next={new URLSearchParams(route.query).get('next') || '#/profile'} />
  else if (route.page === 'privacy') body = <Privacy />
  else if (route.page === 'profile' && shop.session === null) body = <Login next="#/profile" />
  else if (route.page === 'profile' && shop.session) body = <h1 className={styles.h1}>Профил</h1>
```

- [ ] **Step 4: Пусни тестовете — трябва да минат**

Run: `npx playwright test shop-account --project=chromium`
Expected: 3 passed.

- [ ] **Step 5: Комит**

```bash
git add src/shop/Login.jsx src/shop/Privacy.jsx src/shop/ShopApp.jsx tests/shop-account.spec.js
git commit -m "Магазин: вход с телефон и код по SMS; чернова на политиката за данните"
git push
```

---

### Task 5: Функцията shop-account

**Files:**
- Create: `supabase/functions/shop-account/logic.ts`
- Create: `supabase/functions/shop-account/checks.ts`
- Create: `supabase/functions/shop-account/index.ts`

**Interfaces:**
- Produces: `POST /functions/v1/shop-account` с вход (JWT на купувач). Тяло → отговор:
  - `{action:'setup'}` → `{url}`: адрес на Stripe за картата;
  - `{action:'setup-confirm', session}` → `{has_card: boolean}`;
  - `{action:'link-email', email}` → `{sent: true}`;
  - `{action:'link-confirm', token}` → `{linked: number}`: колко поръчки като гост са прикачени;
  - `{action:'delete'}` → `{deleted: true}`.

  Без вход → `401 {error}`.

- [ ] **Step 1: Напиши проверките**

`supabase/functions/shop-account/checks.ts`:

```ts
/* Проверките на помощниците на shop-account.
 *   npx deno run --allow-read supabase/functions/shop-account/checks.ts */
import { bearer, escapeHtml, randomToken, sha256Hex, validEmail } from './logic.ts'

let failed = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) { failed++; console.error(`FAIL ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`) }
}

eq('bearer', bearer('Bearer abc.def'), 'abc.def')
eq('bearer без', bearer(null), null)
eq('bearer друго', bearer('Basic x'), null)
eq('имейл', validEmail('ivan@example.com'), true)
eq('имейл без домейн', validEmail('ivan@example'), false)
eq('html', escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
eq('sha256', await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
eq('токен', /^[0-9a-f]{64}$/.test(randomToken()), true)
eq('токените са различни', randomToken() !== randomToken(), true)

if (failed) { console.error(`${failed} провалени`); Deno.exit(1) }
console.log('shop-account: всичко минава')
```

- [ ] **Step 2: Пусни ги — трябва да се провалят**

Run: `npx deno run --allow-read supabase/functions/shop-account/checks.ts`
Expected: FAIL — `Module not found "logic.ts"`.

- [ ] **Step 3: Помощниците**

`supabase/functions/shop-account/logic.ts`:

```ts
// Чистите помощници на shop-account — без мрежа и база, за да се проверяват сами.
export const bearer = (h: string | null) => h?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
export async function sha256Hex(s: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))))
}
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)))
```

Run: `npx deno run --allow-read supabase/functions/shop-account/checks.ts`
Expected: `shop-account: всичко минава`.

- [ ] **Step 4: Функцията**

`supabase/functions/shop-account/index.ts`:

```ts
// shop-account — профилът на купувача в /shop (Р19). Всичко иска вход:
// JWT на купувач от shop_customers, който не е изключен.
//   setup         — клиент в Stripe + Checkout в режим setup → адрес за картата
//   setup-confirm — след връщането от Stripe: проверява сесията, отбелязва has_card
//   link-email    — праща линк за потвърждение на имейла (Resend)
//   link-confirm  — потвърждава имейла и прикачва поръчките като гост със същия имейл
//   delete        — изключва профила веднага: маха картите, забранява входа.
//                   Заличаването е след 90 дни (144_shop_anonymise).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { bearer, escapeHtml, randomToken, sha256Hex, validEmail } from './logic.ts'

const STRIPE_KEY = Deno.env.get('STRIPE_SHOP_SECRET_KEY')?.trim() || ''
const LIVE = Deno.env.get('SHOP_LIVE') === '1'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const ORIGINS = ['https://blag-coaching.com', 'https://www.blag-coaching.com', 'https://blag-coaching.vercel.app']
const isLocal = (o: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
const base = (o: string) => (ORIGINS.includes(o) || isLocal(o) ? o : ORIGINS[0])
const cors = (o: string) => ({
  'Access-Control-Allow-Origin': base(o),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
})
const keyUsable = () => STRIPE_KEY && (STRIPE_KEY.startsWith('sk_test_') || (LIVE && STRIPE_KEY.startsWith('sk_live_')))

async function stripe(method: 'GET' | 'POST', path: string, body?: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body?.toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

type Customer = { id: string; phone: string; name: string; email: string | null; stripe_customer: string | null; has_card: boolean; deactivated_at: string | null }

async function me(req: Request): Promise<Customer | null> {
  const jwt = bearer(req.headers.get('authorization'))
  if (!jwt) return null
  const { data } = await db.auth.getUser(jwt)
  if (!data.user) return null
  const { data: c } = await db.from('shop_customers').select('*').eq('id', data.user.id).maybeSingle()
  return c && !c.deactivated_at ? (c as Customer) : null
}

async function setup(c: Customer, origin: string) {
  if (!keyUsable()) return { status: 503, error: 'Картите още не са пуснати.' }
  let cus = c.stripe_customer
  if (!cus) {
    const form = new URLSearchParams({ phone: c.phone, 'metadata[shop_customer]': c.id })
    if (c.name) form.set('name', c.name)
    if (c.email) form.set('email', c.email)
    cus = (await stripe('POST', '/customers', form)).id as string
    await db.from('shop_customers').update({ stripe_customer: cus }).eq('id', c.id)
  }
  const s = await stripe('POST', '/checkout/sessions', new URLSearchParams({
    mode: 'setup', customer: cus, currency: 'eur', locale: 'bg', 'payment_method_types[0]': 'card',
    success_url: `${base(origin)}/shop/#/profile?setup={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base(origin)}/shop/#/profile`,
  }))
  return { status: 200, url: s.url }
}

async function setupConfirm(c: Customer, body: Record<string, unknown>) {
  const id = String(body.session ?? '').slice(0, 200)
  if (!id || !c.stripe_customer || !keyUsable()) return { status: 400, error: 'Няма такава сесия.' }
  const s = await stripe('GET', `/checkout/sessions/${encodeURIComponent(id)}?expand[]=setup_intent`)
  if (s.customer !== c.stripe_customer || s.status !== 'complete' || s.setup_intent?.status !== 'succeeded') {
    return { status: 200, has_card: c.has_card }
  }
  const pm = s.setup_intent.payment_method as string
  // allow_redisplay: картата излиза готова в касата на Stripe при следваща поръчка.
  await stripe('POST', `/payment_methods/${pm}`, new URLSearchParams({ allow_redisplay: 'always' }))
  await stripe('POST', `/customers/${c.stripe_customer}`, new URLSearchParams({ 'invoice_settings[default_payment_method]': pm }))
  await db.from('shop_customers').update({ has_card: true }).eq('id', c.id)
  return { status: 200, has_card: true }
}

async function linkEmail(c: Customer, body: Record<string, unknown>, origin: string) {
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 160)
  if (!validEmail(email)) return { status: 400, error: 'Имейлът изглежда непълен — липсва @ или домейн.' }
  if (!RESEND_API_KEY) return { status: 503, error: 'Писмата още не са пуснати.' }
  const token = randomToken()
  await db.from('shop_email_links').insert({
    token_hash: await sha256Hex(token), customer_id: c.id, email,
    expires_at: new Date(Date.now() + 24 * 3600e3).toISOString(),
  })
  await db.from('shop_customers').update({ email, email_verified_at: null }).eq('id', c.id)
  const link = `${base(origin)}/shop/#/link/${token}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Здраве и Сила <noreply@blag-coaching.com>', to: [email], subject: 'Потвърди имейла си',
      html: `<p>Здравей${c.name ? ', ' + escapeHtml(c.name) : ''}!</p>`
        + `<p>Потвърди имейла за профила си в Здраве и Сила:</p>`
        + `<p><a href="${link}">Потвърди имейла</a></p>`
        + `<p>Линкът важи 24 часа. Ако не си го искал — не прави нищо.</p>`,
    }),
  })
  if (!res.ok) return { status: 502, error: 'Писмото не тръгна. Опитай пак.' }
  return { status: 200, sent: true }
}

async function linkConfirm(c: Customer, body: Record<string, unknown>) {
  const hash = await sha256Hex(String(body.token ?? '').slice(0, 200))
  const { data: link } = await db.from('shop_email_links').select('*').eq('token_hash', hash).maybeSingle()
  if (!link || link.customer_id !== c.id || link.used_at || new Date(link.expires_at) < new Date()) {
    return { status: 400, error: 'Линкът е изтекъл или вече е използван.' }
  }
  const now = new Date().toISOString()
  await db.from('shop_email_links').update({ used_at: now }).eq('token_hash', hash)
  await db.from('shop_customers').update({ email: link.email, email_verified_at: now }).eq('id', c.id)
  // shop-checkout пише имейла с малки букви — eq стига; ilike би хванал „_“ като шаблон.
  const { data: moved } = await db.from('shop_orders').update({ customer_id: c.id })
    .is('customer_id', null).eq('email', link.email).select('id')
  return { status: 200, linked: moved?.length ?? 0 }
}

async function remove(c: Customer) {
  if (c.stripe_customer && keyUsable()) {
    const list = await stripe('GET', `/customers/${c.stripe_customer}/payment_methods?limit=100`)
    for (const pm of list.data ?? []) await stripe('POST', `/payment_methods/${pm.id}/detach`)
  }
  await db.from('shop_customers').update({ deactivated_at: new Date().toISOString(), has_card: false }).eq('id', c.id)
  await db.auth.admin.updateUserById(c.id, { ban_duration: '876000h' })
  return { status: 200, deleted: true }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const headers = cors(origin)
  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers })
  try {
    const c = await me(req)
    if (!c) return new Response(JSON.stringify({ error: 'Влез с телефона си.' }), { status: 401, headers })
    const body = await req.json()
    const out = body.action === 'setup' ? await setup(c, origin)
      : body.action === 'setup-confirm' ? await setupConfirm(c, body)
      : body.action === 'link-email' ? await linkEmail(c, body, origin)
      : body.action === 'link-confirm' ? await linkConfirm(c, body)
      : body.action === 'delete' ? await remove(c)
      : { status: 400, error: 'Непознато действие.' }
    const { status, ...rest } = out
    return new Response(JSON.stringify(rest), { status, headers })
  } catch (e) {
    console.error('shop-account', e)
    return new Response(JSON.stringify({ error: 'Нещо се обърка. Опитай пак след малко.' }), { status: 500, headers })
  }
})
```

- [ ] **Step 5: Проверка на типовете и деплой**

Run: `npx deno check supabase/functions/shop-account/index.ts`
Expected: без грешки.

Run: `supabase functions deploy shop-account`
Expected: `Deployed Function shop-account`.

Run: `curl -s -X POST "$SUPABASE_URL/functions/v1/shop-account" -H "Content-Type: application/json" -H "apikey: $VITE_SUPABASE_ANON_KEY" -d '{"action":"setup"}'`
Expected: `{"error":"Влез с телефона си."}`.

- [ ] **Step 6: Комит**

```bash
git add supabase/functions/shop-account
git commit -m "Магазин: shop-account — карта (Stripe setup), имейл с линк, изключване на профила"
git push
```

---

### Task 6: Екранът „Профил“

**Files:**
- Create: `src/shop/Profile.jsx`
- Modify: `src/shop/ShopApp.jsx` — адресите `profile` и `link`, бутон „Профил“ в горната лента
- Test: `tests/shop-account.spec.js`

**Interfaces:**
- Consumes: `db`, `useShopSession()` (Task 3), `shop-account` (Task 5), `<Login>` (Task 4).
- Produces:
  - `<Profile shop={useShopSession()} query={string} />`;
  - `<LinkEmail shop token />`;
  - адресите `#/profile`, `#/profile?setup=<сесия>`, `#/link/<токен>`.

- [ ] **Step 1: Напиши провалящите се тестове**

Добави в `tests/shop-account.spec.js`:

```js
test('профилът: без карта не е готов за обекта; „Добави карта“ отива към Stripe', async ({ page }) => {
  await shopIn(page, { ...CUSTOMER, has_card: false })
  let asked = null
  await page.route('**/functions/v1/shop-account', async (route) => {
    asked = route.request().postDataJSON()
    await route.fulfill({ json: { url: '/shop/#/stripe-test' } })
  })
  await page.goto('/shop/#/profile')
  await expect(page.getByRole('heading', { name: 'Профил' })).toBeVisible()
  await expect(page.getByText('Добави карта, за да влизаш в обекта.')).toBeVisible()
  await page.getByRole('button', { name: 'Добави карта' }).click()
  expect(asked).toEqual({ action: 'setup' })
  await expect(page).toHaveURL(/stripe-test/)
})

test('профилът: връщането от Stripe отбелязва картата', async ({ page }) => {
  await shopIn(page, { ...CUSTOMER, has_card: false })
  let asked = null
  await page.route('**/functions/v1/shop-account', async (route) => {
    asked = route.request().postDataJSON()
    await route.fulfill({ json: { has_card: true } })
  })
  await page.goto('/shop/#/profile?setup=cs_test_1')
  await expect.poll(() => asked).toEqual({ action: 'setup-confirm', session: 'cs_test_1' })
})

test('профилът: готов за обекта, покупките, изтриване с потвърждение', async ({ page }) => {
  await shopIn(page, CUSTOMER, { shop_orders: [
    { id: 'o1', number: 1001, created_at: '2026-10-27T12:00:00Z', total_cents: 1148, status: 'paid', customer_id: CUSTOMER.id },
  ] })
  let asked = null
  await page.route('**/functions/v1/shop-account', async (route) => {
    asked = route.request().postDataJSON()
    await route.fulfill({ json: { deleted: true } })
  })
  await page.goto('/shop/#/profile')
  await expect(page.getByText('Готов си за обекта.')).toBeVisible()
  await expect(page.getByText('Поръчка № 1001')).toBeVisible()
  await expect(page.getByText('11,48 €')).toBeVisible()
  await page.getByRole('button', { name: 'Изтрий профила' }).click()
  await expect(page.getByText(/спира веднага/)).toBeVisible()
  await page.getByRole('button', { name: 'Да, изтрий' }).click()
  await expect.poll(() => asked).toEqual({ action: 'delete' })
  await expect(page).toHaveURL(/\/shop\/#\/$/)
})

test('линкът от писмото потвърждава имейла и казва колко поръчки е прикачил', async ({ page }) => {
  await shopIn(page, { ...CUSTOMER, email_verified_at: null })
  await page.route('**/functions/v1/shop-account', (route) => route.fulfill({ json: { linked: 2 } }))
  await page.goto('/shop/#/link/abc123')
  await expect(page.getByText('Имейлът е потвърден. Прикачихме 2 поръчки от преди.')).toBeVisible()
})
```

- [ ] **Step 2: Пусни ги — трябва да се провалят**

Run: `npx playwright test shop-account --project=chromium`
Expected: 4 failed — няма „Добави карта“, „Готов си за обекта.“ и т.н.

- [ ] **Step 3: Екранът**

`src/shop/Profile.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { db } from './db'
import { euro } from './cart'
import Login from './Login.jsx'
import styles from './Shop.module.css'

/* Профилът на купувача (Р19): готов ли е за обекта, картата, името и имейлът,
 * покупките и изтриването. Картата и имейлът минават през shop-account;
 * името се пише направо (RLS пуска само тази колона). */

async function call(action, extra = {}) {
  const { data, error } = await db.functions.invoke('shop-account', { body: { action, ...extra } })
  if (error || data?.error) {
    let text = data?.error
    try { text = text || (await error.context.json()).error } catch { /* без тяло */ }
    return { error: text || 'Нещо се обърка. Опитай пак.' }
  }
  return data
}

const STATUS = { paid: 'платена', pending_payment: 'чака плащане', cancelled: 'отказана', shipped: 'изпратена', delivered: 'доставена' }

export default function Profile({ shop, query }) {
  const { customer, reload, ready } = shop
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [sure, setSure] = useState(false)

  useEffect(() => { if (customer) { setName(customer.name || ''); setEmail(customer.email || '') } }, [customer])

  useEffect(() => {
    if (!customer) return
    db.from('shop_orders').select('id, number, created_at, total_cents, status')
      .eq('customer_id', customer.id).order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data ?? []))
  }, [customer])

  // Връщане от Stripe: #/profile?setup=<сесия>
  useEffect(() => {
    const session = new URLSearchParams(query).get('setup')
    if (!session) return
    call('setup-confirm', { session }).then(() => { reload(); window.history.replaceState(null, '', '#/profile') })
  }, [query, reload])

  if (!customer) return <p className={styles.empty}>Зарежда профила…</p>

  async function saveName(e) {
    e.preventDefault()
    if (name.trim().split(/\s+/).length < 2) { setMsg('Напиши име и фамилия.'); return }
    await db.from('shop_customers').update({ name: name.trim() }).eq('id', customer.id)
    setMsg('Записано.')
    reload()
  }
  async function sendLink() {
    setBusy(true)
    const r = await call('link-email', { email })
    setBusy(false)
    setMsg(r.error || 'Пратихме линк на имейла — отвори го, за да го потвърдиш.')
  }
  async function addCard() {
    setBusy(true)
    const r = await call('setup')
    if (r.url) { window.location.assign(r.url); return }
    setBusy(false)
    setMsg(r.error)
  }
  async function remove() {
    setBusy(true)
    const r = await call('delete')
    if (r.error) { setBusy(false); setMsg(r.error); return }
    await db.auth.signOut()
    window.location.hash = '#/'
  }

  const missing = !customer.has_card ? 'Добави карта, за да влизаш в обекта.' : null

  return (
    <div className={styles.checkout}>
      <h1 className={styles.h1}>Профил</h1>
      <p className={ready ? styles.note : styles.fieldError}>{ready ? 'Готов си за обекта.' : missing}</p>

      <fieldset className={styles.group}>
        <legend>Карта</legend>
        <p>{customer.has_card ? 'Картата е запазена в Stripe.' : 'Няма запазена карта.'}</p>
        <button type="button" className={customer.has_card ? styles.ghost : styles.primary} onClick={addCard} disabled={busy}>
          {customer.has_card ? 'Смени картата' : 'Добави карта'}
        </button>
      </fieldset>

      <form className={styles.group} onSubmit={saveName}>
        <legend>Име</legend>
        <label>Име и фамилия
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <button type="submit" className={styles.ghost}>Запази</button>
      </form>

      <fieldset className={styles.group}>
        <legend>Имейл</legend>
        <label>Имейл
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <small className={styles.hint}>{customer.email_verified_at && customer.email === email ? 'Потвърден.' : 'За бонове и писма за поръчките. Пращаме линк за потвърждение.'}</small>
        </label>
        <button type="button" className={styles.ghost} onClick={sendLink} disabled={busy}>Изпрати линк</button>
      </fieldset>

      <p className={styles.note}>Телефон: {customer.phone}</p>
      {msg && <p className={styles.note} role="status">{msg}</p>}

      <section className={styles.group} aria-label="Моите покупки">
        <h2 className={styles.h1}>Моите покупки</h2>
        {!orders.length && <p className={styles.hint}>Още няма покупки.</p>}
        <div className={styles.summary}>
          {orders.map((o) => (
            <div key={o.id} className={styles.sumLine}>
              <span>Поръчка № {o.number} · {new Date(o.created_at).toLocaleDateString('bg-BG')} · {STATUS[o.status] ?? o.status}</span>
              <span>{euro(o.total_cents)}</span>
            </div>
          ))}
        </div>
      </section>

      <button type="button" className={styles.ghost} onClick={() => db.auth.signOut().then(() => { window.location.hash = '#/' })}>Изход</button>
      {!sure ? (
        <button type="button" className={styles.remove} onClick={() => setSure(true)}>Изтрий профила</button>
      ) : (
        <div className={styles.group} role="alert">
          <p>Профилът спира веднага: няма вход и картата се маха. Посещенията и продажбите се пазят по сроковете в <a href="#/privacy">политиката</a> и после се заличават.</p>
          <button type="button" className={styles.primary} onClick={remove} disabled={busy}>Да, изтрий</button>
          <button type="button" className={styles.ghost} onClick={() => setSure(false)}>Откажи</button>
        </div>
      )}
    </div>
  )
}

/* #/link/<токен> — от писмото за имейла. */
export function LinkEmail({ shop, token }) {
  const [text, setText] = useState('Потвърждаваме…')
  useEffect(() => {
    if (!shop.session) return
    call('link-confirm', { token }).then((r) => {
      if (r.error) { setText(r.error); return }
      setText(r.linked ? `Имейлът е потвърден. Прикачихме ${r.linked} поръчки от преди.` : 'Имейлът е потвърден.')
      shop.reload()
    })
  }, [shop.session, token]) // eslint-disable-line react-hooks/exhaustive-deps
  if (shop.session === null) return <Login next={`#/link/${token}`} />
  return <div className={styles.emptyBox}><p role="status">{text}</p><a href="#/profile" className={styles.primary}>Към профила</a></div>
}
```

В `src/shop/ShopApp.jsx`:
1. Добави импорта `import Profile, { LinkEmail } from './Profile.jsx'`.
2. Замени двата реда за `profile` от Task 4 с:

```jsx
  else if (route.page === 'profile' && shop.session === null) body = <Login next="#/profile" />
  else if (route.page === 'profile') body = <Profile shop={shop} query={route.query} />
  else if (route.page === 'link') body = <LinkEmail shop={shop} token={route.args[0]} />
```

3. В горната лента, точно преди `<a href="#/cart" …>`, добави:

```jsx
          <a href="#/profile" className={styles.cartBtn} aria-label="Профил"><span>Профил</span></a>
```

- [ ] **Step 4: Пусни тестовете — трябва да минат**

Run: `npx playwright test shop-account shop --project=chromium --project=mobile`
Expected: всички минават.

- [ ] **Step 5: Погледни го**

Run: `npx playwright test shop-account --project=mobile` и ползвай `page.screenshot`, ако е нужно. Или пусни `npm run dev` и отвори `http://localhost:5173/shop/#/profile`. Провери, че екранът е в гамата на магазина: няма чужди цветове, нищо не излиза извън екрана на 390 px.

- [ ] **Step 6: Комит**

```bash
git add src/shop/Profile.jsx src/shop/ShopApp.jsx tests/shop-account.spec.js
git commit -m "Магазин: екран „Профил“ — карта, имейл с линк, моите покупки, изтриване"
git push
```

---

### Task 7: Касата иска профил

**Files:**
- Modify: `src/shop/Checkout.jsx` — `validate`, `Checkout`
- Modify: `src/shop/ShopApp.jsx` — касата получава купувача
- Modify: `supabase/functions/shop-checkout/index.ts` — `create`, `Deno.serve`
- Test: `tests/shop.spec.js` — тестът „касата: …“; `tests/shop-account.spec.js`

**Interfaces:**
- Consumes: `useShopSession()` (Task 3), `shop_orders.customer_id` (Task 1), `<Login>` (Task 4).
- Produces: `<Checkout lines subtotal delivery customer onPaid />`. `shop-checkout` `create` вече не приема `customer` в тялото. Купувачът идва от входа.

- [ ] **Step 1: Обнови теста на касата и добави тест без вход**

В `tests/shop.spec.js` добави импорта горе:

```js
import { shopIn } from './shop-helpers.js'
```

Замени теста `'касата: конкретни грешки, офис от списък, праща количката'` изцяло с:

```js
test('касата: с профил — без полета за контакт, офис от списък, праща само количката', async ({ page }) => {
  let sent = null
  await shopIn(page, undefined, { shop_products: PRODUCTS, shop_delivery: DELIVERY })
  await page.route('**/shop/econt-offices.json', (route) => route.fulfill({ json: OFFICES }))
  await page.route('**/functions/v1/shop-checkout', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ json: { number: 1001, order: 'o1', stripe: false } })
  })
  await page.goto('/shop/#/p/d3')
  await page.getByRole('button', { name: /Добави · 7,99 €/ }).click()
  await page.goto('/shop/#/checkout')
  await expect(page.getByText('Иван Петров · ivan@example.com · +359888123456')).toBeVisible()
  await expect(page.getByLabel('Имейл')).toHaveCount(0)
  await page.getByRole('button', { name: /^Плати/ }).click()
  await expect(page.getByText('Избери как да ти стигне.')).toBeVisible()
  await page.getByText('Офис на Еконт').click()
  await page.getByPlaceholder(/Град, квартал/).fill('младост')
  const first = page.getByRole('option').first()
  await expect(first).toContainText('София')
  await first.click()
  await expect(page.getByText('11,48 €').first()).toBeVisible()
  await page.getByRole('button', { name: /Плати 11,48 €/ }).click()
  await expect(page.getByRole('heading', { name: 'Поръчка № 1001' })).toBeVisible()
  expect(sent.items).toEqual([{ id: 'd3', flavor: null, qty: 1 }])
  expect(sent.customer).toBeUndefined()
  expect(sent.delivery.id).toBe('econt-office')
  expect(sent.delivery.details).toContain('[2]')
})
```

Добави в `tests/shop-account.spec.js`:

```js
test('касата без вход показва входа и после се връща в касата', async ({ page }) => {
  await shopIn(page, null)
  await page.goto('/shop/#/p/d3')
  await page.getByRole('button', { name: /Добави · 7,99 €/ }).click()
  await page.goto('/shop/#/checkout')
  await expect(page.getByRole('heading', { name: 'Вход с телефон' })).toBeVisible()
})

test('касата без имейл в профила праща към профила', async ({ page }) => {
  await shopIn(page, { ...CUSTOMER, email: null })
  await page.goto('/shop/#/p/d3')
  await page.getByRole('button', { name: /Добави · 7,99 €/ }).click()
  await page.goto('/shop/#/checkout')
  await expect(page.getByRole('link', { name: 'Допиши име и имейл в профила' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Плати/ })).toBeDisabled()
})
```

- [ ] **Step 2: Пусни ги — трябва да се провалят**

Run: `npx playwright test shop shop-account --project=chromium`
Expected: FAIL — касата още показва полетата за контакт.

- [ ] **Step 3: Касата в браузъра**

В `src/shop/Checkout.jsx` замени `validate` с:

```js
function validate(form, method) {
  const e = {}
  if (!method) e.delivery = 'Избери как да ти стигне.'
  else if (DETAILS[method.needs] && form.details.trim().length < 4) e.details = DETAILS[method.needs].error
  return e
}
```

В `Checkout`:

1. Сигнатурата:
```js
export function Checkout({ lines, subtotal, delivery, customer, onPaid }) {
```

2. Състоянието на формата, вместо блока с `zs.contact`:
```js
  const [form, setForm] = useState({ delivery: '', details: '' })
  const complete = Boolean(customer?.name && customer?.email)
```

3. В `submit` махни реда с `localStorage.setItem('zs.contact', …)`. От тялото на `invoke` махни `customer: { … }`. Началото на `submit` става:
```js
  async function submit(e) {
    e.preventDefault()
    if (!complete) return
    setTried(true)
```

4. Замени `<fieldset>` „Контакт“ с:
```jsx
      <fieldset className={styles.group}>
        <legend>Контакт</legend>
        <p>{[customer?.name, customer?.email, customer?.phone].filter(Boolean).join(' · ')}</p>
        {complete
          ? <a href="#/profile" className={styles.hint}>Смени в профила</a>
          : <a href="#/profile" className={styles.fieldError}>Допиши име и имейл в профила</a>}
      </fieldset>
```

5. Бутонът за плащане:
```jsx
      <button type="submit" className={`${styles.primary} ${styles.wide}`} disabled={busy || !complete}>
```

В `src/shop/ShopApp.jsx` замени реда за `checkout` с:

```jsx
  else if (route.page === 'checkout' && shop.session === null) body = <Login next="#/checkout" />
  else if (route.page === 'checkout') body = <Checkout lines={lines} subtotal={subtotal} delivery={delivery} customer={shop.customer} onPaid={clear} />
```

- [ ] **Step 4: Касата на сървъра**

В `supabase/functions/shop-checkout/index.ts`:

1. Добави под `const isLocal = …`:
```ts
const bearer = (h: string | null) => h?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null

// Купувачът от входа (Р19) — без вход няма поръчка.
async function buyer(req: Request) {
  const jwt = bearer(req.headers.get('authorization'))
  if (!jwt) return null
  const { data } = await db.auth.getUser(jwt)
  if (!data.user) return null
  const { data: c } = await db.from('shop_customers').select('id, phone, name, email, stripe_customer, deactivated_at').eq('id', data.user.id).maybeSingle()
  return c && !c.deactivated_at ? c : null
}
```

2. Началото на `create`, до проверката на количката:
```ts
async function create(body: Record<string, unknown>, origin: string, req: Request) {
  const c = await buyer(req)
  if (!c) return { status: 401, error: 'Влез с телефона си, за да поръчаш.' }
  if (!c.name || !c.email) return { status: 400, error: 'Допиши име и имейл в профила.' }
  const lines = (Array.isArray(body.items) ? body.items : []) as Line[]
  const delivery = (body.delivery ?? {}) as Record<string, unknown>
  const name = c.name
  const email = c.email
  const phone = c.phone
  const details = clean(delivery.details, 400)

  if (!lines.length || lines.length > 40) return { status: 400, error: 'Количката е празна.' }
```

   Махни старите редове `const customer = …`, `const name = clean(customer.name …)`, `email`, `phone` и проверката „Име, имейл и телефон са задължителни.“.

3. В `insert` на `shop_orders` добави `customer_id: c.id,` до `email, name, phone,`.

4. Във формата за Stripe замени `customer_email: email,` с нищо. След `const form = new URLSearchParams({ … })` добави:
```ts
  if (c.stripe_customer) form.set('customer', c.stripe_customer)
  else form.set('customer_email', email)
```

5. В `Deno.serve`:
```ts
    const out = body.action === 'confirm' ? await confirm(body) : await create(body, origin, req)
```

6. Обнови горния коментар на файла: „Две действия. `create` иска вход — купувач от `shop_customers` (Р19); `confirm` не иска, защото само пита Stripe за вече записана поръчка.“

Run: `npx deno check supabase/functions/shop-checkout/index.ts`
Expected: без грешки.

- [ ] **Step 5: Пусни всички тестове — трябва да минат**

Run: `npx playwright test shop shop-account shop-phone --project=chromium --project=mobile`
Expected: всички минават.

Run: `npm test`
Expected: всички минават. „Полетът на лицето“ в `smoke.spec.js` е известно нестабилен — при провал го пусни сам.

- [ ] **Step 6: Деплой и комит**

Run: `supabase functions deploy shop-checkout`
Expected: `Deployed Function shop-checkout`.

```bash
git add src/shop/Checkout.jsx src/shop/ShopApp.jsx supabase/functions/shop-checkout/index.ts tests/shop.spec.js tests/shop-account.spec.js
git commit -m "Магазин: касата иска профил — контактът е от профила, поръчката е към купувача, картата е готова в Stripe"
git push
```

---

### Task 8: Заличаване след 90 дни

**Files:**
- Create: `supabase/migrations/144_shop_anonymise.sql`
- Create: `tests/sql/144_shop_anonymise.test.sql`

**Interfaces:**
- Consumes: `shop_customers.deactivated_at` (Task 1).
- Produces:
  - `public.shop_anonymise() returns integer`: колко профила са заличени;
  - pg_cron задача `shop-anonymise` всяка нощ в 03:30.

- [ ] **Step 1: Напиши провалящия се тест**

`tests/sql/144_shop_anonymise.test.sql`:

```sql
-- Изключен преди 91 дни → заличен; изключен вчера → остава; поръчката остава без купувач.
begin;
insert into auth.users (id, instance_id, aud, role, phone, raw_user_meta_data, created_at, updated_at) values
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '359888000003', '{"app":"shop"}', now(), now()),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '359888000004', '{"app":"shop"}', now(), now());
update public.shop_customers set deactivated_at = now() - interval '91 days' where id = '33333333-3333-4333-8333-333333333333';
update public.shop_customers set deactivated_at = now() - interval '1 day'   where id = '44444444-4444-4444-8444-444444444444';

do $$
declare n integer;
begin
  n := public.shop_anonymise();
  if n <> 1 then raise exception 'FAIL: заличени % вместо 1', n; end if;
  if exists (select 1 from auth.users where id = '33333333-3333-4333-8333-333333333333') then raise exception 'FAIL: старият остана'; end if;
  if not exists (select 1 from public.shop_customers where id = '44444444-4444-4444-8444-444444444444') then raise exception 'FAIL: новият изчезна'; end if;
end $$;
select 'OK 144' as result;
rollback;
```

- [ ] **Step 2: Пусни го — трябва да се провали**

Run: `supabase db query --linked -f tests/sql/144_shop_anonymise.test.sql`
Expected: грешка `function public.shop_anonymise() does not exist`.

- [ ] **Step 3: Миграцията**

`supabase/migrations/144_shop_anonymise.sql`:

```sql
-- 144_shop_anonymise.sql — заличаване на изключените профили след 90 дни (Р19), 28.10.2026.
--
-- Изтриването в /shop изключва профила веднага (shop-account → delete). Тук,
-- 90 дни по-късно, се трие и потребителят в auth.users; shop_customers пада с
-- него (on delete cascade), а поръчките остават с customer_id = null — името и
-- имейлът в самите поръчки се пазят 10 години по Закона за счетоводството.
-- Етап 2 (посещенията и инцидентите) ще добави тук своите правила.

create or replace function public.shop_anonymise()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  with gone as (
    delete from auth.users u
     using public.shop_customers c
     where c.id = u.id
       and c.deactivated_at < now() - interval '90 days'
    returning u.id
  )
  select count(*) into n from gone;
  return n;
end;
$$;
revoke execute on function public.shop_anonymise() from public, anon, authenticated;

select cron.unschedule('shop-anonymise') where exists (select 1 from cron.job where jobname = 'shop-anonymise');
select cron.schedule('shop-anonymise', '30 3 * * *', 'select public.shop_anonymise()');
```

- [ ] **Step 4: Пусни миграцията и теста**

Run: `supabase db query --linked -f supabase/migrations/144_shop_anonymise.sql`
Expected: без грешка; ред с номер на задачата от `cron.schedule`.

Run: `supabase db query --linked -f tests/sql/144_shop_anonymise.test.sql`
Expected: `OK 144`.

- [ ] **Step 5: Комит**

```bash
git add supabase/migrations/144_shop_anonymise.sql tests/sql/144_shop_anonymise.test.sql
git commit -m "Магазин: изключените профили се заличават сами след 90 дни (pg_cron)"
git push
```

---

### Task 9: Решението и документацията

**Files:**
- Modify: `docs/DECISIONS.md` — нов раздел Р19 в края
- Modify: `CLAUDE.md` — абзацът „Магазин „Здраве и Сила““
- Modify: `docs/ZA-KOMPYUTARA.md` — ръчните стъпки

- [ ] **Step 1: Р19 в `docs/DECISIONS.md`**

Добави в края:

```markdown
---

## Р19 · Един профил за магазина и обекта — вход с телефон, карта в Stripe
`2026-10-28` · **в сила** · проект: `docs/superpowers/specs/2026-10-28-edin-profil-magazin-obekt-design.md`

**Отхвърлено:**
- поръчка като гост в `/shop` — **пази се като резерва**, ако профилът отказва купувачи;
- лиценз от Yellow Door за вратата — профилът в обекта би бил техен;
- KYC със селфи — цена, GDPR и отказани хора;
- плащане в приложението вместо каса — **пази се като следващ вариант**;
- отделен проект в Supabase — две бази;
- собствен вход.

**Защо:** един профил за онлайн и за обекта. Вратата се отваря само за потвърден телефон със запазена карта: това е проследимо и без биометрия.

**Как:**
- Supabase Auth с телефон (Twilio).
- `handle_new_user` пише купувачите в `shop_customers` (143), не в `profiles`. Капанът от Р9/Р10 е затворен с разклонение, не с отказ от акаунти.
- Магазинът има своя сесия (`zs-auth`), отделна от приложението.
- Изтриването изключва веднага. Заличаването е след 90 дни (144). Продажбите се пазят 10 години, инцидентите до приключване (GDPR чл. 17(3)(e)).
```

- [ ] **Step 2: `CLAUDE.md`**

В абзаца „Магазин „Здраве и Сила““ замени „без акаунт, без service worker“ с „без service worker; профил с вход с телефон (Р19) — свой клиент `src/shop/db.js` със сесия `zs-auth`, не тази на приложението“. В края на абзаца добави изречение: „Профилът: `shop_customers` (143), функцията `shop-account` (карта, имейл, изтриване), заличаване след 90 дни (144, pg_cron `shop-anonymise`). `shop-checkout` иска вход.“

- [ ] **Step 3: `docs/ZA-KOMPYUTARA.md`**

Под „## Работа на компютъра“ добави:

```markdown
- [ ] **Профилът в магазина (Р19) — ръчното:** акаунт в Twilio с подател за България;
      Supabase → Authentication → Providers → Phone (Twilio); после истински вход
      на iPhone: код по SMS, карта в Stripe (тестова 4242 4242 4242 4242),
      поръчка, „Моите покупки“, изтриване.
- [ ] Политиката за данните (`src/shop/Privacy.jsx`) — преглед от адвокат преди старта.
```

- [ ] **Step 4: Комит**

```bash
git add docs/DECISIONS.md CLAUDE.md docs/ZA-KOMPYUTARA.md
git commit -m "Р19: един профил за магазина и обекта; CLAUDE.md и списъкът за компютъра"
git push
```

---

## Какво остава за етап 2 и 3

- **Етап 2, вратата и изходът.** Отделен план след отговорите на Елтрейд и избора на хардуер:
  - `shop-door` с подписан QR на 30 s и проверка без мрежа;
  - `shop_visits`, лимит от трима, изход с QR от фискалния бон, авариен бутон;
  - софтуерът на контролера;
  - QR в профила, „Влез в обекта“;
  - правилата за посещенията и инцидентите в `shop_anonymise()`.
- **Етап 3, таблото.** „Сега“, посещения, инциденти и двете числа в `tablo_business()`.
