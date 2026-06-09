import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')
const STRIPE_KEY        = Deno.env.get('STRIPE_SECRET_KEY')

webpush.setVapidDetails('mailto:nikolay.blagyov@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Sofia' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' })
}

// ── Stripe helpers ─────────────────────────────────────────────────────────────

function stripeAuth() { return `Basic ${btoa(STRIPE_KEY + ':')}` }

async function stripePost(path: string, body: Record<string, string> = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { 'Authorization': stripeAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': stripeAuth() },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`)
  return json
}

// Creates an invoice and returns its hosted payment URL (without sending Stripe's own email).
// Returns null if STRIPE_KEY is absent, price is not set, or creation fails.
async function autoInvoice(supabase: any, session: any): Promise<string | null> {
  if (!STRIPE_KEY) return null

  const priceEur: number = parseFloat(session.client?.session_price_eur)
  if (!priceEur || priceEur <= 0) return null

  // Don't double-invoice
  if (session.stripe_invoice_id) return null

  const email = session.client.email as string
  const name  = (session.client.name || email) as string
  const dateLabel = new Date(session.scheduled_at).toLocaleDateString('bg-BG', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Sofia',
  })
  const description = `${session.title} — ${dateLabel}`

  try {
    const existing = await stripeGet(`/customers?email=${encodeURIComponent(email)}&limit=1`)
    let customerId: string
    if (existing.data?.length > 0) {
      customerId = existing.data[0].id
    } else {
      const customer = await stripePost('/customers', { email, name })
      customerId = customer.id
    }

    await stripePost('/invoiceitems', {
      customer:    customerId,
      amount:      String(Math.round(priceEur * 100)),
      currency:    'eur',
      description,
    })

    const invoice = await stripePost('/invoices', {
      customer:          customerId,
      collection_method: 'send_invoice',
      days_until_due:    '7',
      auto_advance:      'false',
    })

    // Finalize → returns open invoice with hosted_invoice_url
    const finalized = await stripePost(`/invoices/${invoice.id}/finalize`, {})

    // Update session — no /send call; we embed the link in our own email
    await supabase.from('training_sessions').update({
      stripe_invoice_id: invoice.id,
      payment_status:    'invoiced',
      price_eur:         priceEur,
    }).eq('id', session.id)

    return (finalized.hosted_invoice_url as string) ?? null
  } catch (err) {
    console.error('auto-invoice error:', err)
    return null
  }
}

// ── Email builder ──────────────────────────────────────────────────────────────

interface Party { id: string; name: string | null; email: string }
interface Packet {
  userId: string
  pushTitle: string; pushBody: string
  email?: string; subject?: string; html?: string
}

function payButton(url: string, priceEur?: number) {
  const label = priceEur ? `ПЛАТИ ${priceEur.toFixed(2)} EUR` : 'ПЛАТИ ФАКТУРАТА'
  return `
    <div style="margin:20px 0">
      <a href="${url}" style="display:inline-block;background:#ffb74d;color:#000;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.05em">
        ${label}
      </a>
      <p style="margin:8px 0 0;font-size:12px;color:#888">Фактурата е валидна 7 дни.</p>
    </div>`
}

