import { createClient } from 'npm:@supabase/supabase-js@2'
import { enrich, iso, lidlCampaigns, parseKaufland, parseLidl, unique, type Offer, type RawOffer } from './parse.ts'

/**
 * Седмичните оферти на Lidl и Kaufland.
 *
 * Вика се всяка сутрин от разписанието (fire_offers_sync, x-bot-secret).
 * Чете страниците с офертите — те са обикновен HTML, не брошура-картинка —
 * разпознава храните по име и записва в store_offers каквото носи макроси:
 * колко грама протеин, въглехидрати или мазнини дава всяко евро.
 *
 * Модел не се вика: разчитането и сметката са в parse.ts и не струват нищо.
 *
 * ?dry=1 — чете и смята, нищо не записва; връща броевете и по няколко реда
 * от всеки магазин. Така се вижда дали магазинът е сменил страницата си.
 *
 * Всяко пускане оставя ред в store_offer_runs на магазин: колко оферти е
 * видял и колко са храни. Нула видени значи, че страницата е сменена —
 * парсерът не се чупи шумно, просто спира да намира.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bot-secret',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36',
  'Accept-Language': 'bg-BG,bg;q=0.9',
}

const KAUFLAND = 'https://www.kaufland.bg/aktualni-predlozheniya/oferti.html'
const LIDL = 'https://www.lidl.bg'

/* Кампаниите на Lidl са към двайсет. Таванът е за деня, в който началната
   страница изведнъж води към двеста — тогава по-добре част, отколкото
   функция, която не свършва навреме. */
const LIDL_MAX_PAGES = 30

/* Колко назад се пазят изтеклите оферти. Цените от миналите седмици един
   ден ще кажат кое е наистина намаление и кое — обичайната цена с червен
   етикет. */
const KEEP_DAYS = 60

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function page(url: string) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
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

async function kaufland(today: Date): Promise<RawOffer[]> {
  return parseKaufland(await page(KAUFLAND), today)
}

async function lidl(today: Date): Promise<RawOffer[]> {
  const home = await page(LIDL + '/')
  const rows = parseLidl(home, today)
  const queue = lidlCampaigns(home).slice(0, LIDL_MAX_PAGES)
  /* По четири наведнъж: бързо за нас, учтиво към тях. Една паднала кампания
     не спира останалите. */
  while (queue.length) {
    const batch = queue.splice(0, 4)
    const got = await Promise.allSettled(batch.map(p => page(LIDL + p)))
    for (const g of got) {
      if (g.status === 'fulfilled') rows.push(...parseLidl(g.value, today))
      else console.error(String(g.reason).slice(0, 200))
    }
  }
  return unique(rows)
}

/* За ?dry=1: всеки разпознат ред и какво е станал, и онези, които не са
   разпознати — по тях се вижда коя храна липсва в таблицата. */
const line = (o: Offer) => `${o.food} ← ${o.name}${o.detail ? ` (${o.detail})` : ''} · ${o.pack ?? '?'} · ${o.price} € · ${o.macro ?? '—'} ${o.per_eur ?? '—'}`
const missed = (raw: RawOffer[], kept: Offer[]) => {
  const got = new Set(kept.map(o => o.ext_id))
  return raw.filter(r => !got.has(r.ext_id)).map(r => `${r.name}${r.detail ? ` (${r.detail})` : ''}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'not configured' }, 500)
  const admin = createClient(url, key)

  const given = req.headers.get('x-bot-secret')
  if (!given || given !== await expectedSecret(admin)) return json({ error: 'unauthorized' }, 401)

  const dry = new URL(req.url).searchParams.get('dry') === '1'
  const today = new Date()
  const report: Record<string, unknown> = {}

  for (const [store, read] of [['kaufland', kaufland], ['lidl', lidl]] as const) {
    let raw: RawOffer[] = []
    let error: string | null = null
    try { raw = await read(today) } catch (e) { error = String(e).slice(0, 300) }

    const kept = unique(raw.map(enrich).filter((o): o is Offer => o !== null))
    report[store] = {
      found: raw.length,
      kept: kept.length,
      error,
      ...(dry ? { rows: kept.map(line).sort(), missed: missed(raw, kept) } : {}),
    }
    if (dry) continue

    if (kept.length) {
      const { error: upErr } = await admin.from('store_offers')
        .upsert(kept.map(o => ({ ...o, seen_at: new Date().toISOString() })), { onConflict: 'store,ext_id,valid_from' })
      if (upErr) error = (error ? error + '; ' : '') + upErr.message
    }
    await admin.from('store_offer_runs').insert({ store, found: raw.length, kept: kept.length, error })
  }

  if (!dry) {
    const cutoff = new Date(today)
    cutoff.setUTCDate(cutoff.getUTCDate() - KEEP_DAYS)
    await admin.from('store_offers').delete().lt('valid_to', iso(cutoff))
    await admin.from('store_offer_runs').delete().lt('at', cutoff.toISOString())
  }

  return json({ dry, ...report })
})
