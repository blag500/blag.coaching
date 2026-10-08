import { createClient } from 'npm:@supabase/supabase-js@2'

/* Писмата на Чийт Код до клиента.
 *
 *   { id }               — от тригера cheatcode_order_mail (миграции 131, 132):
 *                          „приета“ (с линк към поръчките), „готова“, „отказана“
 *   { kind: 'link', email } — от cheatcode-order, когато човек поиска линк
 *
 * Без вход, затова verify_jwt = false в config.toml — пази се сама с тайната
 * от app_secrets в заглавката x-bot-secret.
 *
 * Статусът се чете наново от базата, не се взима от заявката: между тригера и
 * писмото собственикът може да е върнал поръчката. Изпратеното се записва в
 * `mailed`, за да не тръгне същото писмо втори път. */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const PAGE = 'https://blag-coaching.com/cheatcode/'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const euro = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €'

type Line = { name: string; qty: number; unit: number; cfg?: string; photo?: string }
type Order = {
  id: string; code: string; name: string; email: string | null; status: string; test: boolean
  phone: string; note: string | null; created_at: string
  pickup_time: string | null; lines: Line[]; box_count: number; total_cents: number; mailed: string[]
}

/* Линкът е случаен низ; в базата стои само отпечатъкът му (миграция 132). */
export async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function newLink(db: any, email: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const { error } = await db.from('cheatcode_links').insert({ token_hash: await sha256(token), email })
  if (error) throw error
  return PAGE + '#me=' + token
}

/* ── Видът ──────────────────────────────────────────────────────
   Писмото е страницата в тъмна тема: земята #141C18, картата #1B251F, мента
   #4FBF8E. Таблици и цветове в самите тагове, защото Gmail и Outlook режат
   <style>, градиенти и SVG — затова шапката (земята със сиянието и
   словният знак) е картинка: public/cheatcode/mail-hero.png. */
const C = {
  ground: '#141C18', card: '#1B251F', line: '#35473D',
  ink: '#E9F0EA', soft: '#A3B3A7', faint: '#74857A', accent: '#4FBF8E', bad: '#E07A6B',
}
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`
const MONO = `ui-monospace,'SF Mono',Menlo,Consolas,monospace`
const SITE = 'https://blag-coaching.com'

/* Без снимка (стара поръчка или чернова) — плочката с веригата. */
const photoOf = (l: Line) => SITE + (l.photo || '/cheatcode/icon-192.png')

function page(preheader: string, inner: string) {
  return `<!doctype html><html lang="bg"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">` +
    `<title>Cheat Code</title></head>` +
    `<body style="margin:0;padding:0;background:${C.ground}" bgcolor="${C.ground}">` +
    // Редът, който пощата показва до заглавието; в самото писмо не се вижда.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ground}" style="background:${C.ground}">` +
    `<tr><td align="center" style="padding:0 12px 28px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">` +
    `<tr><td><a href="${PAGE}"><img src="${SITE}/cheatcode/mail-hero.png" width="600" alt="CHEAT CODE — Храната, която си знае числата" ` +
    `style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>` +
    `<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:22px;padding:26px 22px;font-family:${FONT};color:${C.ink}">` +
    inner +
    `</td></tr>` +
    `<tr><td style="padding:18px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};text-align:center">` +
    `CHEAT CODE е линия на Благ Холдинг ЕООД.<br><a href="${PAGE}" style="color:${C.faint}">blag-coaching.com/cheatcode</a>` +
    `</td></tr></table></td></tr></table></body></html>`
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0"><tr>` +
  `<td bgcolor="${C.accent}" style="background:${C.accent};border-radius:999px">` +
  `<a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;` +
  `color:${C.ground};text-decoration:none">${esc(label)}</a></td></tr></table>`

const pill = (text: string, color: string) =>
  `<span style="display:inline-block;padding:4px 11px;border-radius:999px;border:1px solid ${color};` +
  `font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color}">${esc(text)}</span>`

