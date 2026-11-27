// zs-access — входът на магазина „Здраве и Сила“ (/vrata/, миграция 151).
//
// Три действия:
//   start  { phone, terms }   → праща 6-цифрен код (SMS само при регистрация)
//   verify { phone, code }    → връща таен ключ за този телефон (пази се в браузъра)
//   open   { token }          → отключва бравата и записва влизането
//
// Двата превключвателя са в тайните на функциите — смяната е без код:
//   ZS_SMS  = test (по подразбиране) | twilio
//   ZS_DOOR = sim  (по подразбиране) | shelly
// В test кодът се връща в отговора и страницата го показва — нищо не се праща
// и нищо не струва. Всеки ред, създаден в test, е с test = true.
//
// Предпазители от сметка за SMS: 3 кода на 15 мин. за номер, 10 на час от едно
// място, ZS_SMS_DAILY_CAP (по подразбиране 100) на ден общо.

import { createClient } from 'npm:@supabase/supabase-js@2'

const env = (k: string, d = '') => (Deno.env.get(k) ?? d).trim()
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
const PEPPER = env('SUPABASE_SERVICE_ROLE_KEY').slice(-24)
const SMS = env('ZS_SMS', 'test')
const DOOR = env('ZS_DOOR', 'sim')
const DAILY_CAP = Number(env('ZS_SMS_DAILY_CAP', '100')) || 100
const TERMS_VERSION = '2026-11-27-test'
const TEST = SMS === 'test'

const ORIGINS = ['https://blag-coaching.com', 'https://www.blag-coaching.com', 'https://blag-coaching.vercel.app']
const isLocal = (o: string) => /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(o)
const cors = (o: string) => ({
  'Access-Control-Allow-Origin': ORIGINS.includes(o) || isLocal(o) ? o : ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
})

