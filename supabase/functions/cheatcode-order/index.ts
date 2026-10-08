import { createClient } from 'npm:@supabase/supabase-js@2'

/* Поръчка от Чийт Код → ред в cheatcode_orders → известие до собственика.
 *
 * Същата функция отговаря и на `action: 'status'` — за „Моите поръчки“.
 *
 * Страницата е без вход, затова функцията е публична (verify_jwt = false в
 * config.toml) и се пази сама: проверява всяко поле, режe размера и брои
 * поръчките — по телефон и общо за час, за да не може някой да залее
 * телефона на Николай с известия.
 *
 * Цената идва от страницата и не се пресмята тук: менюто живее в
 * cheatcode/page.html. Затова в известието и в реда стои сумата, която
 * клиентът е видял, а Николай я потвърждава при обаждането. */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ORIGINS = [
  'https://blag-coaching.com',
  'https://www.blag-coaching.com',
  'https://blag-coaching.vercel.app',
]

function cors(origin: string | null) {
  const ok = origin && (ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
  return {
    'Access-Control-Allow-Origin': ok ? origin! : ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const int = (v: unknown, lo: number, hi: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null

type Line = { name: string; cfg: string; qty: number; unit: number; kcal: number; p: number; c: number; f: number; allerg: string[] }

/* Редът се преписва поле по поле: каквото не е описано тук, не влиза в базата. */
function cleanLine(raw: any): Line | null {
  if (!raw || typeof raw !== 'object') return null
  const name = str(raw.name, 60)
  const qty = int(raw.qty, 1, 20)
  const unit = int(raw.unit, 100, 5000)
  if (!name || qty === null || unit === null) return null
  return {
    name,
    cfg: str(raw.cfg, 300),
    qty,
    unit,
    kcal: int(raw.kcal, 0, 5000) ?? 0,
    p: int(raw.p, 0, 500) ?? 0,
    c: int(raw.c, 0, 1000) ?? 0,
    f: int(raw.f, 0, 500) ?? 0,
    allerg: Array.isArray(raw.allerg) ? raw.allerg.slice(0, 14).map((a: unknown) => str(a, 30)).filter(Boolean) : [],
  }
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return json({ error: 'method' }, 405, headers)

  const raw = await req.text()
  if (raw.length > 20000) return json({ error: 'Поръчката е твърде голяма.' }, 413, headers)
  let body: any
  try { body = JSON.parse(raw) } catch { return json({ error: 'Поръчката не се прочете.' }, 400, headers) }

  /* „Моите поръчки“: страницата пази кодовете на устройството и пита тук
     докъде са стигнали. Отговор има само ако кодът и телефонът са от една
     и съща поръчка — по код сам не се научава нищо, а назад се връща само
     статусът, не името или телефонът. */
  if (body.action === 'status') {
    const asked = Array.isArray(body.orders) ? body.orders.slice(0, 30) : []
    const pairs = asked
      .map((o: any) => ({ code: str(o?.code, 12), digits: str(o?.phone, 24).replace(/\D/g, '') }))
      .filter((o: { code: string; digits: string }) => o.code && o.digits.length >= 9)
    if (!pairs.length) return json({ orders: [] }, 200, headers)
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data, error } = await db.from('cheatcode_orders')
      .select('code, phone, status').in('code', pairs.map((p: { code: string }) => p.code))
    if (error) {
      console.error('status', error)
      return json({ error: 'Статусът не се прочете.' }, 500, headers)
    }
    const orders = (data ?? [])
      .filter((r: { code: string; phone: string }) =>
        pairs.some((p: { code: string; digits: string }) => p.code === r.code && p.digits === r.phone.replace(/\D/g, '')))
      .map((r: { code: string; status: string }) => ({ code: r.code, status: r.status }))
    return json({ orders }, 200, headers)
  }

  // Капан за ботове: полето е скрито на страницата и човек не го попълва.
  if (str(body.website, 100)) return json({ code: 'ЧК-0000' }, 200, headers)

  const name = str(body.name, 80)
  const phone = str(body.phone, 24)
  const digits = phone.replace(/\D/g, '')
  const when = str(body.when, 5)
  const note = str(body.note, 300)
  if (name.length < 2) return json({ error: 'Трябва ни име, за да те потърсим.' }, 400, headers)
  if (digits.length < 9 || digits.length > 15) return json({ error: 'Телефонът изглежда непълен.' }, 400, headers)
  if (when && !/^[0-2]\d:[0-5]\d$/.test(when)) return json({ error: 'Часът не се прочете.' }, 400, headers)

  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 20) {
    return json({ error: 'Количката е празна.' }, 400, headers)
  }
  const lines = body.lines.map(cleanLine)
  if (lines.some((l: Line | null) => l === null)) return json({ error: 'Ред от поръчката не се прочете.' }, 400, headers)
  const boxes = lines.reduce((n: number, l: Line) => n + l.qty, 0)
  const total = lines.reduce((n: number, l: Line) => n + l.unit * l.qty, 0)
  if (boxes > 40) return json({ error: 'Над 40 кутии се поръчват по телефона.' }, 400, headers)

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const test = body.live !== true

  // Таван: 3 поръчки на телефон за 10 минути и 60 общо за час.
  const since10 = new Date(Date.now() - 10 * 60_000).toISOString()
  const since60 = new Date(Date.now() - 60 * 60_000).toISOString()
  const [{ count: byPhone }, { count: all }] = await Promise.all([
    db.from('cheatcode_orders').select('id', { count: 'exact', head: true }).eq('phone', phone).gte('created_at', since10),
    db.from('cheatcode_orders').select('id', { count: 'exact', head: true }).gte('created_at', since60),
  ])
  if ((byPhone ?? 0) >= 3) return json({ error: 'Вече имаш поръчка от преди малко. Ще ти се обадим.' }, 429, headers)
  if ((all ?? 0) >= 60) return json({ error: 'Сега не приемаме повече поръчки. Опитай след час.' }, 429, headers)

  // Кодът е кратък, за да се казва по телефона. При сблъсък — нов опит.
  let code = ''
  let saved = false
  for (let i = 0; i < 5 && !saved; i++) {
    code = 'ЧК-' + String(1000 + Math.floor(Math.random() * 9000))
    const { error } = await db.from('cheatcode_orders').insert({
      code, name, phone, pickup_time: when || null, note: note || null,
      lines, box_count: boxes, total_cents: total, test,
    })
    if (!error) saved = true
    else if (error.code !== '23505') {
      console.error('insert', error)
      return json({ error: 'Поръчката не се записа. Опитай пак след малко.' }, 500, headers)
    }
  }
  if (!saved) return json({ error: 'Поръчката не се записа. Опитай пак.' }, 500, headers)

  /* Известието е след записа и не решава отговора: ако push-ът падне,
     поръчката пак е в базата, а клиентът пак получава кода си. Резултатът
     обаче се записва в отговора и в лога — без него една тиха грешка
     изглеждаше като успех (send-push 400 на 07.10). */
  let push: number | string = 'no-owner'
  try {
    // Само собственикът: редът носи име и телефон на клиент (виж 126).
    const { data: owners } = await db.from('cheatcode_owner').select('user_id')
    const ids = (owners ?? []).map((o: { user_id: string }) => o.user_id)
    if (ids.length) {
      const what = lines.map((l: Line) => (l.qty > 1 ? l.qty + '× ' : '') + l.name).join(', ')
      const eur = (total / 100).toFixed(2).replace('.', ',') + ' €'
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          toUserIds: ids,
          title: (test ? 'ТЕСТ · ' : '') + 'Чийт Код ' + code,
          body: `${name} · ${phone}${when ? ' · за ' + when : ''}\n${what} · ${eur}`,
          tag: 'cheatcode-order',
        }),
      })
      push = res.status
      if (!res.ok) console.error('push', res.status, await res.text())
    }
  } catch (e) {
    push = 'error'
    console.error('push', e)
  }

  return json({ code, test, push }, 200, headers)
})
