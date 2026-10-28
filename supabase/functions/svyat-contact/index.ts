// svyat-contact — картата „Пиши ми“ в светa (/svyat/, Р20).
//
// Без вход. Пази от спам с две неща: скрито поле-капан (website — човек не го
// вижда, бот го попълва) и лимит 5 писма на час от едно място (по отпечатък на
// IP със сол — самото IP не се записва). Писмото отива в svyat_messages и,
// ако има RESEND_API_KEY, като имейл до собственика с „Отговор“ към подателя.

import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const OWNER = Deno.env.get('SVYAT_OWNER_EMAIL')?.trim() || 'nikolay.blagyov@gmail.com'
const SALT = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!.slice(-16)

const ORIGINS = ['https://blag-coaching.com', 'https://www.blag-coaching.com', 'https://blag-coaching.vercel.app']
const isLocal = (o: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
const cors = (o: string) => ({
  'Access-Control-Allow-Origin': ORIGINS.includes(o) || isLocal(o) ? o : ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
})
const clean = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max)
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

async function sha(s: string) {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function handle(req: Request) {
  const body = await req.json()
  // Капанът: тих успех, за да не учим бота какво го е хванало.
  if (clean(body.website, 200)) return { status: 200, ok: true }
  const name = clean(body.name, 120)
  const email = clean(body.email, 160).toLowerCase()
  const text = clean(body.body, 4000)
  if (text.length < 5 || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { status: 400, error: 'Попълни съобщение, име и имейл.' }
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ip_hash = await sha(SALT + ip)
  const { count } = await db.from('svyat_messages').select('id', { count: 'exact', head: true })
    .eq('ip_hash', ip_hash).gt('created_at', new Date(Date.now() - 3600e3).toISOString())
  if ((count ?? 0) >= 5) return { status: 429, error: 'Много писма за кратко. Опитай пак след час.' }

  const { error } = await db.from('svyat_messages').insert({ name, email, body: text, ip_hash })
  if (error) return { status: 500, error: 'Не се записа. Опитай пак.' }

  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Светът Благ <noreply@blag-coaching.com>', to: [OWNER], reply_to: email,
        subject: `Ново писмо от светa — ${name}`,
        html: `<p><b>${esc(name)}</b> &lt;${esc(email)}&gt;</p><p style="white-space:pre-wrap">${esc(text)}</p>`,
      }),
    }).catch((e) => console.error('svyat-contact mail', e))
  }
  return { status: 200, ok: true }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const headers = cors(origin)
  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers })
  try {
    const { status, ...rest } = await handle(req)
    return new Response(JSON.stringify(rest), { status, headers })
  } catch (e) {
    console.error('svyat-contact', e)
    return new Response(JSON.stringify({ error: 'Нещо се обърка. Опитай пак след малко.' }), { status: 500, headers })
  }
})
