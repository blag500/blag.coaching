import { createClient } from 'npm:@supabase/supabase-js@2'

/* Поръчка от Чийт Код → ред в cheatcode_orders → известие до собственика.
 *
 * Същата функция отговаря и на `action: 'status'` — за „Моите поръчки“ — и
 * на 'link' / 'me' / 'logout' — за поръчките по имейл (миграция 132) — и на
 * 'confirm' — потвърждението от писмото (миграция 133). Поръчката стига до
 * кухнята чак след него.
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

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/* Линкът към поръчките стои в базата само като отпечатък (миграция 132). */
async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Line = { name: string; cfg: string; photo?: string; qty: number; unit: number; kcal: number; p: number; c: number; f: number; allerg: string[] }

/* Редът се преписва поле по поле: каквото не е описано тук, не влиза в базата. */
function cleanLine(raw: any): Line | null {
  if (!raw || typeof raw !== 'object') return null
  const name = str(raw.name, 60)
  const qty = int(raw.qty, 1, 20)
  const unit = int(raw.unit, 100, 5000)
  if (!name || qty === null || unit === null) return null
  // Снимката е за писмото до клиента — само наша, само от /cheatcode/.
  const photo = str(raw.photo, 80)
  return {
    name,
    cfg: str(raw.cfg, 300),
    ...(/^\/cheatcode\/[\w-]+\.(jpe?g|png)$/.test(photo) ? { photo } : {}),
    qty,
    unit,
    kcal: int(raw.kcal, 0, 5000) ?? 0,
    p: int(raw.p, 0, 500) ?? 0,
    c: int(raw.c, 0, 1000) ?? 0,
    f: int(raw.f, 0, 500) ?? 0,
    allerg: Array.isArray(raw.allerg) ? raw.allerg.slice(0, 14).map((a: unknown) => str(a, 30)).filter(Boolean) : [],
  }
}

/* Известието до собственика тръгва при потвърждението, не при поръчката.
   Не решава отговора: ако push-ът падне, поръчката пак е потвърдена.
   Резултатът се записва в лога — без него една тиха грешка изглеждаше като
   успех (send-push 400 на 07.10). Само собственикът: редът носи име и
   телефон на клиент (виж 126). */
async function notifyOwner(db: any, o: any) {
  try {
    const { data: owners } = await db.from('cheatcode_owner').select('user_id')
    const ids = (owners ?? []).map((r: { user_id: string }) => r.user_id)
    if (!ids.length) return 'no-owner'
    const what = (o.lines as Line[]).map((l) => (l.qty > 1 ? l.qty + '× ' : '') + l.name).join(', ')
    const eur = (o.total_cents / 100).toFixed(2).replace('.', ',') + ' €'
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        toUserIds: ids,
        title: (o.test ? 'ТЕСТ · ' : '') + 'Чийт Код ' + o.code,
        body: `${o.name} · ${o.phone}${o.pickup_time ? ' · за ' + o.pickup_time : ''}
${what} · ${eur}`,
        tag: 'cheatcode-order',
      }),
    })
    if (!res.ok) console.error('push', res.status, await res.text())
    return res.status
  } catch (e) {
    console.error('push', e)
    return 'error'
  }
}