function buildPacket(event: string, s: any, paymentUrl: string | null): Packet | null {
  const coach: Party  = s.coach
  const client: Party = s.client
  const coachName  = coach.name  || 'Треньора'
  const clientName = client.name || 'Клиента'
  const dateStr = fmtDate(s.scheduled_at)
  const timeStr = fmtTime(s.scheduled_at)
  const priceEur: number | undefined = (s.price_eur ?? parseFloat(s.client?.session_price_eur)) || undefined

  const sessionTable = `
    <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:5px 16px 5px 0;color:#888">Дата</td><td><strong>${dateStr}</strong></td></tr>
      <tr><td style="padding:5px 16px 5px 0;color:#888">Час</td><td><strong>${timeStr}</strong></td></tr>
      <tr><td style="padding:5px 16px 5px 0;color:#888">Вид</td><td><strong>${s.title}</strong></td></tr>
      ${s.notes ? `<tr><td style="padding:5px 16px 5px 0;color:#888">Бележка</td><td>${s.notes}</td></tr>` : ''}
    </table>`

  const paySection = paymentUrl ? payButton(paymentUrl, priceEur) : ''

  if (event === 'created') {
    if (s.requested_by === coach.id) {
      return {
        userId: client.id,
        pushTitle: 'Нова тренировка 💪',
        pushBody: `${coachName} насрочи тренировка за ${dateStr} в ${timeStr}`,
        email: client.email,
        subject: `Нова тренировка: ${dateStr} в ${timeStr}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#ffb74d;margin:0 0 12px">Нова тренировка</h2>
          <p>Здравей ${clientName},</p>
          <p><strong>${coachName}</strong> насрочи нова тренировка за теб.</p>
          ${sessionTable}
          ${paySection}
          <p style="color:#888;font-size:13px">Отвори приложението и потвърди тренировката от секция <strong>ГРАФИК</strong>.</p>
        </div>`,
      }
    } else {
      return {
        userId: coach.id,
        pushTitle: 'Заявка за тренировка',
        pushBody: `${clientName} заяви тренировка за ${dateStr} в ${timeStr}`,
      }
    }
  }

  if (event === 'confirmed') {
    if (s.requested_by === coach.id) {
      return {
        userId: coach.id,
        pushTitle: 'Тренировка потвърдена ✅',
        pushBody: `${clientName} потвърди тренировката за ${dateStr} в ${timeStr}`,
      }
    } else {
      return {
        userId: client.id,
        pushTitle: 'Тренировка потвърдена ✅',
        pushBody: `${coachName} потвърди тренировката за ${dateStr} в ${timeStr}`,
        email: client.email,
        subject: `Потвърдена тренировка: ${dateStr}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#66BB6A;margin:0 0 12px">Тренировката е потвърдена ✅</h2>
          <p>Здравей ${clientName},</p>
          <p><strong>${coachName}</strong> потвърди тренировката ти. Очакваме те!</p>
          ${sessionTable}
          ${paySection}
        </div>`,
      }
    }
  }

  if (event === 'cancelled' || event === 'declined') {
    const word = event === 'cancelled' ? 'отменена' : 'отхвърлена'
    const verb = event === 'cancelled' ? 'отмени'   : 'отхвърли'
    if (s.requested_by === coach.id) {
      return {
        userId: coach.id,
        pushTitle: `Тренировка ${word}`,
        pushBody: `${clientName} ${verb} тренировката за ${dateStr}`,
      }
    } else {
      return {
        userId: client.id,
        pushTitle: `Тренировка ${word}`,
        pushBody: `${coachName} ${verb} тренировката за ${dateStr}`,
      }
    }
  }

  return null
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function doWork(sessionId: string, event: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: s, error } = await supabase
    .from('training_sessions')
    .select('*, coach:profiles!fk_ts_coach(id, name, email), client:profiles!fk_ts_client(id, name, email, session_price_eur)')
    .eq('id', sessionId)
    .single()

  if (error || !s) {
    console.error('session fetch error:', error)
    return
  }

  // Auto-invoice when this event will send a client-facing email
  const isClientEmail =
    (event === 'created'   && s.requested_by === s.coach.id) ||
    (event === 'confirmed' && s.requested_by !== s.coach.id)

  let paymentUrl: string | null = null
  if (isClientEmail) {
    paymentUrl = await autoInvoice(supabase, s)
    if (paymentUrl) console.log('auto-invoice created, payment URL embedded in email')
  }

  const packet = buildPacket(event, s, paymentUrl)
  if (!packet) return

  // Push notification
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', packet.userId)

  if (subs?.length) {
    const payload = JSON.stringify({ title: packet.pushTitle, body: packet.pushBody })
    const results = await Promise.allSettled(
      subs.map((row: any) => webpush.sendNotification(row.subscription, payload))
    )
    console.log('push results:', JSON.stringify(results.map(r => r.status)))
  } else {
    console.log('no push subscriptions for user', packet.userId)
  }

  // Email via Resend
  if (RESEND_API_KEY && packet.email) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Blag Coaching <noreply@blag-coaching.com>',
        to: [packet.email],
        subject: packet.subject,
        html: packet.html,
      }),
    })
    const resBody = await res.json().catch(() => ({}))
    console.log('resend status:', res.status, JSON.stringify(resBody))
  } else if (!packet.email) {
    console.log('push-only event, skipping email')
  } else {
    console.log('no RESEND_API_KEY set')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { sessionId, event } = await req.json()
  if (!sessionId || !event) {
    return new Response('missing sessionId or event', { status: 400, headers: CORS })
  }

  EdgeRuntime.waitUntil(doWork(sessionId, event))

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
