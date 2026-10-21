// shop-checkout — поръчката в онлайн магазина „Здраве и Сила“ (/shop/).
//
// Две действия, и двете без акаунт:
//   create  — проверява количката по цените в базата (браузърът не решава
//             колко струва нещо), пише поръчката и отваря Stripe Checkout.
//   confirm — след връщането от Stripe пита Stripe дали е платено и отбелязва
//             поръчката. Така няма нужда от webhook за прототипа.
//
// Ключът е STRIPE_SHOP_SECRET_KEY — отделен от STRIPE_SECRET_KEY на стария
// магазин. Докато SHOP_LIVE не е '1', функцията приема само тестов ключ
// (sk_test_…): истински пари не минават, преди да са готови общите условия и
// регистрацията в БАБХ. Без ключ поръчката се записва и чака, а страницата го
// казва.

import { createClient } from 'npm:@supabase/supabase-js@2'

const STRIPE_KEY = Deno.env.get('STRIPE_SHOP_SECRET_KEY')?.trim() || ''
const LIVE = Deno.env.get('SHOP_LIVE') === '1'
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const ORIGINS = ['https://blag-coaching.com', 'https://www.blag-coaching.com', 'https://blag-coaching.vercel.app']
const isLocal = (o: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) || isLocal(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }
}

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

type Line = { id: string; flavor?: string | null; qty: number }

const clean = (s: unknown, max = 200) => String(s ?? '').trim().slice(0, max)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function create(body: Record<string, unknown>, origin: string) {
  const lines = (Array.isArray(body.items) ? body.items : []) as Line[]
  const customer = (body.customer ?? {}) as Record<string, unknown>
  const delivery = (body.delivery ?? {}) as Record<string, unknown>
  const name = clean(customer.name, 120)
  const email = clean(customer.email, 160).toLowerCase()
  const phone = clean(customer.phone, 40)
  const details = clean(delivery.details, 400)

  if (!lines.length || lines.length > 40) return { status: 400, error: 'Количката е празна.' }
  if (!name || !EMAIL.test(email) || phone.replace(/\D/g, '').length < 8) {
    return { status: 400, error: 'Име, имейл и телефон са задължителни.' }
  }

  const { data: method } = await db.from('shop_delivery').select('*').eq('id', clean(delivery.id, 40)).eq('active', true).maybeSingle()
  if (!method) return { status: 400, error: 'Избери начин на доставка.' }
  if (method.needs !== 'none' && details.length < 4) return { status: 400, error: 'Липсва адрес или офис за доставката.' }

  const ids = [...new Set(lines.map((l) => clean(l.id, 80)))]
  const { data: products } = await db.from('shop_products').select('id, name, size_label, price_cents, flavors, active').in('id', ids)
  const byId = new Map((products ?? []).map((p) => [p.id, p]))

  const items = []
  for (const l of lines) {
    const p = byId.get(clean(l.id, 80))
    const qty = Math.floor(Number(l.qty))
    if (!p || !p.active) return { status: 409, error: 'Някой от продуктите вече не се предлага.' }
    if (!(qty >= 1 && qty <= 50)) return { status: 400, error: 'Невалидно количество.' }
    const flavor = l.flavor ? clean(l.flavor, 80) : null
    if (flavor && !p.flavors.includes(flavor)) return { status: 409, error: `Вкусът „${flavor}“ го няма.` }
    items.push({ id: p.id, name: p.name, size: p.size_label, flavor, qty, price_cents: p.price_cents })
  }

  const subtotal = items.reduce((s, i) => s + i.price_cents * i.qty, 0)
  const free = method.free_from_cents != null && subtotal >= method.free_from_cents
  const deliveryCents = free ? 0 : method.price_cents

  const { data: order, error } = await db.from('shop_orders').insert({
    email, name, phone,
    delivery_id: method.id, delivery_details: details,
    items, subtotal_cents: subtotal, delivery_cents: deliveryCents, total_cents: subtotal + deliveryCents,
    test_mode: !LIVE,
  }).select('id, number').single()
  if (error || !order) return { status: 500, error: 'Поръчката не се записа. Опитай пак.' }

  if (!keyUsable()) return { status: 200, number: order.number, order: order.id, stripe: false }

  const base = ORIGINS.includes(origin) || isLocal(origin) ? origin : ORIGINS[0]
  const form = new URLSearchParams({
    mode: 'payment',
    customer_email: email,
    locale: 'bg',
    success_url: `${base}/shop/#/thanks/${order.id}/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/shop/#/cart`,
    'metadata[order_id]': order.id,
    'metadata[number]': String(order.number),
  })
  const all = [...items.map((i) => ({ name: [i.name, i.size, i.flavor].filter(Boolean).join(' · '), cents: i.price_cents, qty: i.qty }))]
  if (deliveryCents) all.push({ name: `Доставка — ${method.label}`, cents: deliveryCents, qty: 1 })
  all.forEach((l, n) => {
    form.set(`line_items[${n}][quantity]`, String(l.qty))
    form.set(`line_items[${n}][price_data][currency]`, 'eur')
    form.set(`line_items[${n}][price_data][unit_amount]`, String(l.cents))
    form.set(`line_items[${n}][price_data][product_data][name]`, l.name.slice(0, 250))
  })
  const session = await stripe('POST', '/checkout/sessions', form)
  await db.from('shop_orders').update({ stripe_session_id: session.id }).eq('id', order.id)
  return { status: 200, number: order.number, order: order.id, url: session.url }
}

async function confirm(body: Record<string, unknown>) {
  const id = clean(body.order, 60)
  const session = clean(body.session, 200)
  const { data: order } = await db.from('shop_orders').select('id, number, status, stripe_session_id, total_cents, email').eq('id', id).maybeSingle()
  if (!order) return { status: 404, error: 'Няма такава поръчка.' }
  if (order.status !== 'pending_payment' || !keyUsable() || !session || session !== order.stripe_session_id) {
    return { status: 200, number: order.number, paid: order.status !== 'pending_payment' && order.status !== 'cancelled' }
  }
  const s = await stripe('GET', `/checkout/sessions/${encodeURIComponent(session)}`)
  const paid = s.payment_status === 'paid' && s.metadata?.order_id === order.id && s.amount_total === order.total_cents
  if (paid) await db.from('shop_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'pending_payment')
  return { status: 200, number: order.number, paid }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const headers = cors(origin)
  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers })
  try {
    const body = await req.json()
    const out = body.action === 'confirm' ? await confirm(body) : await create(body, origin)
    const { status, ...rest } = out
    return new Response(JSON.stringify(rest), { status, headers })
  } catch (e) {
    console.error('shop-checkout', e)
    return new Response(JSON.stringify({ error: 'Нещо се обърка при плащането. Опитай пак след малко.' }), { status: 500, headers })
  }
})