function when(iso: string) {
  const d = new Date(iso)
  return isNaN(+d) ? '' : d.toLocaleString('bg-BG', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia',
  })
}

const STATES: Record<string, { tag: string; title: string; color: string }> = {
  new: { tag: 'ПРИЕТА', title: 'Поръчката ти е приета', color: C.accent },
  ready: { tag: 'ГОТОВА', title: 'Готова е — ела да я вземеш', color: C.accent },
  cancelled: { tag: 'ОТКАЗАНА', title: 'Поръчката е отказана', color: C.bad },
}

/* Какво, колко, какво да направиш — и данните, които човекът е дал, за да
   види, че са верни. Без реклама. */
export function letter(o: Order, link?: string) {
  const st = STATES[o.status] ?? STATES.new
  const subject = (o.test ? 'ПРОБА · ' : '') + `Поръчка ${o.code} ${o.status === 'new' ? 'е приета' : o.status === 'ready' ? 'е готова' : 'е отказана'}`
  const lead = o.status === 'new'
    ? 'Ще ти се обадим, за да я потвърдим, и ще ти пишем, когато е готова.'
    : o.status === 'ready'
      ? `Чака те${o.pickup_time ? ' — за ' + esc(o.pickup_time) : ''}. Кажи кода, когато дойдеш.`
      : 'Нищо не се плаща. Ако е грешка, просто поръчай отново.'

  const rows = o.lines.map((l) =>
    `<tr><td width="64" valign="top" style="padding:12px 12px 12px 0;border-top:1px solid ${C.line}">` +
    `<img src="${photoOf(l)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:12px;object-fit:cover;border:0"></td>` +
    `<td valign="top" style="padding:12px 0;border-top:1px solid ${C.line};font-family:${FONT}">` +
    `<div style="font-size:15px;font-weight:600;color:${C.ink}">${esc(l.name)}</div>` +
    `<div style="font-size:12.5px;color:${C.soft};margin-top:2px">${l.qty} × ${euro(l.unit)}</div>` +
    (l.cfg ? `<div style="font-family:${MONO};font-size:11px;line-height:1.55;color:${C.faint};margin-top:5px">${esc(l.cfg)}</div>` : '') +
    `</td><td valign="top" align="right" style="padding:12px 0 12px 10px;border-top:1px solid ${C.line};` +
    `font-family:${MONO};font-size:14px;font-weight:700;color:${C.ink};white-space:nowrap">${euro(l.unit * l.qty)}</td></tr>`).join('')

  const facts: [string, string][] = [
    ['Име', o.name],
    ['Телефон', o.phone],
    ['Вземане', o.pickup_time ? 'в ' + o.pickup_time : 'без уговорен час'],
    ...(o.note ? [['Бележка', o.note] as [string, string]] : []),
    ['Поръчана', when(o.created_at)],
    ['Плащане', 'на място, в брой'],
  ]
  const factRows = facts.map(([k, v]) =>
    `<tr><td style="padding:5px 14px 5px 0;font-size:13px;color:${C.faint};white-space:nowrap;vertical-align:top">${k}</td>` +
    `<td style="padding:5px 0;font-size:14px;color:${C.ink}">${esc(v)}</td></tr>`).join('')

  const inner =
    pill(st.tag, st.color) +
    `<h1 style="margin:14px 0 4px;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:800;color:${C.ink}">${st.title}</h1>` +
    `<div style="font-family:${MONO};font-size:26px;font-weight:700;letter-spacing:0.06em;color:${st.color}">${esc(o.code)}</div>` +
    `<p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:${C.soft}">Здравей, ${esc(o.name)}! ${lead}</p>` +
    (o.test ? `<p style="margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#2A2320;font-size:13px;color:${C.bad}">` +
      `Това е проба — поръчката не се готви.</p>` : '') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">${rows}` +
    `<tr><td></td><td style="padding:14px 0 0;border-top:1px solid ${C.line};font-size:15px;color:${C.soft}">Общо · ${o.box_count} ${o.box_count === 1 ? 'кутия' : 'кутии'}</td>` +
    `<td align="right" style="padding:14px 0 0 10px;border-top:1px solid ${C.line};font-family:${MONO};font-size:20px;font-weight:700;color:${C.ink};white-space:nowrap">${euro(o.total_cents)}</td></tr></table>` +
    `<div style="margin:24px 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${C.faint}">ТВОИТЕ ДАННИ</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT}">${factRows}</table>` +
    (link ? button(link, 'Моите поръчки') +
      `<p style="margin:10px 0 0;font-size:12.5px;color:${C.faint}">Линкът отваря поръчките ти на всеки телефон — без парола.</p>` : '')

  const preheader = o.status === 'new'
    ? `${o.code} · ${euro(o.total_cents)}${o.pickup_time ? ' · за ' + o.pickup_time : ''} — ще ти се обадим да я потвърдим.`
    : o.status === 'ready' ? `${o.code} те чака. Плащане на място.` : `${o.code} е отказана. Нищо не се плаща.`
  return { subject, html: page(preheader, inner) }
}

