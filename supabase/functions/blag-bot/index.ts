import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Благ Бот — отговаря на въпрос върху вписаното от самия човек.
 *
 * Три правила, на които стъпва всичко останало:
 *
 * 1. Числата не се измислят. Моделът получава днешния прием, целите, седмицата
 *    назад, навиците, тренировките и теглото наготово и има право само да ги
 *    тълкува. Асистент, който сбърка едно число за протеин, е по-лош от липсващ
 *    асистент, защото на него му се вярва.
 *
 * 2. Данните се четат от сървъра, не се приемат от телефона. Клиентът праща
 *    само въпрос; кой пита се разбира от неговия токен. Иначе всеки може да
 *    поиска чужд контекст, като подаде чуждо id.
 *
 * 3. Каквото е извън храната, тренировката и вписаното, не е негова работа.
 *    Болка, лекарства, кръвни изследвания — отива при Николай. Приложението е
 *    на треньор, а не кабинет.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* Същият списък и същата причина като в останалите функции: Groq маха модели
   без предупреждение, а един пенсиониран модел не бива да сваля бота. */
const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
]

const SYSTEM = `Ти си Благ Бот — помощникът в приложението на треньора Николай Благьов.

КАК ГОВОРИШ
- На български, накратко, като човек. Две-три изречения, освен ако не те питат за нещо, което иска повече.
- Без лозунги, без емоджита, без възклицания. Не хвалиш без повод.
- Говориш на „ти".
- Завършваш мисълта си. По-добре две цели изречения, отколкото пет започнати.
- Отговаряш на въпроса, който ти е зададен, и на нищо друго. Не преразказваш предишния си отговор и не добавяш числа, които не са поискани — питат ли те за тренировката, не започваш с водата.
- Не казваш „обикновено" и „средно", ако не си го сметнал от дните в ДАННИ.

КАКВО ЗНАЕШ
- Получаваш числата на човека наготово в раздела ДАННИ. Те са истината.
- В ДАННИ има: кой е той, целите му, днешният прием по хранения, седмицата назад, водата, сънят с качество и енергия, навиците, тренировките и упражненията с килограми, теглото, добавките и кога са взети, чекините и бележките на треньора.
- НИКОГА не измисляш и не преизчисляваш число, което не е в ДАННИ. Ако нещо липсва, казваш, че не го знаеш.
- Преди да кажеш „нямам данни", погледни пак: питат те за неща, които почти винаги ги има.
- Ако предлагаш храна, тя идва от списъка ЯСТИЯ. Може да предложиш и нещо извън него, но тогава казваш, че макросите са приблизителни.

КАКВО НЕ ПРАВИШ
- Не даваш медицински съвети. При въпрос за болка, лекарства, изследвания или бременност казваш да пише на Николай.
- Не обещаваш резултат за срок.
- Не коментираш тегло с оценка — само с числа и посока.

НАУЧЕНОТО
- В раздела НАУЧЕНО стоят неща, забелязани от предишни разговори. Съобразяваш се с тях, но ако човекът каже нещо друго сега, сега е по-вярно.

Отговаряш само с текста на отговора. Без markdown, без заглавия, без списъци с тирета, освен ако не изброяваш ястия.`

/* Свиването на научено. Отделна подкана, защото задачата е друга: не разговор,
   а няколко реда наблюдение, които ще влязат в следващата подкана. */
const DISTILL = `Ти четеш какво е предлагал един помощник за хранене и какво е приел или отказал човекът.

Напиши до шест кратки реда на български — какво си струва да се помни за този човек.
Всеки ред е наблюдение, не съвет. Например: "отказва риба", "приема яйца на закуска", "не иска готвене над 15 минути".

Пиши само наблюдения, които се виждат от данните. Ако нещо се е случило веднъж, не е правило.
Без увод, без заключение, без номерация. Само редовете.`

