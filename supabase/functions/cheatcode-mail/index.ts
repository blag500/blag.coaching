import { createClient } from 'npm:@supabase/supabase-js@2'

/* Писмо до клиента на Чийт Код: „готова е“ или „отказана е“.
 *
 * Вика го само тригерът cheatcode_order_mail (миграция 131) при смяна на
 * статуса, с тайната от app_secrets в заглавката x-bot-secret. Без вход,
 * затова verify_jwt = false в config.toml — пази се сама с тайната.
 *
 * Статусът се чете наново от базата, не се взима от заявката: между
 * тригера и писмото собственикът може да е върнал поръчката. Изпратеното
 * се записва в `mailed`, за да не тръгне същото писмо втори път. */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const euro = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €'

type Line = { name: string; qty: number; unit: number }
type Order = {
  id: string; code: string; name: string; email: string | null; status: string; test: boolean
  pickup_time: string | null; lines: Line[]; box_count: number; total_cents: number; mailed: string[]
}

/* Писмото е кратко: какво, колко, какво да направиш. Без реклама и без
   картинки — стига да се прочете в известието на телефона. */
export function letter(o: Order) {
  const ready = o.status === 'ready'
  const subject = (o.test ? 'ПРОБА · ' : '') +
    (ready ? `Поръчка ${o.code} е готова` : `Поръчка ${o.code} е отказана`)
  const rows = o.lines.map((l) =>
    `<tr><td style="padding:3px 14px 3px 0">${l.qty} × ${esc(l.name)}</td>` +
    `<td style="padding:3px 0;text-align:right;white-space:nowrap">${euro(l.unit * l.qty)}</td></tr>`).join('')
  const lead = ready
    ? `Поръчката ти <b>${esc(o.code)}</b> е готова — ела да я вземеш.`
    : `Поръчката ти <b>${esc(o.code)}</b> е отказана. Нищо не се плаща.`
  const tail = ready ? '<p style="margin:14px 0 0;color:#555">Плащане на място, в брой.</p>' : ''
  const test = o.test
    ? '<p style="margin:14px 0 0;color:#a33">Това е проба — поръчката не се готви.</p>'
    : ''
  const html =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#141C18;max-width:440px">` +
    `<p style="margin:0 0 12px">Здравей, ${esc(o.name)}!</p>` +
    `<p style="margin:0 0 14px">${lead}</p>` +
    `<table style="border-collapse:collapse;font-size:14px">${rows}` +
    `<tr><td style="padding:8px 14px 0 0;border-top:1px solid #ddd"><b>Общо</b></td>` +
    `<td style="padding:8px 0 0;border-top:1px solid #ddd;text-align:right"><b>${euro(o.total_cents)}</b></td></tr></table>` +
    tail + test +
    `<p style="margin:22px 0 0;font-size:12px;color:#888">CHEAT CODE · blag-coaching.com/cheatcode</p></div>`
  return { subject, html }
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

  let id = ''
  try { id = String((await req.json()).id || '') } catch { /* празно */ }
  if (!id) return new Response('id', { status: 400 })

  const { data: o, error } = await db.from('cheatcode_orders')
    .select('id, code, name, email, status, test, pickup_time, lines, box_count, total_cents, mailed')
    .eq('id', id).maybeSingle()
  if (error || !o) return new Response('not found', { status: 404 })
  if (!o.email || !['ready', 'cancelled'].includes(o.status) || (o.mailed || []).includes(o.status)) {
    return Response.json({ skipped: true })
  }
  if (!RESEND_API_KEY) {
    console.error('mail: няма RESEND_API_KEY')
    return new Response('no key', { status: 500 })
  }

  const { subject, html } = letter(o as Order)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Cheat Code <noreply@blag-coaching.com>', to: [o.email], subject, html }),
  })
  if (!res.ok) {
    console.error('resend', res.status, await res.text())
    return new Response('send failed', { status: 502 })
  }

  // Само `mailed` се пипа — статусът остава такъв, какъвто е; тригерът
  // слуша „update of status“ и не се вика пак.
  await db.from('cheatcode_orders').update({ mailed: [...(o.mailed || []), o.status] }).eq('id', o.id)
  return Response.json({ sent: o.status })
})
