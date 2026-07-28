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

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  key: string,
  from: string,
) {
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

  // Fetch all clients + their email reminder preferences
  const { data: clients, error: clientsErr } = await supabase
    .from('profiles')
    .select(`
      id, email, name, calories,
      reminder_settings ( weight_email, habits_email, supplements_email, water_email, food_email, training_email )
    `)
    .eq('role', 'client')
    .not('email', 'is', null)

  if (clientsErr || !clients?.length) {
    return new Response(JSON.stringify({ slot, sent: 0, clients: 0 }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  // Helper: is this slot enabled for a client? (default true if no settings row yet)
  const SLOT_KEY: Record<string, string> = {
    weight: 'weight_email', habits: 'habits_email', supplements: 'supplements_email',
    water: 'water_email', food: 'food_email', training: 'training_email',
  }
  function isEnabled(client: { reminder_settings: Record<string, boolean> | null }, slotName: string) {
    const rs = client.reminder_settings
    if (!rs) return true                      // no row yet → defaults all on
    if (rs['email_enabled'] === false) return false  // master switch off
    return rs[SLOT_KEY[slotName]] !== false
  }

  let sent = 0

  // ── weight (07:30) ────────────────────────────────────────────────────────
  if (slot === 'weight') {
    const { data: logged } = await supabase
      .from('weight_logs')
      .select('user_id')
      .eq('date', today)

    const done = new Set(logged?.map(r => r.user_id) ?? [])
    console.log(`weight: today=${today} logged=${done.size}/${clients.length}`)

    for (const c of clients) {
      if (!isEnabled(c, slot) || done.has(c.id) || !c.email) continue
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
      if (!isEnabled(c, slot) || done.has(c.id) || !c.email) continue
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
      if (!missing.has(c.id) || !c.email) continue
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
      if (!c.email) continue
      const glasses = waterMap.get(c.id) ?? 0
      if (glasses >= 4) continue
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
      if (!c.email) continue
      const kcal = kcalMap.get(c.id) ?? 0
      const target = c.calories ?? 2000
      if (kcal >= target * 0.5) continue
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
      if (!isEnabled(c, slot) || done.has(c.id) || !c.email) continue
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