const MAX_Q = 500

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function iso(daysBack = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

/** Вика Groq, минавайки през списъка, докато един отговори. */
/* Седемстотин, не четиристотин: при четиристотин отговор от пет изречения се
   срязваше по средата на думата — „намали въглехидратите и добави малко
   мазнини, за да се доб". Отрязан съвет е по-лош от никакъв, защото човекът
   довършва изречението сам и обикновено не както е било започнато. */
async function ask(apiKey: string, messages: unknown[], maxTokens = 700) {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxTokens }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return text
    } catch {
      /* следващият модел */
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const apiKey = Deno.env.get('GROQ_API_KEY')
  const url    = Deno.env.get('SUPABASE_URL')
  const key    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !url || !key) return json({ error: 'not configured' }, 500)

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(url, key)
  const { data: userData, error: authErr } = await admin.auth.getUser(token)
  const uid = userData?.user?.id
  if (authErr || !uid) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const question = String(body?.question ?? '').trim().slice(0, MAX_Q)
  if (!question) return json({ error: 'missing question' }, 400)

  /* Коя нишка. Проверява се, че е негова — идва от телефона, значи може да е
     каквото и да е, а нишките на другите не са му работа. */
  let chatId: string | null = typeof body?.chatId === 'string' ? body.chatId : null
  if (chatId) {
    const { data: own } = await admin.from('bot_chats')
      .select('id').eq('id', chatId).eq('user_id', uid).maybeSingle()
    if (!own) chatId = null
  }

  // ── Данните, наготово ─────────────────────────────────────────────────────
  const today = iso()
  const weekAgo = iso(7)

  /* Всичко, което човекът е вписал за себе си.
     Дотук тук стояха шест заявки и ботът отговаряше „за вода нямам данни" на
     човек, който си пише водата всеки ден. Помощник, който казва „не знам" за
     нещо, което приложението знае, е по-лош от липсващ: следващия път не го
     питат изобщо. */
  const [
    profile, todayFood, weekFood, habits, workouts, weights,
    water, sleep, supps, suppLogs, checkin, exercises, sessions, prep,
    meals, recent, learned,
  ] = await Promise.all([
      admin.from('profiles')
        .select('name, calories, protein, carbs, fat, goal, age, gender, height_cm, activity_level, target_weight, habits, checkin_day, coach_notes')
        .eq('id', uid).maybeSingle(),
      admin.from('food_logs').select('name, grams, kcal, protein, carbs, fat, meal_type').eq('user_id', uid).eq('date', today),
      admin.from('food_logs').select('date, kcal, protein, carbs, fat').eq('user_id', uid).gte('date', weekAgo),
      admin.from('habit_completions').select('date, habit_id, completed').eq('user_id', uid).gte('date', weekAgo),
      admin.from('workout_completions').select('completed_date, block_label').eq('user_id', uid).gte('completed_date', weekAgo),
      admin.from('weight_logs').select('date, kg').eq('user_id', uid).order('date', { ascending: false }).limit(14),
      admin.from('water_logs').select('log_date, glasses').eq('user_id', uid).gte('log_date', weekAgo),
      admin.from('sleep_logs').select('date, duration_hours, quality, stress, energy, soreness, mood').eq('user_id', uid).gte('date', weekAgo),
      admin.from('supplements').select('id, name, dose, timing, active').eq('user_id', uid),
      admin.from('supplement_logs').select('supplement_id, date').eq('user_id', uid).gte('date', weekAgo),
      admin.from('form_checkins').select('date, weight_kg, sleep_hours, hunger, stress, energy, digestion, steps_avg, weekly_win, weekly_improve, notes')
        .eq('user_id', uid).order('date', { ascending: false }).limit(2),
      admin.from('exercise_logs').select('date, exercise_name, weight, reps').eq('user_id', uid).gte('date', weekAgo),
      admin.from('training_sessions').select('scheduled_at, title, status').eq('client_id', uid).order('scheduled_at', { ascending: false }).limit(4),
      admin.from('prep_protocols').select('competition_name, competition_date, target_weight, ready_weeks').eq('user_id', uid).eq('active', true).maybeSingle(),
      admin.from('meal_library').select('name, kcal, protein, carbs, fat, prep_min, category').eq('user_id', uid).limit(40),
      /* Нишката, не купчината. Осем реплики от този разговор — иначе
         днешният въпрос за водата получава отговор, забъркан с миналоседмичния
         спор за въглехидратите. */
      (chatId
        ? admin.from('bot_messages').select('role, content').eq('chat_id', chatId)
            .order('created_at', { ascending: false }).limit(8)
        : admin.from('bot_messages').select('role, content').eq('user_id', uid).is('chat_id', null)
            .order('created_at', { ascending: false }).limit(8)),
      admin.from('bot_profile').select('learned, events_seen').eq('user_id', uid).maybeSingle(),
    ])

  // deno-lint-ignore no-explicit-any
  const p: any = profile.data ?? {}
  // deno-lint-ignore no-explicit-any
  const sum = (rows: any[], f: string) =>
    Math.round((rows || []).reduce((a, r) => a + (Number(r[f]) || 0), 0) * 10) / 10

  const totals = {
    kcal:    sum(todayFood.data ?? [], 'kcal'),
    protein: sum(todayFood.data ?? [], 'protein'),
    carbs:   sum(todayFood.data ?? [], 'carbs'),
    fat:     sum(todayFood.data ?? [], 'fat'),
  }

  /* Седмицата — по дни, не общо: „средно 2100" крие три дни на 1400 и четири
     на 2600, а точно разликата между тези два случая е въпросът. */
  const byDay: Record<string, number> = {}
  for (const r of weekFood.data ?? []) byDay[r.date] = (byDay[r.date] || 0) + (r.kcal || 0)

  const habitDays: Record<string, number> = {}
  for (const r of habits.data ?? []) if (r.completed) habitDays[r.date] = (habitDays[r.date] || 0) + 1

  /* Кои добавки са взети кой ден — по име, не по id: моделът чете имена. */
  const suppName = new Map((supps.data ?? []).map(r => [r.id, r.name]))
  const suppByDay: Record<string, string[]> = {}
  for (const r of suppLogs.data ?? []) {
    const n = suppName.get(r.supplement_id)
    if (!n) continue
    if (!suppByDay[r.date]) suppByDay[r.date] = []
    suppByDay[r.date].push(n)
  }

  const context = {
    човекът: {
      име: p.name ?? null, възраст: p.age ?? null, пол: p.gender ?? null,
      височина_см: p.height_cm ?? null, активност: p.activity_level ?? null,
      цел: p.goal ?? null, целево_тегло: p.target_weight ?? null,
      ден_за_чекин: p.checkin_day ?? null,
    },
    цели: { ккал: p.calories ?? null, протеин: p.protein ?? null, въглехидрати: p.carbs ?? null, мазнини: p.fat ?? null },
    днес: {
      ...totals,
      хранения: (todayFood.data ?? []).map(r => `${r.name} ${r.grams ?? '?'}г (${r.meal_type ?? '—'}) — ${Math.round(r.kcal ?? 0)} ккал`),
      вода_чаши: (water.data ?? []).find(r => r.log_date === today)?.glasses ?? 0,
    },
    седмица_ккал: Object.entries(byDay).sort().map(([d, k]) => `${d}: ${Math.round(k)} ккал`),
    вода: (water.data ?? []).sort((a, b) => a.log_date.localeCompare(b.log_date))
            .map(r => `${r.log_date}: ${r.glasses} чаши`),
    сън: (sleep.data ?? []).sort((a, b) => a.date.localeCompare(b.date))
           .map(r => `${r.date}: ${r.duration_hours ?? '?'}ч, качество ${r.quality ?? '?'}/5`
             + (r.energy ? `, енергия ${r.energy}` : '')
             + (r.stress ? `, стрес ${r.stress}` : '')
             + (r.soreness ? `, треска ${r.soreness}` : '')),
    навици_по_дни: Object.entries(habitDays).sort().map(([d, n]) => `${d}: ${n} отметнати`),
    навиците_му: Array.isArray(p.habits)
      ? p.habits.map((h: { label?: string; id?: string }) => h?.label ?? h?.id).filter(Boolean)
      : [],
    тренировки: (workouts.data ?? []).map(r => `${r.completed_date}: ${r.block_label ?? 'тренировка'}`),
    упражнения: (exercises.data ?? []).map(r => `${r.date}: ${r.exercise_name} ${r.weight ?? '?'}кг × ${r.reps ?? '?'}`),
    тегло: (weights.data ?? []).map(r => `${r.date}: ${r.kg} кг`),
    добавки: (supps.data ?? []).filter(r => r.active !== false)
      .map(r => `${r.name}${r.dose ? ` (${r.dose})` : ''}${r.timing ? ` — ${r.timing}` : ''}`),
    добавки_взети: Object.entries(suppByDay).sort().map(([d, list]) => `${d}: ${list.join(', ')}`),
    чекини: (checkin.data ?? []).map(r =>
      `${r.date}: тегло ${r.weight_kg ?? '?'}кг, сън ${r.sleep_hours ?? '?'}ч, глад ${r.hunger ?? '?'}, стрес ${r.stress ?? '?'}, енергия ${r.energy ?? '?'}, храносмилане ${r.digestion ?? '?'}, стъпки ${r.steps_avg ?? '?'}`
      + (r.weekly_win ? `; победа: ${r.weekly_win}` : '')
      + (r.weekly_improve ? `; за подобряване: ${r.weekly_improve}` : '')),
    насрочени: (sessions.data ?? []).map(r => `${r.scheduled_at}: ${r.title ?? 'тренировка'} (${r.status ?? '?'})`),
    подготовка: prep.data
      ? `${prep.data.competition_name ?? 'състезание'} на ${prep.data.competition_date ?? '?'}, цел ${prep.data.target_weight ?? '?'}кг`
      : null,
    бележки_на_треньора: p.coach_notes ?? null,
  }

  const mealList = (meals.data ?? []).map(m =>
    `${m.name} — ${m.kcal ?? '?'} ккал, П${m.protein ?? '?'} В${m.carbs ?? '?'} М${m.fat ?? '?'}${m.prep_min ? `, ${m.prep_min} мин` : ''}`
  )

  // ── Подканата ─────────────────────────────────────────────────────────────
  const messages: unknown[] = [
    { role: 'system', content: SYSTEM },
    {
      role: 'system',
      content:
        `ДАННИ\n${JSON.stringify(context, null, 1)}\n\n` +
        (mealList.length ? `ЯСТИЯ\n${mealList.join('\n')}\n\n` : '') +
        (learned.data?.learned ? `НАУЧЕНО\n${learned.data.learned}\n` : ''),
    },
    /* Нишката, най-старото първо. Осем реда стигат за „а защо", без да
       превърнат всяка подкана в цял архив. */
    ...[...(recent.data ?? [])].reverse().map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: question },
  ]

  const reply = await ask(apiKey, messages)
  if (!reply) return json({ error: 'no answer' }, 502)

  /* Записва се и въпросът, и отговорът — заедно с това, което ботът е виждал.
     Не се чака: човекът вече има отговора си. */
  const remember = admin.from('bot_messages').insert([
    { user_id: uid, chat_id: chatId, role: 'user', content: question },
    { user_id: uid, chat_id: chatId, role: 'bot',  content: reply, context },
  ])

  /* Ученето. Става рядко и наведнъж, не при всеки въпрос: свиването е втори
     разговор с модела и би удвоило чакането за нещо, което се променя веднъж
     на десет реплики. */
  const after = async () => {
    try {
      await remember
      const { count } = await admin
        .from('bot_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)

      const seen  = learned.data?.events_seen ?? 0
      const total = count ?? 0
      /* Десет нови събития или първите три: под този праг „научено" щеше да е
         догадка от един случай, а точно това подканата забранява. */
      if (total - seen < 10 && !(seen === 0 && total >= 3)) return

      const [evs, msgs] = await Promise.all([
        admin.from('bot_events').select('kind, payload, created_at')
          .eq('user_id', uid).order('created_at', { ascending: false }).limit(80),
        admin.from('bot_messages').select('role, content')
          .eq('user_id', uid).order('created_at', { ascending: false }).limit(40),
      ])

      const distilled = await ask(apiKey, [
        { role: 'system', content: DISTILL },
        {
          role: 'user',
          content:
            `СЪБИТИЯ\n${(evs.data ?? []).map(e => `${e.kind}: ${JSON.stringify(e.payload)}`).join('\n')}\n\n` +
            `РАЗГОВОР\n${[...(msgs.data ?? [])].reverse().map(m => `${m.role}: ${m.content}`).join('\n')}`,
        },
      ], 300)

      if (!distilled) return
      await admin.from('bot_profile').upsert({
        user_id: uid,
        learned: distilled.slice(0, 1200),
        events_seen: total,
        updated_at: new Date().toISOString(),
      })
    } catch {
      /* Ученето е подобрение, не условие: ако падне, ботът отговаря както
         досега, само че помни малко по-малко. */
    }
  }

  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt?.waitUntil) rt.waitUntil(after())
  else after()

  return json({ reply })
})
