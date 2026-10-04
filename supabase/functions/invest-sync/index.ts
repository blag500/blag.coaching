import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Снимката на сметката в Trading 212.
 *
 * Вика се всеки час от разписанието (fire_invest_sync, x-bot-secret) и на
 * ръка от бутона „Обнови" на /invest/ (входът на собственика). И в двата
 * случая прави едно и също:
 *
 * 1. Сметка и позиции → един ред в invest_snapshots.
 * 2. Дивиденти и движения на пари → invest_dividends, invest_transactions.
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

/* Един вид история: новото отгоре, после старото от курсора. */
async function syncHistory(
  // deno-lint-ignore no-explicit-any
  admin: any,
  get: (p: string) => Promise<any>,
  kind: 'dividends' | 'transactions',
) {
  const table = kind === 'dividends' ? 'invest_dividends' : 'invest_transactions'
  const toRow = kind === 'dividends' ? dividendRow : transactionRow
  const first = `/api/v0/equity/history/${kind}?limit=50`
  let budget = PAGES_PER_RUN
  let added = 0

  // deno-lint-ignore no-explicit-any
  const store = async (items: any[]) => {
    const rows = items.filter((i) => i?.reference).map(toRow)
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

    /* Историята не бива да спира снимката: ако лимитът е изчерпан, снимката
       вече е записана и следващият час ще продължи оттам. */
    const history: Record<string, number | string> = {}
    await Promise.all((['dividends', 'transactions'] as const).map(async (kind) => {
      try { history[kind] = await syncHistory(admin, get, kind) }
      catch (e) { history[kind] = String((e as Error).message ?? e) }
    }))

    await admin.rpc('invest_prune')

    return json({
      ok: true,
      total_value: snapshot.total_value,
      positions: snapshot.positions.length,
      history,
    })
  } catch (e) {
    const status = e instanceof T212Error ? 502 : 500
    return json({ error: String((e as Error).message ?? e) }, status)
  }
})
