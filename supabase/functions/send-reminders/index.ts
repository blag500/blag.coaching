import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'

// ── Email helpers ────────────────────────────────────────────────────────────

function emailHtml(emoji: string, heading: string, body: string, name: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#0C0A06">
<div style="max-width:480px;margin:0 auto;background:#131009;border:1px solid rgba(255,183,77,0.15);border-radius:20px;padding:32px 28px;font-family:monospace">
  <div style="font-size:48px;text-align:center;margin-bottom:20px">${emoji}</div>
  <h1 style="margin:0 0 12px;font-family:Impact,Arial Narrow,sans-serif;font-size:26px;letter-spacing:3px;color:#ffb74d;text-transform:uppercase">${heading}</h1>
  <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:rgba(242,232,207,0.75)">${body}</p>
  <a href="https://blagcoaching.netlify.app" style="display:inline-block;background:#ffb74d;color:#0C0A06;text-decoration:none;font-family:Impact,sans-serif;font-size:14px;letter-spacing:2px;padding:12px 24px;border-radius:24px">ОТВОРИ ПРИЛОЖЕНИЕТО</a>
  <p style="margin:24px 0 0;font-size:11px;color:rgba(242,232,207,0.25)">Blag Coaching · ${name}</p>
</div>
</body></html>`
}

/**
 * Reminders now arrive as push, so the duplicate email is off. Kept behind a
 * flag rather than deleted: the templates and per-slot settings still work, and
 * push is useless to anyone who has not installed the app or granted
 * permission — set REMINDER_EMAILS=on to bring them back.
 */
const EMAILS_ON = Deno.env.get('REMINDER_EMAILS') === 'on'

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  key: string,
  from: string,
) {
  if (!EMAILS_ON) return true   // treated as delivered: push already went out

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`Resend error for ${to}:`, err)
  }
  return res.ok
}

/**
 * Push the same reminder to the phone. Reuses the send-push function so VAPID
 * keys and subscription handling stay in one place. Failure is deliberately
 * silent — a missing push must never stop the email from going out.
 */
async function sendPush(userId: string, title: string, body: string, tag: string) {
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ toUserId: userId, title, body, tag }),
    })
    return res.ok
  } catch (e) {
    console.error('push failed for', userId, e)
    return false
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Simple token check so cron URL isn't completely public
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const expectedSecret = Deno.env.get('REMINDER_SECRET')
  if (expectedSecret && secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const slot = url.searchParams.get('slot') ?? ''
  // Use Sofia time (Europe/Sofia = UTC+3 summer, UTC+2 winter) for date checks
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Sofia' })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const fromEmail = Deno.env.get('REMINDER_FROM') ?? 'onboarding@resend.dev'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch clients and reminder settings as two separate queries (avoids PostgREST schema-cache join issues)
  const [{ data: clients, error: clientsErr }, { data: allSettings }] = await Promise.all([
    supabase.from('profiles').select('id, email, name, calories').not('email', 'is', null),
    // Every slot's column has to be named here. An explicit list means a new
    // slot fails silently: the flag comes back undefined, isEnabled() reads it
    // as "off", and the reminder goes to nobody without any error to notice.
    supabase.from('reminder_settings').select('user_id, email_enabled, checkin_email, weight_email, habits_email, supplements_email, water_email, food_email, training_email'),
  ])

  if (clientsErr || !clients?.length) {
    return new Response(JSON.stringify({ slot, sent: 0, clients: clients?.length ?? 0, error: clientsErr?.message ?? 'no clients' }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const settingsMap = new Map((allSettings ?? []).map((r: Record<string, unknown>) => [r.user_id, r]))

  // Helper: is this slot enabled for a client?
  const SLOT_KEY: Record<string, string> = {
    weight: 'weight_email', habits: 'habits_email', supplements: 'supplements_email',
    water: 'water_email', food: 'food_email', training: 'training_email',
    checkin: 'checkin_email',
  }
  function isEnabled(clientId: string, slotName: string) {
    const rs = settingsMap.get(clientId) as Record<string, unknown> | undefined
    if (!rs) return false
    if (!rs['email_enabled']) return false
    return rs[SLOT_KEY[slotName]] === true
  }

  let sent = 0

  // ── test: fire one reminder at a single address, ignoring schedule and
  //    per-slot settings, so delivery can be verified without waiting for cron.
  //    Reports what it found, since "sent 0" is otherwise indistinguishable
  //    from "no push subscription registered".
  if (slot === 'test') {
    const target = url.searchParams.get('email')
    const c = clients.find(x => x.email?.toLowerCase() === target?.toLowerCase())
    if (!c) {
      return new Response(JSON.stringify({ slot, error: 'no profile with that email', target }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', c.id)

    const pushOk = await sendPush(c.id, 'Тест', 'Известията работят. 💪', 'test')
    const mailOk = EMAILS_ON ? await sendEmail(
      c.email,
      '🔔 Тестово напомняне',
      emailHtml('🔔', 'Тест', 'Ако виждаш това, имейлите работят. Утре сутринта ще получиш и истинските напомняния.', c.name ?? ''),
      resendKey, fromEmail,
    ) : 'disabled'

    return new Response(JSON.stringify({
      slot, email: c.email,
      push_subscriptions: subs?.length ?? 0,
      push_sent: pushOk, email_sent: mailOk,
      reminder_settings: settingsMap.has(c.id) ? settingsMap.get(c.id) : 'none — turn reminders on in Профил',
    }), { headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  // ── checkin (07:00) ───────────────────────────────────────────────────────
  //    First of the day, and the one the rest depends on. Readiness is measured
  //    against the person's own fortnight, so a missed morning is not just a
  //    blank row — it is a hole in the baseline every later day is judged by.
  if (slot === 'checkin') {
    const { data: logged } = await supabase
      .from('sleep_logs')
      .select('user_id')
      .eq('date', today)

    const done = new Set(logged?.map(r => r.user_id) ?? [])
    console.log(`checkin: today=${today} logged=${done.size}/${clients.length}`)

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || done.has(c.id) || !c.email) continue
      await sendPush(c.id, 'Как се събуди?', '30 секунди — сън, енергия, стрес, крепатура.', 'checkin')
      const ok = await sendEmail(
        c.email,
        '🌅 Чек-ин за деня',
        emailHtml(
          '🌅',
          'Как се събуди?',
          'Тридесет секунди сутрин: сън, енергия, стрес и крепатура. Готовността ти се смята спрямо твоята собствена норма, така че всеки попълнен ден прави следващия по-точен.',
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  // ── weight (07:30) ────────────────────────────────────────────────────────
  else if (slot === 'weight') {
    const { data: logged } = await supabase
      .from('weight_logs')
      .select('user_id')
      .eq('date', today)

    const done = new Set(logged?.map(r => r.user_id) ?? [])
    console.log(`weight: today=${today} logged=${done.size}/${clients.length}`)

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || done.has(c.id) || !c.email) continue
      await sendPush(c.id, 'Претегли се', 'Сутринта, преди закуска.', 'weight')
      const ok = await sendEmail(
        c.email,
        '⚖️ Качи се на кантара',
        emailHtml(
          '⚖️',
          'Претегли се',
          'Сутринта е идеалното време — гладен, преди закуска. Дори малките промени дават важна информация за напредъка ти.',
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  // ── habits (08:00) ────────────────────────────────────────────────────────
  else if (slot === 'habits') {
    const { data: logged } = await supabase
      .from('habit_completions')
      .select('user_id')
      .eq('date', today)
      .eq('completed', true)

    const done = new Set(logged?.map(r => r.user_id) ?? [])

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || done.has(c.id) || !c.email) continue
      await sendPush(c.id, 'Навици', 'Отбележи сутрешните си навици.', 'habits')
      const ok = await sendEmail(
        c.email,
        '✅ Сутрешните навици чакат',
        emailHtml(
          '✅',
          'Навици',
          'Отбележи сутрешните си навици — малко усилие, голям ефект. Последователността е всичко.',
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  // ── supplements (08:30) ───────────────────────────────────────────────────
  else if (slot === 'supplements') {
    const { data: allSuppl } = await supabase
      .from('supplements')
      .select('user_id, id')

    const { data: logged } = await supabase
      .from('supplement_logs')
      .select('user_id, supplement_id')
      .eq('date', today)

    const loggedPairs = new Set(logged?.map(r => `${r.user_id}:${r.supplement_id}`) ?? [])
    const missing = new Set<string>()
    for (const s of allSuppl ?? []) {
      if (!loggedPairs.has(`${s.user_id}:${s.id}`)) missing.add(s.user_id)
    }

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || !missing.has(c.id) || !c.email) continue
      await sendPush(c.id, 'Суплементи', 'Има неотбелязани за днес.', 'supplements')
      const ok = await sendEmail(
        c.email,
        '💊 Суплементацията за днес',
        emailHtml(
          '💊',
          'Суплементи',
          'Имаш суплементи, които не са отбелязани за днес. Провери протокола си и отбележи приетите.',
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  // ── water (14:00) — само ако под 4 чаши ─────────────────────────────────
  else if (slot === 'water') {
    const { data: logs } = await supabase
      .from('water_logs')
      .select('user_id, glasses')
      .eq('log_date', today)

    const waterMap = new Map(logs?.map(r => [r.user_id, r.glasses]) ?? [])

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || !c.email) continue
      const glasses = waterMap.get(c.id) ?? 0
      if ((glasses as number) >= 4) continue
      await sendPush(c.id, 'Хидратация', `Имаш ${glasses} чаши до момента.`, 'water')
      const ok = await sendEmail(
        c.email,
        `💧 Само ${glasses} чаши вода днес`,
        emailHtml(
          '💧',
          'Хидратация',
          `Имаш само ${glasses} чаши до момента. Целта е 8 — опитай се да наваксаш преди вечерта. Добре хидратираното тяло тренира и се възстановява по-добре.`,
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  // ── food (16:00) — само ако под 50% от целта ─────────────────────────────
  else if (slot === 'food') {
    const { data: logs } = await supabase
      .from('food_logs')
      .select('user_id, kcal')
      .eq('date', today)

    const kcalMap = new Map<string, number>()
    for (const row of logs ?? []) {
      kcalMap.set(row.user_id, (kcalMap.get(row.user_id) ?? 0) + (row.kcal ?? 0))
    }

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || !c.email) continue
      const kcal = kcalMap.get(c.id) ?? 0
      const target = c.calories ?? 2000
      if (kcal >= target * 0.5) continue
      await sendPush(c.id, 'Хранене', `${kcal} от ${target} ккал за днес.`, 'food')
      const ok = await sendEmail(
        c.email,
        `🍽 Само ${kcal} ккал логнати`,
        emailHtml(
          '🍽',
          'Хранене',
          `Имаш ${kcal} ккал от целевите ${target} за днес. Отвори приложението и добави храната си — точното проследяване е основата на напредъка.`,
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  // ── training (19:00) ──────────────────────────────────────────────────────
  else if (slot === 'training') {
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('user_id')
      .eq('date', today)

    const done = new Set(logs?.map(r => r.user_id) ?? [])

    for (const c of clients) {
      if (!isEnabled(c.id, slot) || done.has(c.id) || !c.email) continue
      await sendPush(c.id, 'Тренировка', 'Още няма логната тренировка за днес.', 'training')
      const ok = await sendEmail(
        c.email,
        '💪 Тренировката чака',
        emailHtml(
          '💪',
          'Тренировка',
          'Все още нямаш логната тренировка за днес. Дори 30 минути правят разлика — запиши сесията в приложението.',
          c.name ?? '',
        ),
        resendKey, fromEmail,
      )
      if (ok) sent++
    }
  }

  return new Response(JSON.stringify({ slot, sent, clients: clients.length }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
