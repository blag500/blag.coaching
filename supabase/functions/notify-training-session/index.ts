import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')

webpush.setVapidDetails('mailto:nikolay.blagyov@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
}

interface Party { id: string; name: string | null; email: string }
interface Packet {
  userId: string; email: string
  pushTitle: string; pushBody: string
  subject: string; html: string
}

function buildPacket(event: string, s: any): Packet | null {
  const coach: Party  = s.coach
  const client: Party = s.client
  const coachName  = coach.name  || 'Треньора'
  const clientName = client.name || 'Клиента'
  const dateStr = fmtDate(s.scheduled_at)
  const timeStr = fmtTime(s.scheduled_at)

  const sessionTable = `
    <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:5px 16px 5px 0;color:#888">Дата</td><td><strong>${dateStr}</strong></td></tr>
      <tr><td style="padding:5px 16px 5px 0;color:#888">Час</td><td><strong>${timeStr}</strong></td></tr>
      <tr><td style="padding:5px 16px 5px 0;color:#888">Вид</td><td><strong>${s.title}</strong></td></tr>
      ${s.notes ? `<tr><td style="padding:5px 16px 5px 0;color:#888">Бележка</td><td>${s.notes}</td></tr>` : ''}
    </table>`

  if (event === 'created') {
    if (s.requested_by === coach.id) {
      return {
        userId: client.id, email: client.email,
        pushTitle: 'Нова тренировка 💪',
        pushBody: `${coachName} насрочи тренировка за ${dateStr} в ${timeStr}`,
        subject: `Нова тренировка: ${dateStr} в ${timeStr}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#ffb74d;margin:0 0 12px">Нова тренировка</h2>
          <p>Здравей ${clientName},</p>
          <p><strong>${coachName}</strong> насрочи нова тренировка за теб.</p>
          ${sessionTable}
          <p>Отвори приложението и потвърди тренировката от секция <strong>ГРАФИК</strong>.</p>
        </div>`,
      }
    } else {
      return {
        userId: coach.id, email: coach.email,
        pushTitle: 'Заявка за тренировка',
        pushBody: `${clientName} заяви тренировка за ${dateStr} в ${timeStr}`,
        subject: `${clientName} заяви тренировка: ${dateStr}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#ffb74d;margin:0 0 12px">Нова заявка за тренировка</h2>
          <p>Здравей,</p>
          <p><strong>${clientName}</strong> заяви нова тренировка.</p>
          ${sessionTable}
          <p>Влез в приложението и потвърди от секция <strong>ГРАФИК</strong>.</p>
        </div>`,
      }
    }
  }

  if (event === 'confirmed') {
    if (s.requested_by === coach.id) {
      return {
        userId: coach.id, email: coach.email,
        pushTitle: 'Тренировка потвърдена ✅',
        pushBody: `${clientName} потвърди тренировката за ${dateStr} в ${timeStr}`,
        subject: `Потвърдена тренировка: ${dateStr}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#66BB6A;margin:0 0 12px">Тренировката е потвърдена ✅</h2>
          <p><strong>${clientName}</strong> потвърди тренировката.</p>
          ${sessionTable}
        </div>`,
      }
    } else {
      return {
        userId: client.id, email: client.email,
        pushTitle: 'Тренировка потвърдена ✅',
        pushBody: `${coachName} потвърди тренировката за ${dateStr} в ${timeStr}`,
        subject: `Потвърдена тренировка: ${dateStr}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#66BB6A;margin:0 0 12px">Тренировката е потвърдена ✅</h2>
          <p>Здравей ${clientName},</p>
          <p><strong>${coachName}</strong> потвърди тренировката ти. Очакваме те!</p>
          ${sessionTable}
        </div>`,
      }
    }
  }

  if (event === 'cancelled' || event === 'declined') {
    const word = event === 'cancelled' ? 'отменена' : 'отхвърлена'
    const verb = event === 'cancelled' ? 'отмени'   : 'отхвърли'
    if (s.requested_by === coach.id) {
      return {
        userId: coach.id, email: coach.email,
        pushTitle: `Тренировка ${word}`,
        pushBody: `${clientName} ${verb} тренировката за ${dateStr}`,
        subject: `Тренировка ${word}: ${dateStr}`,
        html: `<p>${clientName} ${verb} тренировката за <strong>${dateStr} в ${timeStr}</strong>.</p>`,
      }
    } else {
      return {
        userId: client.id, email: client.email,
        pushTitle: `Тренировка ${word}`,
        pushBody: `${coachName} ${verb} тренировката за ${dateStr}`,
        subject: `Тренировка ${word}: ${dateStr}`,
        html: `<p>Здравей ${clientName}, ${coachName} ${verb} тренировката за <strong>${dateStr} в ${timeStr}</strong>.</p>`,
      }
    }
  }

  return null
}

async function doWork(sessionId: string, event: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: s, error } = await supabase
    .from('training_sessions')
    .select('*, coach:profiles!fk_ts_coach(id, name, email), client:profiles!fk_ts_client(id, name, email)')
    .eq('id', sessionId)
    .single()

  if (error || !s) {
    console.error('session fetch error:', error)
    return
  }

  const packet = buildPacket(event, s)
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
  if (RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Blag Coaching <onboarding@resend.dev>',
        to: [packet.email],
        subject: packet.subject,
        html: packet.html,
      }),
    })
    const resBody = await res.json().catch(() => ({}))
    console.log('resend status:', res.status, JSON.stringify(resBody))
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

  // Respond immediately so the client doesn't keep the connection open,
  // then finish the work in the background
  EdgeRuntime.waitUntil(doWork(sessionId, event))

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
