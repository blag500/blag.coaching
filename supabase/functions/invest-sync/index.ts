import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Снимката на сметката в Trading 212.
 *
 * Вика се всеки час от разписанието (fire_invest_sync, x-bot-secret) и на
 * ръка от бутона „Обнови" на /invest/ (входът на собственика). И в двата
 * случая прави едно и също:
 *
 * 1. Сметка и позиции → един ред в invest_snapshots.
 * 2. Дивиденти, движения на пари и изпълнени поръчки → invest_dividends,
 *    invest_transactions, invest_orders.
 *    Новото отгоре докато се появи вече видяно; старата история — на части,
 *    от курсора в invest_sync_state, докато свърши.
 *
 * Ключът е в тайните на функциите: T212_API_KEY и T212_API_SECRET. Той има
 * само права за четене — функцията не може да купи или продаде нищо, дори
 * да поиска.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HOST = 'https://live.trading212.com'

/* Шест страници в минута на историята. Пет на пускане за всеки вид оставя
   една резервна и никога не чака лимита. */
const PAGES_PER_RUN = 5

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

class T212Error extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function t212(auth: string) {
  return async (path: string) => {
    const res = await fetch(HOST + path, { headers: { Authorization: auth } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new T212Error(res.status, `${path} → ${res.status} ${text.slice(0, 200)}`)
    }
    return res.json()
  }
}

// deno-lint-ignore no-explicit-any
async function expectedSecret(admin: any) {
  try {
    const { data } = await admin.from('app_secrets')
      .select('value').eq('name', 'reminder').maybeSingle()
    if (data?.value) return data.value as string
  } catch { /* пада на запасния */ }
  return Deno.env.get('REMINDER_SECRET') ?? null
}

/* Разписанието носи тайната; бутонът носи входа на собственика. */
// deno-lint-ignore no-explicit-any
async function allowed(req: Request, admin: any) {
  const given = req.headers.get('x-bot-secret')
  if (given) return given === await expectedSecret(admin)

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  const { data } = await admin.auth.getUser(token)
  const uid = data?.user?.id
  if (!uid) return false
  const { data: owner } = await admin.from('invest_owner')
    .select('user_id').eq('user_id', uid).maybeSingle()
  return !!owner
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

// deno-lint-ignore no-explicit-any
function compactPosition(p: any) {
  const w = p.walletImpact ?? {}
  return {
    ticker:   p.instrument?.ticker ?? null,
    name:     p.instrument?.name ?? p.instrument?.ticker ?? null,
    isin:     p.instrument?.isin ?? null,
    currency: p.instrument?.currency ?? null,   // валутата на цената
    qty:      n(p.quantity),
    avg:      n(p.averagePricePaid),
    price:    n(p.currentPrice),
    value:    n(w.currentValue),                // във валутата на сметката
    cost:     n(w.totalCost),
    pnl:      n(w.unrealizedProfitLoss),
    fx:       n(w.fxImpact),
    opened:   p.createdAt ?? null,
  }
}

// deno-lint-ignore no-explicit-any
const dividendRow = (d: any) => ({
  reference:       d.reference,
  paid_on:         d.paidOn,
  ticker:          d.ticker ?? d.instrument?.ticker ?? null,
  name:            d.instrument?.name ?? d.ticker ?? null,
  quantity:        d.quantity ?? null,
  amount:          n(d.amount),
  currency:        d.currency ?? null,
  gross_per_share: d.grossAmountPerShare ?? null,
  type:            d.type ?? null,
})

// deno-lint-ignore no-explicit-any
const transactionRow = (t: any) => ({
  reference: t.reference,
  at:        t.dateTime,
  type:      t.type,
  amount:    n(t.amount),
  currency:  t.currency ?? null,
})

/* Изпълнената поръчка: какво, колко, и какво е оставила в сметката —
   реализираната печалба и таксите. Неизпълнените нямат запис (няма fill). */
// deno-lint-ignore no-explicit-any
const orderRow = (h: any) => {
  const o = h.order ?? {}
  const f = h.fill ?? {}
  const w = f.walletImpact ?? {}
  // deno-lint-ignore no-explicit-any
  const taxes: any[] = Array.isArray(w.taxes) ? w.taxes : []
  return {
    reference: o.id != null ? String(o.id) : null,
    at:        f.filledAt ?? o.createdAt,
    ticker:    o.ticker ?? o.instrument?.ticker ?? null,
    name:      o.instrument?.name ?? o.ticker ?? null,
    side:      o.side ?? null,
    quantity:  f.quantity ?? o.filledQuantity ?? null,
    price:     f.price ?? null,
    currency:  w.currency ?? null,
    net_value: w.netValue ?? null,
    realized:  n(w.realisedProfitLoss),
    fees:      taxes.reduce((sum, t) => sum + Math.abs(n(t.quantity)), 0),
    fee_items: taxes.length ? taxes.map((t) => ({ name: t.name, quantity: t.quantity, currency: t.currency })) : null,
    status:    o.status ?? null,
  }
}

const KINDS = {
  dividends:    { table: 'invest_dividends',    path: 'dividends',    row: dividendRow },
  transactions: { table: 'invest_transactions', path: 'transactions', row: transactionRow },
  orders:       { table: 'invest_orders',       path: 'orders',       row: orderRow },
} as const
type Kind = keyof typeof KINDS

/* Един вид история: новото отгоре, после старото от курсора. */
async function syncHistory(
  // deno-lint-ignore no-explicit-any
  admin: any,
  get: (p: string) => Promise<any>,
  kind: Kind,
) {
  const { table, row: toRow } = KINDS[kind]
  const first = `/api/v0/equity/history/${KINDS[kind].path}?limit=50`
  let budget = PAGES_PER_RUN
  let added = 0

  // deno-lint-ignore no-explicit-any
  const store = async (items: any[]) => {
    // deno-lint-ignore no-explicit-any
    const rows = items.map((i) => (toRow as (x: any) => any)(i)).filter((r) => r.reference && r.at)
    if (!rows.length) return 0
    const refs = rows.map((r) => r.reference)
    const { data: known } = await admin.from(table).select('reference').in('reference', refs)
    const fresh = rows.length - (known?.length ?? 0)
    const { error } = await admin.from(table).upsert(rows, { onConflict: 'reference' })
    if (error) throw new Error(`${table}: ${error.message}`)
    added += fresh
    return fresh
  }

  const { data: state } = await admin.from('invest_sync_state')
    .select('cursor, done').eq('kind', kind).maybeSingle()

  // Новото: докато страницата носи нещо невиждано.
  let path: string | null = first
  while (path && budget > 0) {
    budget--
    const page = await get(path)
    const fresh = await store(page.items ?? [])
    // Първото пускане: цялата история е нова — тук спира по бюджет, а
    // курсорът продължава оттам при следващото.
    if (!state) {
      path = page.nextPagePath ?? null
      await admin.from('invest_sync_state').upsert({
        kind, cursor: path, done: !path, updated_at: new Date().toISOString(),
      })
      if (!path) return added
      continue
    }
    if (fresh < (page.items?.length ?? 0) || !page.nextPagePath) break
    path = page.nextPagePath
  }

  // Старото: от курсора, докато свърши.
  if (state && !state.done) {
    let cursor: string | null = state.cursor ?? first
    while (cursor && budget > 0) {
      budget--
      const page = await get(cursor)
      await store(page.items ?? [])
      cursor = page.nextPagePath ?? null
    }
    await admin.from('invest_sync_state').upsert({
      kind, cursor, done: !cursor, updated_at: new Date().toISOString(),
    })
  }
  return added
}

/* ── Сигнали за микропокупка (146) ─────────────────────────────────────────
   Добавка към редовната вноска, не замяна. Нищо не се купува: ключът е само
   за четене, писмото е напомняне. */

const DIP_TICKER = /^VUSA/
const STEP_PCT = 2                    // ниво на всеки −2 % от 30-дневния връх
const STEP_AMOUNTS = [5, 10, 15]      // −2 %, −4 %, −6 % и надолу
const DAY_PCT = 1.5                   // спад за 24 часа
const DAY_AMOUNT = 5
const DIP_EMAIL = Deno.env.get('INVEST_OWNER_EMAIL')?.trim() || 'nikolay.blagyov@gmail.com'

const r1 = (x: number) => Math.round(x * 10) / 10
const bg = (x: number, d = 2) => x.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−')
const day = (iso: string) => new Date(iso).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Sofia' })

type Dip = { kind: 'step' | 'day'; level: number; ref_price: number; ref_at: string; drop_pct: number; amount_eur: number }

// deno-lint-ignore no-explicit-any
async function checkDips(admin: any, positions: any[]) {
  const pos = positions.find((p) => p.ticker && DIP_TICKER.test(p.ticker))
  if (!pos?.price) return null
  const ticker: string = pos.ticker, price: number = pos.price

  // Сегашната снимка вече е записана, така че е в редицата.
  const { data: snaps, error } = await admin.from('invest_snapshots')
    .select('taken_at, positions')
    .gte('taken_at', new Date(Date.now() - 30 * 864e5).toISOString())
    .not('positions', 'is', null)
    .order('taken_at')
  if (error) throw new Error(`dips: ${error.message}`)
  // deno-lint-ignore no-explicit-any
  const series = (snaps ?? []).map((s: any) => ({ at: s.taken_at as string, price: n((s.positions ?? []).find((p: any) => p.ticker === ticker)?.price) }))
    .filter((x: { price: number }) => x.price > 0)
  if (!series.length) return null

  // Върхът — последното му срещане, за да почне наново след нов връх.
  const peak = series.reduce((a: { price: number }, b: { price: number }) => (b.price >= a.price ? b : a))
  const drop = (price / peak.price - 1) * 100
  const level = Math.floor(-drop / STEP_PCT + 1e-9)
  const dips: Dip[] = []

  if (level >= 1) {
    const { data: last } = await admin.from('invest_dip_signals').select('level')
      .eq('ticker', ticker).eq('kind', 'step').eq('ref_at', peak.at)
      .order('level', { ascending: false }).limit(1)
    if ((last?.[0]?.level ?? 0) < level) {
      dips.push({ kind: 'step', level, ref_price: peak.price, ref_at: peak.at, drop_pct: r1(drop), amount_eur: STEP_AMOUNTS[Math.min(level, STEP_AMOUNTS.length) - 1] })
    }
  }

  const before = [...series].reverse().find((x: { at: string }) => Date.parse(x.at) <= Date.now() - 24 * 3600e3)
  if (before) {
    const d = (price / before.price - 1) * 100
    if (d <= -DAY_PCT) {
      const { data: recent } = await admin.from('invest_dip_signals').select('id')
        .eq('ticker', ticker).eq('kind', 'day')
        .gte('at', new Date(Date.now() - 20 * 3600e3).toISOString()).limit(1)
      if (!recent?.length) dips.push({ kind: 'day', level: 0, ref_price: before.price, ref_at: before.at, drop_pct: r1(d), amount_eur: DAY_AMOUNT })
    }
  }

  let emailed = false
  if (dips.length) {
    const low = series.reduce((a: { price: number }, b: { price: number }) => (b.price <= a.price ? b : a))
    const nextLevel = Math.max(level, 0) + 1
    // Покупките на VUSA за 30 дни — дали сигналите реално се следват.
    const { data: orders } = await admin.from('invest_orders').select('net_value')
      .eq('ticker', ticker).eq('side', 'BUY')
      .gte('at', new Date(Date.now() - 30 * 864e5).toISOString())
    emailed = await mailDips({
      ticker, price, at: new Date().toISOString(), cur: ({ EUR: '€', GBP: '£', USD: '$' } as Record<string, string>)[pos.currency] ?? (pos.currency ?? ''),
      peak, low, before: before ?? null, dips, pos,
      next: { pct: -nextLevel * STEP_PCT, price: peak.price * (1 - nextLevel * STEP_PCT / 100), amount: STEP_AMOUNTS[Math.min(nextLevel, STEP_AMOUNTS.length) - 1] },
      buys: { n: orders?.length ?? 0, sum: (orders ?? []).reduce((s: number, o: { net_value: number }) => s + Math.abs(n(o.net_value)), 0) },
    })
  }
  for (const s of dips) {
    const { error: e } = await admin.from('invest_dip_signals').insert({ ticker, price, ...s, emailed })
    if (e) throw new Error(`invest_dip_signals: ${e.message}`)
  }
  return { ticker, price, peak: peak.price, drop: r1(drop), sent: dips.map((s) => s.kind === 'step' ? `step ${s.level}` : 'day'), emailed }
}

type Point = { price: number; at: string }
export type DipMail = {
  ticker: string; price: number; at: string; cur: string
  peak: Point; low: Point; before: Point | null; dips: Dip[]
  pos: { qty: number; avg: number; value: number; pnl: number }
  next: { pct: number; price: number; amount: number }
  buys: { n: number; sum: number }
}

const pct = (a: number, b: number) => `${a >= b ? '+' : ''}${bg((a / b - 1) * 100, 1)} %`
const when = (iso: string) => new Date(iso).toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' })

/* Писмото — чиста функция, за да се гледа с истински числа без да се праща. */
export function dipMail(m: DipMail) {
  const t = m.ticker.replace(/[a-z]?_[A-Z]+$/, '')   // VUSAl_EQ → VUSA (вътрешното име в Trading 212)
  const c = m.cur
  const top = m.dips.reduce((a, b) => (b.amount_eur > a.amount_eur ? b : a))
  const subject = `${t} ${bg(top.drop_pct, 1)} % ${top.kind === 'step' ? 'от върха' : 'за денонощие'} — микропокупка ${top.amount_eur} €?`
  const row = (k: string, v: string, note: string, strong = false) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#555">${k}</td><td style="padding:6px 12px 6px 0;text-align:right;${strong ? 'font-weight:700;font-size:18px' : ''}">${v}</td><td style="padding:6px 0;color:#555">${note}</td></tr>`
  const why = (s: Dip) => s.kind === 'step'
    ? `цената е ${bg(Math.abs(s.drop_pct), 1)} % под върха за 30 дни`
    : `цената е ${bg(Math.abs(s.drop_pct), 1)} % под тази отпреди 24 часа`
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#12140F;max-width:520px">`
    + `<p style="font-size:17px;margin:0 0 12px"><b>${t}</b></p>`
    + `<table style="border-collapse:collapse">`
    + row('Сега', `${bg(m.price)} ${c}`, when(m.at), true)
    + row('Връх за 30 дни', `${bg(m.peak.price)} ${c}`, `${day(m.peak.at)} · сега ${pct(m.price, m.peak.price)}`)
    + row('Дъно за 30 дни', `${bg(m.low.price)} ${c}`, `${day(m.low.at)} · сега ${pct(m.price, m.low.price)}`)
    + (m.before ? row('Преди 24 часа', `${bg(m.before.price)} ${c}`, `сега ${pct(m.price, m.before.price)}`) : '')
    + `</table>`
    + m.dips.map((s) => `<p style="margin:16px 0 0">Предложение: <b>купи за ${s.amount_eur} €</b>, защото ${why(s)}.</p>`).join('')
    + `<p style="margin:8px 0 0">Следващ сигнал: под <b>${bg(m.next.price)} ${c}</b> (${bg(m.next.pct, 0)} % от върха) → ${m.next.amount} €.</p>`
    + (m.pos.qty ? `<p style="margin:16px 0 0;color:#555">Позицията ти: ${bg(m.pos.qty, 4)} дяла по средно ${bg(m.pos.avg)} ${c} · стойност ${bg(m.pos.value)} € · печалба ${m.pos.pnl >= 0 ? '+' : ''}${bg(m.pos.pnl)} € (с курса на валутата)</p>` : '')
    + `<p style="margin:4px 0 0;color:#555">Покупки на ${t} за 30 дни: ${m.buys.n ? `${m.buys.n} за ${bg(m.buys.sum)} €` : 'няма'}</p>`
    + `<p style="margin:16px 0 0;color:#888;font-size:13px">Добавка към редовната вноска, не замяна. Нищо не е купено автоматично. <a href="https://blag-coaching.com/invest/" style="color:#888">Таблото</a></p>`
    + `</div>`
  return { subject, html }
}

async function mailDips(m: DipMail) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return false
  const { subject, html } = dipMail(m)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Инвестиции <noreply@blag-coaching.com>', to: [DIP_EMAIL], subject, html }),
  }).catch((e) => { console.error('dips mail', e); return null })
  return !!res?.ok
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'not configured' }, 500)
  const admin = createClient(url, key)

  if (!await allowed(req, admin)) return json({ error: 'unauthorized' }, 401)

  const apiKey    = Deno.env.get('T212_API_KEY')
  const apiSecret = Deno.env.get('T212_API_SECRET')
  if (!apiKey || !apiSecret) return json({ error: 'missing T212_API_KEY / T212_API_SECRET' }, 500)
  const get = t212('Basic ' + btoa(`${apiKey}:${apiSecret}`))

  try {
    const summary   = await get('/api/v0/equity/account/summary')
    const positions = await get('/api/v0/equity/positions')

    const snapshot = {
      currency:      summary.currency ?? 'EUR',
      total_value:   n(summary.totalValue),
      current_value: n(summary.investments?.currentValue),
      total_cost:    n(summary.investments?.totalCost),
      unrealized:    n(summary.investments?.unrealizedProfitLoss),
      realized:      n(summary.investments?.realizedProfitLoss),
      cash_free:     n(summary.cash?.availableToTrade),
      cash_in_pies:  n(summary.cash?.inPies),
      cash_reserved: n(summary.cash?.reservedForOrders),
      positions:     (Array.isArray(positions) ? positions : []).map(compactPosition),
    }
    const { error } = await admin.from('invest_snapshots').insert(snapshot)
    if (error) throw new Error(`invest_snapshots: ${error.message}`)

    /* Сигналите за спад (146) — и те не бива да спират снимката. */
    let dips: unknown = null
    try { dips = await checkDips(admin, snapshot.positions) }
    catch (e) { dips = String((e as Error).message ?? e) }

    /* Историята не бива да спира снимката: ако лимитът е изчерпан, снимката
       вече е записана и следващият час ще продължи оттам. */
    const history: Record<string, number | string> = {}
    await Promise.all((Object.keys(KINDS) as Kind[]).map(async (kind) => {
      try { history[kind] = await syncHistory(admin, get, kind) }
      catch (e) { history[kind] = String((e as Error).message ?? e) }
    }))

    await admin.rpc('invest_prune')

    return json({
      ok: true,
      total_value: snapshot.total_value,
      positions: snapshot.positions.length,
      dips,
      history,
    })
  } catch (e) {
    const status = e instanceof T212Error ? 502 : 500
    return json({ error: String((e as Error).message ?? e) }, status)
  }
})
