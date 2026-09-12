import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Мозъкът на бота — пълнене и търсене.
 *
 * Тук влиза това, което Николай знае, а приложението не може да измери:
 * методът, по който работи, бележките му от обученията, които е платил,
 * отговорите, които вече е давал. Дотук всеки въпрос от рода на „как се кара
 * пиковата седмица" опираше до общите приказки на модела — а точно по тези
 * въпроси клиентът плаща на треньор, не на приложение.
 *
 * Вгражданията се смятат ТУК, в самата крайна функция, с модела, който
 * Supabase държи вътре (`gte-small`). Значи: без външен ключ, без сметка на
 * знак и без текстът да напуска проекта. За „кое парче говори за това"
 * триста осемдесет и четири числа стигат.
 *
 * Нарязването е по заглавия и после по абзаци. Цяла бележка в едно парче
 * значи, че търсенето връща двайсет страници заради едно изречение в тях;
 * парче по изречение значи, че връща изречение без контекста, който го прави
 * вярно. Осемстотин знака е мярката, на която едно подзаглавие обикновено се
 * събира цяло.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHUNK = 800        // знака, към които се стреми едно парче
const MIN_CHUNK = 120    // под това парчето се слепва със следващото

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

/** Отпечатък на съдържанието: по него се разбира дали файлът е променян. */
async function digest(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).slice(0, 12)
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Реже текста на парчета, които се четат сами.
 *
 * Първо по заглавия (# в markdown) — те са авторовото собствено деление и
 * никое машинно не е по-добро от него. После по абзаци, докато парчето стане
 * прекалено голямо. Заглавието се носи с всяко свое парче: „три дни преди" не
 * значи нищо, ако не се знае, че разделът е „Пикова седмица".
 */
function chunk(text: string) {
  const out: { title: string; body: string }[] = []
  const lines = text.split(/\r?\n/)

  let title = ''
  let buf: string[] = []

  const flush = () => {
    const body = buf.join('\n').trim()
    buf = []
    if (!body) return
    if (body.length <= CHUNK) { out.push({ title, body }); return }

    /* Дълъг раздел се реже по абзаци, а не по знаци: изречение, срязано по
       средата, е парче, което не значи нищо и на никой въпрос не отговаря. */
    let part: string[] = []
    let size = 0
    for (const para of body.split(/\n{2,}/)) {
      if (size + para.length > CHUNK && size >= MIN_CHUNK) {
        out.push({ title, body: part.join('\n\n') })
        part = []; size = 0
      }
      part.push(para)
      size += para.length + 2
    }
    if (part.length) out.push({ title, body: part.join('\n\n') })
  }

  for (const line of lines) {
    const head = line.match(/^(#{1,4})\s+(.*)$/)
    if (head) { flush(); title = head[2].trim(); continue }
    buf.push(line)
  }
  flush()

  return out.filter(c => c.body.replace(/\s/g, '').length >= 20)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'not configured' }, 500)

  const admin = createClient(url, key)

  /* Два пътя навътре.
     Човек от приложението идва с токена си и пълни своето. Но пълненето рядко
     става от телефон — то е „мини цялото хранилище и качи променените бележки",
     тоест скрипт от неговия компютър. Затова и втори път: същата ключалка като
     на нощната обиколка плюс чие е знанието. Тайната стои на сървъра, значи
     знае я само този, който и без това има достъп до всичко. */
  const secret = Deno.env.get('REMINDER_SECRET')
  const given  = req.headers.get('x-bot-secret')

  let uid: string | null = null
  if (secret && given === secret) {
    const body0 = req.clone()
    const asOwner = await body0.json().catch(() => ({}))
    uid = typeof asOwner?.ownerId === 'string' ? asOwner.ownerId : null
    if (!uid && typeof asOwner?.ownerEmail === 'string') {
      const { data } = await admin.from('profiles')
        .select('id').eq('email', asOwner.ownerEmail).maybeSingle()
      uid = data?.id ?? null
    }
    if (!uid) return json({ error: 'missing owner' }, 400)
  } else {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'unauthorized' }, 401)
    const { data: userData, error: authErr } = await admin.auth.getUser(token)
    uid = userData?.user?.id ?? null
    if (authErr || !uid) return json({ error: 'unauthorized' }, 401)
  }

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action ?? 'add')

  // deno-lint-ignore no-explicit-any
  const session = new (globalThis as any).Supabase.ai.Session('gte-small')
  const embed = async (text: string) =>
    await session.run(text, { mean_pool: true, normalize: true }) as number[]

  // ── Търсене ───────────────────────────────────────────────────────────────
  if (action === 'search') {
    const q = String(body?.query ?? '').trim().slice(0, 500)
    if (!q) return json({ error: 'missing query' }, 400)
    const { data, error } = await admin.rpc('match_knowledge', {
      query_embedding: await embed(q),
      owner: uid,
      asker: uid,
      match_count: Math.min(Number(body?.limit) || 5, 10),
    })
    if (error) return json({ error: error.message }, 500)
    return json({ hits: data })
  }

  // ── Изтриване на цял източник ─────────────────────────────────────────────
  if (action === 'forget') {
    const origin = String(body?.origin ?? '')
    const source = String(body?.source ?? '')
    if (!origin && !source) return json({ error: 'missing origin' }, 400)
    const q = admin.from('bot_knowledge').delete().eq('owner_id', uid)
    const { error } = origin ? await q.eq('origin', origin) : await q.eq('source', source)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  // ── Добавяне ──────────────────────────────────────────────────────────────
  const text   = String(body?.text ?? '').trim()
  const source = String(body?.source ?? '').trim().slice(0, 200)
  if (!text || !source) return json({ error: 'missing text or source' }, 400)

  const scope = ['private', 'shared', 'client'].includes(String(body?.scope))
    ? String(body?.scope) : 'private'
  const clientId = scope === 'client' && typeof body?.clientId === 'string' ? body.clientId : null
  const origin = typeof body?.origin === 'string' ? body.origin.slice(0, 400) : null

  /* Непроменен файл не се пипа. Пресинхронизацията на цяло хранилище иначе е
     хиляда вграждания всеки път за нула нови знания. */
  const sum = await digest(text)
  if (origin) {
    const { data: seen } = await admin.from('bot_knowledge')
      .select('digest').eq('owner_id', uid).eq('origin', origin).limit(1).maybeSingle()
    if (seen?.digest === sum) return json({ ok: true, skipped: true, reason: 'непроменен' })
    await admin.from('bot_knowledge').delete().eq('owner_id', uid).eq('origin', origin)
  }

  const pieces = chunk(text)
  if (!pieces.length) return json({ error: 'nothing to store' }, 400)

  const rows = []
  for (const piece of pieces) {
    /* Заглавието влиза във вградяването заедно с тялото: то е половината от
       това, за което говори парчето. */
    const embedding = await embed(`${piece.title}\n${piece.body}`.slice(0, 2000))
    rows.push({
      owner_id: uid, source,
      title: piece.title || null,
      body: piece.body,
      scope, client_id: clientId,
      origin, digest: sum,
      embedding,
    })
  }

  const { error } = await admin.from('bot_knowledge').insert(rows)
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true, chunks: rows.length })
})