async function sha(s: string) {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}
const randomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
const randomToken = () => {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 0888 123 456 · +359 888 123 456 · 00359… → +359888123456; иначе null. */
export function normalizePhone(raw: unknown): string | null {
  let s = String(raw ?? '').replace(/[\s\-().]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (/^0[0-9]{8,9}$/.test(s)) s = '+359' + s.slice(1)
  if (/^359[0-9]{8,9}$/.test(s)) s = '+' + s
  // Мобилните в България: 087x, 088x, 089x, 098x, 099x.
  return /^\+359(8[789]|9[89])[0-9]{7}$/.test(s) ? s : null
}

async function sendSms(phone: string, text: string): Promise<string | null> {
  if (SMS === 'twilio') {
    const sid = env('TWILIO_ACCOUNT_SID'), tok = env('TWILIO_AUTH_TOKEN')
    const from = env('TWILIO_FROM'), svc = env('TWILIO_MESSAGING_SERVICE_SID')
    if (!sid || !tok || (!from && !svc)) return 'twilio: липсват ключове'
    const form = new URLSearchParams({ To: phone, Body: text })
    if (svc) form.set('MessagingServiceSid', svc); else form.set('From', from)
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${tok}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    if (!r.ok) return `twilio ${r.status}: ${(await r.text()).slice(0, 300)}`
    return null
  }
  return null // test: нищо не се праща
}

async function openDoor(): Promise<string | null> {
  if (DOOR === 'shelly') {
    // Shelly Cloud Control API v2 — релето се включва и само се изключва след 3 с.
    // Непроверено с истинско устройство (27.11): пробва се, когато релето е на бюрото.
    const server = env('SHELLY_SERVER'), key = env('SHELLY_AUTH_KEY'), id = env('SHELLY_DEVICE_ID')
    if (!server || !key || !id) return 'shelly: липсват ключове'
    const r = await fetch(`https://${server}/v2/devices/api/set/switch?auth_key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, channel: 0, on: true, toggle_after: 3 }),
    })
    if (!r.ok) return `shelly ${r.status}: ${(await r.text()).slice(0, 200)}`
    return null
  }
  return null // sim: вратата „се отваря“ само на екрана
}

type Out = { status: number; [k: string]: unknown }

async function start(body: Record<string, unknown>, ipHash: string): Promise<Out> {
  const phone = normalizePhone(body.phone)
  if (!phone) return { status: 400, error: 'Това не прилича на български мобилен номер.' }
  if (body.terms !== true) return { status: 400, error: 'Нужно е да приемеш правилата.' }

  const since = (ms: number) => new Date(Date.now() - ms).toISOString()
  const [perPhone, perIp, perDay] = await Promise.all([
    db.from('zs_otp').select('id', { count: 'exact', head: true }).eq('phone', phone).gt('created_at', since(15 * 60e3)),
    db.from('zs_otp').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gt('created_at', since(3600e3)),
    db.from('zs_otp').select('id', { count: 'exact', head: true }).gt('created_at', since(24 * 3600e3)),
  ])
  if ((perPhone.count ?? 0) >= 3) return { status: 429, error: 'Три кода за 15 минути. Изчакай малко.' }
  if ((perIp.count ?? 0) >= 10) return { status: 429, error: 'Много опити оттук. Опитай пак след час.' }
  if ((perDay.count ?? 0) >= DAILY_CAP) {
    console.error('zs-access: дневният таван на SMS е стигнат', DAILY_CAP)
    return { status: 503, error: 'Входът с код временно не работи. Обади се на телефона на вратата.' }
  }

  const code = randomCode()
  const { error } = await db.from('zs_otp').insert({
    phone, code_hash: await sha(`${PEPPER}:${phone}:${code}`), ip_hash: ipHash,
    expires_at: new Date(Date.now() + 10 * 60e3).toISOString(), channel: SMS, test: TEST,
  })
  if (error) return { status: 500, error: 'Не се записа. Опитай пак.' }

  const fail = await sendSms(phone, `Кодът ти за вратата: ${code}. Важи 10 минути.`)
  if (fail) {
    console.error('zs-access sms', fail)
    return { status: 502, error: 'SMS-ът не тръгна. Опитай пак след минута.' }
  }
  return { status: 200, ok: true, phone, ...(TEST ? { test_code: code } : {}) }
}

async function verify(body: Record<string, unknown>, ua: string): Promise<Out> {
  const phone = normalizePhone(body.phone)
  const code = String(body.code ?? '').replace(/\D/g, '')
  if (!phone || code.length !== 6) return { status: 400, error: 'Кодът е 6 цифри.' }

  const { data: otp } = await db.from('zs_otp').select('id, code_hash, attempts, expires_at, used_at, test')
    .eq('phone', phone).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!otp || otp.used_at || new Date(otp.expires_at) < new Date()) {
    return { status: 400, error: 'Кодът е изтекъл. Поискай нов.' }
  }
  if (otp.attempts >= 5) return { status: 429, error: 'Много грешни опити. Поискай нов код.' }
  if ((await sha(`${PEPPER}:${phone}:${code}`)) !== otp.code_hash) {
    await db.from('zs_otp').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    return { status: 400, error: 'Грешен код.' }
  }
  await db.from('zs_otp').update({ used_at: new Date().toISOString() }).eq('id', otp.id)

  const { data: cust, error: ce } = await db.from('zs_customers')
    .upsert({ phone, terms_version: TERMS_VERSION, terms_at: new Date().toISOString(), test: otp.test }, { onConflict: 'phone' })
    .select('id, blocked').single()
  if (ce || !cust) return { status: 500, error: 'Не се записа. Опитай пак.' }
  if (cust.blocked) return { status: 403, error: 'Достъпът за този номер е спрян.' }

  const token = randomToken()
  const { error: de } = await db.from('zs_devices').insert({
    customer_id: cust.id, token_hash: await sha(token), user_agent: ua.slice(0, 300),
  })
  if (de) return { status: 500, error: 'Не се записа. Опитай пак.' }
  return { status: 200, ok: true, token }
}

async function open(body: Record<string, unknown>): Promise<Out> {
  const token = String(body.token ?? '')
  if (token.length < 20) return { status: 401, error: 'Телефонът не е разпознат. Влез с номер.' }
  const { data: dev } = await db.from('zs_devices')
    .select('id, revoked_at, customer:zs_customers(id, blocked)').eq('token_hash', await sha(token)).maybeSingle()
  // deno-lint-ignore no-explicit-any
  const cust = (dev as any)?.customer
  if (!dev || dev.revoked_at || !cust) return { status: 401, error: 'Телефонът не е разпознат. Влез с номер.' }
  if (cust.blocked) {
    await db.from('zs_entries').insert({ customer_id: cust.id, device_id: dev.id, ok: false, door: DOOR, reason: 'blocked' })
    return { status: 403, error: 'Достъпът за този номер е спрян.' }
  }

  // Едно отваряне на 5 секунди от един телефон — двойното докосване не е две влизания.
  const { data: last } = await db.from('zs_entries').select('created_at').eq('device_id', dev.id).eq('ok', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (last && Date.now() - new Date(last.created_at).getTime() < 5000) return { status: 200, ok: true, door: DOOR, repeat: true }

  const fail = await openDoor()
  await db.from('zs_entries').insert({ customer_id: cust.id, device_id: dev.id, ok: !fail, door: DOOR, reason: fail })
  await db.from('zs_devices').update({ last_used_at: new Date().toISOString() }).eq('id', dev.id)
  if (fail) {
    console.error('zs-access door', fail)
    return { status: 502, error: 'Вратата не отговаря. Опитай пак или се обади на телефона на вратата.' }
  }
  return { status: 200, ok: true, door: DOOR }
}

async function forget(body: Record<string, unknown>): Promise<Out> {
  const token = String(body.token ?? '')
  if (token) await db.from('zs_devices').update({ revoked_at: new Date().toISOString() }).eq('token_hash', await sha(token))
  return { status: 200, ok: true }
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin') ?? '')
  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers })
  try {
    const body = await req.json()
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const ipHash = await sha(PEPPER + ip)
    const ua = req.headers.get('user-agent') ?? ''
    let out: Out
    switch (body.action) {
      case 'status': out = { status: 200, ok: true, sms: SMS, door: DOOR }; break
      case 'start': out = await start(body, ipHash); break
      case 'verify': out = await verify(body, ua); break
      case 'open': out = await open(body); break
      case 'forget': out = await forget(body); break
      default: out = { status: 400, error: 'action' }
    }
    const { status, ...rest } = out
    return new Response(JSON.stringify({ ...rest, mode: { sms: SMS, door: DOOR } }), { status, headers })
  } catch (e) {
    console.error('zs-access', e)
    return new Response(JSON.stringify({ error: 'Нещо се обърка. Опитай пак след малко.' }), { status: 500, headers })
  }
})
