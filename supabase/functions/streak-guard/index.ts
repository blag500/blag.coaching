import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

/**
 * Пази низа.
 *
 * Огънчето в лентата брои дните подред, но низ, за който никой не те подсеща,
 * е украса: човек го къса не защото е решил, а защото денят е минал. Затова
 * веднъж вечерта — до онези, които имат какво да губят и днес още не са
 * вписали нищо.
 *
 * Праг от два дни нарочно. Един ден не е низ, а известие „днес не си вписал
 * нищо" до човек без низ е просто натякване, и то до най-неподходящия — този,
 * който вече е спрял.
 *
 * Изпраща се веднъж и не се повтаря: две напомняния за едно и също нещо в
 * една вечер превръщат напомнянето в шум, а шумът се изключва — заедно с
 * всички останали известия.
 */

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

const WINDOW_DAYS = 120     // докъде назад има смисъл да се брои низ
const MIN_STREAK  = 2

function iso(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const today = iso(0)
  const from  = iso(WINDOW_DAYS)

  /* Само хората, които изобщо могат да получат известие. Броенето за всички
     останали е работа, чийто отговор няма къде да отиде. */
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, subscription')
  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: CORS })

  const userIds = [...new Set(subs.map(s => s.user_id))]

  const [food, hab, wo] = await Promise.all([
    supabase.from('food_logs').select('user_id, date').in('user_id', userIds).gte('date', from),
    supabase.from('habit_completions').select('user_id, date').in('user_id', userIds).eq('completed', true).gte('date', from),
    supabase.from('workout_completions').select('user_id, completed_date').in('user_id', userIds).gte('completed_date', from),
  ])

  /* Ден се брои за активен, ако в него има вписано каквото и да е — същото
     правило като в приложението. Две различни определения за „активен ден"
     на двата края биха дали известие, което противоречи на числото в лентата. */
  const active = new Map<string, Set<string>>()
  const mark = (uid: string, d: string) => {
    if (!d) return
    if (!active.has(uid)) active.set(uid, new Set())
    active.get(uid)!.add(d)
  }
  for (const r of food.data ?? []) mark(r.user_id, r.date)
  for (const r of hab.data  ?? []) mark(r.user_id, r.date)
  for (const r of wo.data   ?? []) mark(r.user_id, r.completed_date)

  const byUser = new Map<string, typeof subs>()
  for (const s of subs) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
    byUser.get(s.user_id)!.push(s)
  }

  let sent = 0
  for (const uid of userIds) {
    const days = active.get(uid)
    if (!days || days.has(today)) continue      // днес вече има вписано

    // Низът до вчера включително.
    let streak = 0
    for (let i = 1; i <= WINDOW_DAYS; i++) {
      if (!days.has(iso(i))) break
      streak++
    }
    if (streak < MIN_STREAK) continue

    const payload = JSON.stringify({
      title: `${streak} дни подред`,
      body:  'Днес още е празно. Едно вписване стига.',
      tag:   `streak-${today}`,
      url:   '/',
    })

    for (const s of byUser.get(uid) ?? []) {
      try {
        await webpush.sendNotification(s.subscription, payload)
        sent++
      } catch (e) {
        /* Изтекъл или отменен абонамент. Чистим го тук, защото иначе всяка
           следваща вечер ще опитваме към адрес, който вече не съществува. */
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        } else {
          console.error('streak-guard push failed', uid, e)
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
