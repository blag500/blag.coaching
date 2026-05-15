import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')
const COACH_EMAIL       = 'nikolay.blagyov@gmail.com'

webpush.setVapidDetails(
  `mailto:${COACH_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { email, name } = await req.json()

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // ── Email via Resend ──────────────────────────────────────
  if (RESEND_API_KEY) {
    const displayName = name || email || 'Нов потребител'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Blag Coaching <onboarding@resend.dev>',
        to: [COACH_EMAIL],
        subject: `Нов клиент: ${displayName}`,
        html: `
          <p>Здравей,</p>
          <p>Нов клиент се регистрира в <strong>Blag Coaching</strong> и чака твоето одобрение.</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:4px 12px 4px 0;color:#888">Имейл</td><td><strong>${email}</strong></td></tr>
            ${name ? `<tr><td style="padding:4px 12px 4px 0;color:#888">Име</td><td><strong>${name}</strong></td></tr>` : ''}
          </table>
          <p>Влез в приложението и одобри акаунта от секция <strong>КЛИЕНТИ → ЧАКАЩИ ОДОБРЕНИЕ</strong>.</p>
        `,
      }),
    }).catch(() => {})
  }

  // ── Push notification to all coaches ─────────────────────
  const { data: coaches } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'coach')

  if (coaches?.length) {
    const coachIds = coaches.map(c => c.id)
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', coachIds)

    if (subs?.length) {
      const payload = JSON.stringify({
        title: 'Нов клиент',
        body: `${name || email} се регистрира и чака одобрение`,
      })
      await Promise.allSettled(
        subs.map(row => webpush.sendNotification(row.subscription, payload))
      )
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
