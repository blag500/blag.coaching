import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  'mailto:nikolay.blagyov@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const { toUserId, title, body, tag } = await req.json()
  if (!toUserId) {
    return new Response('missing toUserId', { status: 400, headers: CORS })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_id', toUserId)

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const payload = JSON.stringify({
    title: title || 'Blag Coaching',
    body:  body  || 'Ново съобщение',
    tag:   tag   || 'default',
    data:  { type: tag || 'default' },
  })

  const results = await Promise.allSettled(
    subs.map(row => webpush.sendNotification(row.subscription, payload))
  )

  // Clean up subscriptions that the push service has permanently invalidated (410 Gone)
  const deadEndpoints: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const status = result.reason?.statusCode ?? result.reason?.status
      if (status === 410 || status === 404) {
        deadEndpoints.push(subs[i].endpoint)
      }
    }
  })
  if (deadEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', deadEndpoints)
  }

  const sent = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, dead: deadEndpoints.length }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
