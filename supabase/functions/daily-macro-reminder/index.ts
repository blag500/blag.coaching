import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails('mailto:nikolay.blagyov@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Today in Sofia timezone (YYYY-MM-DD)
  const todaySofia = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' })

  // Client user IDs only
  const { data: clients } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'client')

  const clientIds = (clients ?? []).map(c => c.id)
  if (!clientIds.length) return new Response(JSON.stringify({ sent: 0 }))

  // Which clients have push subscriptions?
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription, endpoint')
    .in('user_id', clientIds)

  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }))

  // Which of those have already logged food today?
  const subUserIds = [...new Set(subs.map(s => s.user_id))]
  const { data: loggedToday } = await supabase
    .from('food_logs')
    .select('user_id')
    .in('user_id', subUserIds)
    .eq('date', todaySofia)

  const loggedSet = new Set((loggedToday ?? []).map(r => r.user_id))

  // Only notify users with zero logs today
  const targets = subs.filter(s => !loggedSet.has(s.user_id))
  if (!targets.length) return new Response(JSON.stringify({ sent: 0, skipped: subs.length }))

  const payload = JSON.stringify({
    title: 'BLAG COACHING',
    body:  'Не си логнал нищо за деня — влез и добави храните си 🍽️',
    tag:   'macro-reminder',
    data:  { type: 'macro-reminder' },
  })

  const results = await Promise.allSettled(
    targets.map(row => webpush.sendNotification(row.subscription, payload))
  )

  // Remove permanently dead subscriptions
  const deadEndpoints: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const status = result.reason?.statusCode ?? result.reason?.status
      if (status === 410 || status === 404) deadEndpoints.push(targets[i].endpoint)
    }
  })
  if (deadEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints)
  }

  const sent = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, skipped: loggedSet.size, dead: deadEndpoints.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
