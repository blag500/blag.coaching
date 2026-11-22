import { createClient } from 'npm:@supabase/supabase-js@2'
// Версията е заключена: без нея средата на Supabase (11.2026) не стартира функцията (BOOT_ERROR).
import webpush from 'npm:web-push@3.6.7'

/* tablo-remind — праща напомнянията от бележките в таблото (150).
 *
 * Вика го разписанието в базата (fire_tablo_remind, всяка минута, само когато
 * има дошло време) със заглавка x-bot-secret. Взима бележките с минал час,
 * които не са пратени и не са отметнати, праща известие до абонаментите на
 * таблото (tablo_push, страницата /belezhki/) и ги отбелязва като пратени. Мъртвите абонаменти (404/410)
 * се трият. Ключът VAPID е същият като на приложението. */

const VAPID_PUBLIC_KEY = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'
let vapidErr = ''
try {
  webpush.setVapidDetails('mailto:nikolay.blagyov@gmail.com', VAPID_PUBLIC_KEY, Deno.env.get('VAPID_PRIVATE_KEY')!)
} catch (e) { vapidErr = String(e) }

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (vapidErr) return json({ error: `vapid: ${vapidErr}` }, 500)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: sec } = await admin.from('app_secrets').select('value').eq('name', 'reminder').maybeSingle()
  const expected = sec?.value ?? Deno.env.get('REMINDER_SECRET')
  if (!expected || req.headers.get('x-bot-secret') !== expected) return json({ error: 'unauthorized' }, 401)

  const { data: due, error } = await admin.from('tablo_notes')
    .select('id, title, body, checklist')
    .lte('remind_at', new Date().toISOString())
    .is('reminded_at', null)
    .eq('done', false)
    .limit(20)
  if (error) return json({ error: error.message }, 500)
  if (!due?.length) return json({ sent: 0 })

  const { data: subs } = await admin.from('tablo_push').select('endpoint, subscription')
  let sent = 0
  const dead = new Set<string>()

  for (const n of due) {
    const open = Array.isArray(n.checklist) ? n.checklist.filter((c: { done?: boolean }) => !c.done).length : 0
    const firstLine = String(n.body || '').split('\n').find((l) => l.trim()) ?? ''
    const body = firstLine ? firstLine.slice(0, 160) : open ? `${open} неотметнати` : 'Напомняне'
    const payload = JSON.stringify({ title: String(n.title).slice(0, 100), body, tag: `note-${n.id}`, url: `/belezhki/#notes/${n.id}` })
    const results = await Promise.allSettled((subs ?? []).map((s) => webpush.sendNotification(s.subscription, payload)))
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') sent++
      else {
        const code = r.reason?.statusCode ?? r.reason?.status
        if (code === 404 || code === 410) dead.add(subs![i].endpoint)
      }
    })
  }

  await admin.from('tablo_notes').update({ reminded_at: new Date().toISOString() }).in('id', due.map((n) => n.id))
  if (dead.size) await admin.from('tablo_push').delete().in('endpoint', [...dead])
  return json({ notes: due.length, sent, dead: dead.size })
})
