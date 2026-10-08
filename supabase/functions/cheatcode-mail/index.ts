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

type Line = { name: string; qty: number; unit: number }
type Order = {
  id: string; code: string; name: string; email: string | null; status: string; test: boolean
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

const wrap = (inner: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#141C18;max-width:440px">` +
  inner +
  `<p style="margin:22px 0 0;font-size:12px;color:#888">CHEAT CODE · blag-coaching.com/cheatcode</p></div>`

const button = (href: string, label: string) =>
  `<p style="margin:18px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#4FBF8E;color:#141C18;` +
  `text-decoration:none;font-weight:600;padding:11px 20px;border-radius:999px">${esc(label)}</a></p>`

/* Писмото е кратко: какво, колко, какво да направиш. Без реклама и без
   картинки — стига да се прочете в известието на телефона. */
export function letter(o: Order, link?: string) {
  const what = o.status === 'new' ? 'е приета' : o.status === 'ready' ? 'е готова' : 'е отказана'
  const subject = (o.test ? 'ПРОБА · ' : '') + `Поръчка ${o.code} ${what}`
  const rows = o.lines.map((l) =>
    `<tr><td style="padding:3px 14px 3px 0">${l.qty} × ${esc(l.name)}</td>` +
    `<td style="padding:3px 0;text-align:right;white-space:nowrap">${euro(l.unit * l.qty)}</td></tr>`).join('')
  const code = `<b>${esc(o.code)}</b>`
  const lead = o.status === 'new'
    ? `Поръчката ти ${code} е приета${o.pickup_time ? ' — за ' + esc(o.pickup_time) : ''}. Ще ти се обадим, за да я потвърдим, и ще ти пишем, когато е готова.`
    : o.status === 'ready'
      ? `Поръчката ти ${code} е готова — ела да я вземеш.`
      : `Поръчката ти ${code} е отказана. Нищо не се плаща.`
  const tail = o.status === 'cancelled' ? '' : '<p style="margin:14px 0 0;color:#555">Плащане на място, в брой.</p>'
  const test = o.test ? '<p style="margin:14px 0 0;color:#a33">Това е проба — поръчката не се готви.</p>' : ''
  const html = wrap(
    `<p style="margin:0 0 12px">Здравей, ${esc(o.name)}!</p>` +
    `<p style="margin:0 0 14px">${lead}</p>` +
    `<table style="border-collapse:collapse;font-size:14px">${rows}` +
    `<tr><td style="padding:8px 14px 0 0;border-top:1px solid #ddd"><b>Общо</b></td>` +
    `<td style="padding:8px 0 0;border-top:1px solid #ddd;text-align:right"><b>${euro(o.total_cents)}</b></td></tr></table>` +
    tail + test +
    (link ? button(link, 'Моите поръчки') +
      '<p style="margin:8px 0 0;font-size:12.5px;color:#888">Линкът отваря поръчките ти на всеки телефон.</p>' : ''))
  return { subject, html }
}

export function linkLetter(link: string) {
  return {
    subject: 'Твоите поръчки в Cheat Code',
    html: wrap(
      `<p style="margin:0 0 12px">Ето линка към поръчките ти.</p>` +
      `<p style="margin:0">Отвори го на телефона, на който искаш да ги виждаш — после той ще те помни.</p>` +
      button(link, 'Моите поръчки') +
      `<p style="margin:14px 0 0;font-size:12.5px;color:#888">Ако не си го искал ти, просто не го отваряй.</p>`),
  }
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
      .select('id, code, name, email, status, test, pickup_time, lines, box_count, total_cents, mailed')
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
