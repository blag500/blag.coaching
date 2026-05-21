import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails('mailto:nikolay.blagyov@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PERIOD_LABELS: Record<string, string> = {
  morning:   'Сутринта е добър момент да вземеш добавките си 💪',
  afternoon: 'Не забравяй за добавките си 💊',
  evening:   'Вечерните ти добавки те чакат 🌙',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { period } = await req.json().catch(() => ({}))
  if (!period || !PERIOD_LABELS[period]) {
    return new Response('missing or invalid period', { status: 400, headers: CORS })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Find all users with supplements that have this period reminder enabled
  const col = `remind_${period}` as 'remind_morning' | 'remind_afternoon' | 'remind_evening'
  const { data: supplements } = await supabase
    .from('supplements')
    .select('user_id')
    .eq(col, true)
    .eq('active', true)

  if (!supplements?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  // Deduplicate user IDs
  const userIds = [...new Set(supplements.map(s => s.user_id))]

  // Fetch push subscriptions for those users
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', userIds)

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const payload = JSON.stringify({
    title: 'Blag Coaching',
    body:  PERIOD_LABELS[period],
  })

  const results = await Promise.allSettled(
    subs.map(row => webpush.sendNotification(row.subscription, payload))
  )

  const sent = results.filter(r => r.status === 'fulfilled').length

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
