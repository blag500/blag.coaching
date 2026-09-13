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

/* Кой ред на рязане е ползван.
   Влиза в отпечатъка, защото „непроменен файл" значи „нищо ново за правене" —
   а смени ли се начинът на рязане, старите парчета стават стари, макар файлът
   да е същият. Без това пресинхронизацията след поправка тихо не прави нищо:
   точно така първият опит след махането на челния блок прескочи и деветте
   бележки. */
const CHUNKER = 'v2-без-челен-блок'

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

  /* Челният блок на Obsidian се маха.
     Той е заглавие, етикети и дата — низ, гъст откъм теми и беден откъм
     смисъл. Оставен вътре, той става парче, което печели търсенето пред
     истинския текст: на въпрос за съня първо излизаше „tags: [j3u, recovery,
     sleep...]" вместо самите препоръки за сън. */
  const body0 = text.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  const lines = body0.split(/\r?\n/)

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

/* Очакваната тайна се чете от базата, не от настройките.
 *
 * Дотук тя стоеше на две места — в `REMINDER_SECRET` и изписана вътре в
 * `reminder_url()` — и смяната ѝ значеше две смени. Сменена наполовина, тя
 * спира сутрешните напомняния тихо, до първата сутрин, в която някой забележи,
 * че ги няма.
 *
 * Сега живее на едно място и се ражда там: `gen_random_uuid()` в базата. Никой
 * не я въвежда и никой не я вижда — смяната е един ред SQL без стойност в него.
 * Старият начин остава като запасен, за да не падне нищо, ако някой ден
 * таблицата я няма.
 */
// deno-lint-ignore no-explicit-any
async function expectedSecret(admin: any) {
  try {
    const { data } = await admin.from('app_secrets')
      .select('value').eq('name', 'reminder').maybeSingle()
    if (data?.value) return data.value as string
  } catch { /* пада на запасния */ }
  return Deno.env.get('REMINDER_SECRET') ?? null
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
  const secret = await expectedSecret(admin)
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
  const sum = await digest(CHUNKER + text)
  if (origin && !Number(body?.offset)) {
    const { data: seen } = await admin.from('bot_knowledge')
      .select('digest').eq('owner_id', uid).eq('origin', origin).limit(1).maybeSingle()
    if (seen?.digest === sum) return json({ ok: true, skipped: true, reason: 'непроменен' })
    await admin.from('bot_knowledge').delete().eq('owner_id', uid).eq('origin', origin)
  }

  const pieces = chunk(text)
  if (!pieces.length) return json({ error: 'nothing to store' }, 400)

  /* На порции по шест.
   *
   * Цял файл наведнъж вдига грешка 546 — крайната функция е с таван на паметта
   * и моделът за вграждане, пуснат трийсет пъти в едно повикване, го опира.
   * Видя се на първото истинско качване: малките бележки минаха, а всички над
   * осем килобайта паднаха.
   *
   * Затова: обажда се пак, с отместване, докато свърши. Триенето на старото
   * става само на първото повикване — иначе всяка порция би трила писаното от
   * предната. */
  const from = Math.max(0, Number(body?.offset) || 0)
  /* Три, не шест. При шест най-дългата бележка още опираше тавана (546, после
     503) — а порция от три минава и при най-тежкия файл. Разликата в общото
     време е няколко секунди на бележка и се плаща веднъж. */
  const slice = pieces.slice(from, from + 3)

  const rows = []
  for (const piece of slice) {
    /* Заглавието влиза във вградяването заедно с тялото: то е половината от
       това, за което говори парчето. */
    const embedding = await embed(`${piece.title}\n${piece.body}`.slice(0, 2000))
    rows.push({
      owner_id: uid, source,
      title: piece.title || null,
      body: piece.body,
      scope, client_id: clientId,
      origin,
      /* Отпечатъкът се слага чак накрая, на последната порция.
         Иначе паднало наполовина качване оставя редове с верен отпечатък и
         следващото пускане го смята за готово — файлът остава наполовина в
         базата завинаги, а скриптът докладва „прескочен". Точно това стана с
         най-дългата бележка. */
      digest: null,
      embedding,
    })
  }

  const { error } = await admin.from('bot_knowledge').insert(rows)
  if (error) return json({ error: error.message }, 500)

  const next = from + slice.length
  const done = next >= pieces.length
  if (done && origin) {
    await admin.from('bot_knowledge')
      .update({ digest: sum }).eq('owner_id', uid).eq('origin', origin)
  }

  return json({
    ok: true,
    chunks: rows.length,
    total: pieces.length,
    done,
    next,
  })
})