const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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
      .select('code, phone, status, confirmed_at').in('code', pairs.map((p: { code: string }) => p.code))
    if (error) {
      console.error('status', error)
      return json({ error: 'Статусът не се прочете.' }, 500, headers)
    }
    const orders = (data ?? [])
      .filter((r: { code: string; phone: string }) =>
        pairs.some((p: { code: string; digits: string }) => p.code === r.code && p.digits === r.phone.replace(/\D/g, '')))
      .map((r: { code: string; status: string; confirmed_at: string | null }) =>
        ({ code: r.code, status: r.status, confirmed: !!r.confirmed_at }))
    return json({ orders }, 200, headers)
  }

  /* „Потвърди поръчката“ от писмото (миграция 133). Едва тук поръчката стига
     до кухнята. Потвърждението връща и ключ за „Моите поръчки“ — телефонът,
     на който е натиснат линкът, вече вижда поръчките по този имейл. */
  if (body.action === 'confirm') {
    const t = str(body.token, 80)
    if (t.length < 20) return json({ error: 'confirm' }, 404, headers)
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: o } = await db.from('cheatcode_orders')
      .select('id, code, name, phone, email, pickup_time, lines, total_cents, test, confirmed_at, status')
      .eq('confirm_hash', await sha256(t)).maybeSingle()
    if (!o) return json({ error: 'confirm' }, 404, headers)
    const already = !!o.confirmed_at
    if (!already) {
      await db.from('cheatcode_orders').update({ confirmed_at: new Date().toISOString() }).eq('id', o.id)
      await notifyOwner(db, o)
    }
    const me = token()
    await db.from('cheatcode_links').insert({ token_hash: await sha256(me), email: o.email })
    return json({
      code: o.code, test: o.test, already, status: o.status, me,
      name: o.name, phone: o.phone, email: o.email,
    }, 200, headers)
  }

  /* Профилът по имейл (миграция 132): „прати ми линк“, „покажи поръчките по
     линка“, „забрави този телефон“. Линкът се праща от cheatcode-mail. */
  if (body.action === 'link') {
    const email = str(body.email, 120).toLowerCase()
    if (!EMAIL.test(email)) return json({ error: 'Имейлът изглежда непълен.' }, 400, headers)
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    // Таван: 3 линка на адрес за 10 минути и 60 общо за час. Над него —
    // мълчаливо „пратено“, за да не става страницата пощенска бомба.
    const since10 = new Date(Date.now() - 10 * 60_000).toISOString()
    const since60 = new Date(Date.now() - 60 * 60_000).toISOString()
    const [{ count: mine }, { count: all }] = await Promise.all([
      db.from('cheatcode_links').select('token_hash', { count: 'exact', head: true }).eq('email', email).gte('created_at', since10),
      db.from('cheatcode_links').select('token_hash', { count: 'exact', head: true }).gte('created_at', since60),
    ])
    if ((mine ?? 0) < 3 && (all ?? 0) < 60) {
      const { data: s } = await db.from('app_secrets').select('value').eq('name', 'reminder').maybeSingle()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cheatcode-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bot-secret': s?.value ?? '' },
        body: JSON.stringify({ kind: 'link', email }),
      })
      if (!res.ok) {
        console.error('link', res.status, await res.text())
        return json({ error: 'Писмото не тръгна. Опитай пак след малко.' }, 502, headers)
      }
    }
    return json({ ok: true }, 200, headers)
  }

  if (body.action === 'me' || body.action === 'logout') {
    const token = str(body.token, 80)
    if (token.length < 20) return json({ error: 'link' }, 401, headers)
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const hash = await sha256(token)
    if (body.action === 'logout') {
      await db.from('cheatcode_links').delete().eq('token_hash', hash)
      return json({ ok: true }, 200, headers)
    }
    const { data: link } = await db.from('cheatcode_links')
      .select('email, expires_at').eq('token_hash', hash).maybeSingle()
    if (!link || new Date(link.expires_at) < new Date()) return json({ error: 'link' }, 401, headers)
    await db.from('cheatcode_links').update({ last_used_at: new Date().toISOString() }).eq('token_hash', hash)
    const { data: rows } = await db.from('cheatcode_orders')
      .select('code, created_at, name, phone, pickup_time, lines, box_count, total_cents, status, test, confirmed_at')
      .eq('email', link.email).order('created_at', { ascending: false }).limit(30)
    const last = rows?.[0]
    return json({
      email: link.email,
      name: last?.name ?? '',
      phone: last?.phone ?? '',
      orders: (rows ?? []).map((r: any) => ({
        code: r.code, at: r.created_at, when: r.pickup_time ?? '', n: r.box_count,
        total: r.total_cents, status: r.status, test: r.test, phone: r.phone, lines: r.lines,
        confirmed: !!r.confirmed_at,
      })),
    }, 200, headers)
  }

  // Капан за ботове: полето е скрито на страницата и човек не го попълва.
  if (str(body.website, 100)) return json({ code: 'ЧК-0000' }, 200, headers)

  const name = str(body.name, 80)
  const phone = str(body.phone, 24)
  const digits = phone.replace(/\D/g, '')
  const when = str(body.when, 5)
  const note = str(body.note, 300)
  // Имейлът е задължителен: поръчката се потвърждава от него (миграция 133).
  const email = str(body.email, 120).toLowerCase()
  if (name.length < 2) return json({ error: 'Трябва ни име, за да те потърсим.' }, 400, headers)
  if (digits.length < 9 || digits.length > 15) return json({ error: 'Телефонът изглежда непълен.' }, 400, headers)
  if (when && !/^[0-2]\d:[0-5]\d$/.test(when)) return json({ error: 'Часът не се прочете.' }, 400, headers)
  if (!email) return json({ error: 'Трябва ни имейл — оттам потвърждаваш поръчката.' }, 400, headers)
  if (!EMAIL.test(email)) return json({ error: 'Имейлът изглежда непълен.' }, 400, headers)

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

  // Таван: 3 поръчки на телефон или имейл за 10 минути и 60 общо за час.
  const since10 = new Date(Date.now() - 10 * 60_000).toISOString()
  const since60 = new Date(Date.now() - 60 * 60_000).toISOString()
  const [{ count: byPhone }, { count: all }, { count: byEmail }] = await Promise.all([
    db.from('cheatcode_orders').select('id', { count: 'exact', head: true }).eq('phone', phone).gte('created_at', since10),
    db.from('cheatcode_orders').select('id', { count: 'exact', head: true }).gte('created_at', since60),
    db.from('cheatcode_orders').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since10),
  ])
  if ((byPhone ?? 0) >= 3 || (byEmail ?? 0) >= 3) return json({ error: 'Вече имаш поръчка от преди малко. Ще ти се обадим.' }, 429, headers)
  if ((all ?? 0) >= 60) return json({ error: 'Сега не приемаме повече поръчки. Опитай след час.' }, 429, headers)

  // Кодът е кратък, за да се казва по телефона. При сблъсък — нов опит.
  let code = ''
  let saved = false
  for (let i = 0; i < 5 && !saved; i++) {
    code = 'ЧК-' + String(1000 + Math.floor(Math.random() * 9000))
    const { error } = await db.from('cheatcode_orders').insert({
      code, name, phone, pickup_time: when || null, note: note || null, email,
      lines, box_count: boxes, total_cents: total, test, confirmed_at: null,
    })
    if (!error) saved = true
    else if (error.code !== '23505') {
      console.error('insert', error)
      return json({ error: 'Поръчката не се записа. Опитай пак след малко.' }, 500, headers)
    }
  }
  if (!saved) return json({ error: 'Поръчката не се записа. Опитай пак.' }, 500, headers)

  /* Поръчката още не е потвърдена: в кухнята не отива нищо, докато
     човекът не натисне „Потвърди поръчката“ в писмото (миграция 133). Писмото
     тръгва от тригера в базата при вписването. */
  return json({ code, test, confirm: true }, 200, headers)
})