export function linkLetter(link: string) {
  const inner =
    pill('МОИТЕ ПОРЪЧКИ', C.accent) +
    `<h1 style="margin:14px 0 4px;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:800;color:${C.ink}">Поръчките ти на всеки телефон</h1>` +
    `<p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:${C.soft}">Отвори линка на телефона, на който искаш да ги виждаш. ` +
    `После той ще те помни — без парола и без регистрация.</p>` +
    button(link, 'Моите поръчки') +
    `<p style="margin:14px 0 0;font-size:12.5px;color:${C.faint}">Ако не си го искал ти, просто не го отваряй.</p>`
  return { subject: 'Твоите поръчки в Cheat Code', html: page('Линкът към поръчките ти — отвори го на телефона си.', inner) }
}

async function send(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('няма RESEND_API_KEY')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Cheat Code <noreply@blag-coaching.com>', to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`)
}

async function expectedSecret(db: any) {
  try {
    const { data } = await db.from('app_secrets').select('value').eq('name', 'reminder').maybeSingle()
    if (data?.value) return data.value as string
  } catch { /* пада на запасния */ }
  return Deno.env.get('REMINDER_SECRET') ?? null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const expected = await expectedSecret(db)
  if (!expected || req.headers.get('x-bot-secret') !== expected) return new Response('Unauthorized', { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { /* празно */ }

  try {
    if (body.kind === 'link') {
      const email = String(body.email || '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new Response('email', { status: 400 })
      const { subject, html } = linkLetter(await newLink(db, email))
      await send(email, subject, html)
      return Response.json({ sent: 'link' })
    }

    const id = String(body.id || '')
    if (!id) return new Response('id', { status: 400 })
    const { data: o, error } = await db.from('cheatcode_orders')
      .select('id, code, name, email, phone, note, created_at, status, test, pickup_time, lines, box_count, total_cents, mailed')
      .eq('id', id).maybeSingle()
    if (error || !o) return new Response('not found', { status: 404 })
    if (!o.email || !['new', 'ready', 'cancelled'].includes(o.status) || (o.mailed || []).includes(o.status)) {
      return Response.json({ skipped: true })
    }

    // Линкът е в писмото „приета“ — първото, което човек получава.
    const link = o.status === 'new' ? await newLink(db, o.email) : undefined
    const { subject, html } = letter(o as Order, link)
    await send(o.email, subject, html)

    // Само `mailed` се пипа — статусът остава такъв, какъвто е; тригерът
    // слуша „update of status“ и не се вика пак.
    await db.from('cheatcode_orders').update({ mailed: [...(o.mailed || []), o.status] }).eq('id', o.id)
    return Response.json({ sent: o.status })
  } catch (e) {
    console.error('mail', e)
    return new Response('send failed', { status: 502 })
  }
})
