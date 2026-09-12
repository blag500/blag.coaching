import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Ботът се обажда сам.
 *
 * Дотук чакаше въпрос — значи се ползваше от онези, които вече знаят какво да
 * питат. А човекът, чийто белтък е под целта трети ден подред, точно този
 * въпрос не си го задава: числата стоят в базата, никой не ги гледа и
 * седмицата минава. Разликата между инструмент и треньор е точно тук.
 *
 * Четири решения, които държат това да не се превърне в натякване:
 *
 * 1. Правилата се СМЯТАТ, не се преценяват от модел. Моделът получава готово
 *    число и го облича в едно изречение. Помощник, който сам решава кога има
 *    повод, намира повод всяка вечер.
 *
 * 2. Най-много едно наблюдение на вечер за човек. Две наблюдения в един ден са
 *    оценка на деня, а не забелязано нещо.
 *
 * 3. Всяко правило има своя тишина след себе си. „Белтъкът ти е малко" три
 *    вечери подред не е три пъти по-полезно — то е причината приложението да
 *    се изтрие.
 *
 * 4. Нищо не се изпраща като известие. Наблюдението чака като непрочетен
 *    разговор с точка на балончето. Известие с такова съдържание се изключва
 *    заедно с всички останали, а известията вече са тесното място.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
]

/* Гласът е същият като в разговора, но задачата е друга: тук не се отговаря на
   въпрос, а се започва. Затова и правилата са по-строги — изречение, което
   никой не е поискал, има право само на едно нещо. */
const VOICE = `Ти си Благ Бот — помощникът в приложението на треньора Николай Благьов.

Получаваш едно сметнато наблюдение за един човек и го казваш с думи.

КАК:
- На български, на „ти", две изречения. Първото казва какво си забелязал с числото. Второто — едно конкретно нещо, което може да се направи.
- Числата в наблюдението са верни. Пишеш ги както са ти дадени и не смяташ нови.
- Без поздрав, без обръщение по име, без въведение. Започваш направо от забелязаното.
- Без укор и без оценка. „Белтъкът е под целта три дни" е факт; „не се справяш" е присъда.
- Без лозунги, без емоджита, без възклицателни.
- Без обещания за резултат и без медицински съвети.
- Не изброяваш дати. Казваш колко пъти и в кой ден от седмицата — редицата дати не значи нищо за четящия, а изяжда цялото изречение.

Отговаряш само с двете изречения.`

/* Тишината след всяко правило.
   Не е едно число за всички: теглото, което стои, е бавно нещо и има смисъл да
   се каже веднъж на две седмици; пропуснатата тренировка е седмичен ритъм. */
const QUIET_DAYS: Record<string, number> = {
  protein:        6,
  water:          7,
  weight_flat:    14,
  missed_workout: 7,
  checkin:        5,
}

/* Подредбата по важност. Взема се първото изпълнено, а не най-новото: човек,
   който не се е чекнал и същевременно пие малко вода, има нужда да чуе за
   чекина — оттам минава всичко останало. */
const ORDER = ['checkin', 'weight_flat', 'protein', 'missed_workout', 'water']

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

/* Петстотин, не двеста и двайсет.
   Кирилицата се брои скъпо: две изречения с изброени дати опряха в тавана и
   излязоха срязани по средата на думата — „на 27 август, 3 септем". Отрязано
   наблюдение е по-лошо от никакво, защото човекът довършва изречението сам и
   обикновено не както е било започнато. Същата грешка вече беше правена в
   blag-bot; тук се повтори с по-нисък таван. */
async function ask(apiKey: string, messages: unknown[], maxTokens = 500) {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: maxTokens }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return text
    } catch { /* следващият модел */ }
  }
  return null
}

type Finding = { rule: string; payload: Record<string, unknown>; title: string; fact: string }

/* ── Правилата ─────────────────────────────────────────────────────────────
   Всяко връща или наблюдение, или null. Числата в `fact` влизат в подканата
   дословно — моделът има право да ги преразкаже, но не да ги смята. */

// deno-lint-ignore no-explicit-any
function ruleProtein(p: any, byDay: Record<string, { protein: number }>): Finding | null {
  const target = Number(p.protein) || 0
  if (target <= 0) return null
  /* Вчера и назад, не днес: днешният ден още не е свършил и белтък под целта
     на обяд не е пропуснат белтък. */
  const days = [1, 2, 3].map(d => iso(d))
  const vals = days.map(d => byDay[d]?.protein)
  if (vals.some(v => v == null)) return null            // ден без нито един ред не се съди
  if (!vals.every(v => (v as number) < target * 0.7)) return null
  const avg = Math.round(vals.reduce((a, v) => a + (v as number), 0) / vals.length)
  return {
    rule: 'protein',
    payload: { target, days, vals },
    title: 'Белтъкът три дни',
    fact: `Белтъкът му е под 70% от целта три дни подред: ${vals.map(v => Math.round(v as number)).join(', ')} г при цел ${target} г. Средно ${avg} г.`,
  }
}

// deno-lint-ignore no-explicit-any
function ruleWeightFlat(p: any, weights: any[]): Finding | null {
  const goal = String(p.goal ?? '')
  if (goal !== 'cut' && goal !== 'bulk') return null
  if (weights.length < 4) return null
  /* Две седмици, защото под това всяко „стои" е шум от вода и сол. */
  const recent = weights.filter(w => w.date >= iso(14))
  if (recent.length < 4) return null
  const kgs = recent.map(w => Number(w.kg)).filter(n => !isNaN(n))
  const first = kgs[kgs.length - 1], last = kgs[0]
  if (Math.abs(last - first) > 0.4) return null
  return {
    rule: 'weight_flat',
    payload: { first, last, days: 14, goal },
    title: 'Теглото стои',
    fact: `Теглото му стои от две седмици: ${first} кг преди две седмици, ${last} кг сега, при цел „${goal === 'cut' ? 'сваляне' : 'качване'}".`,
  }
}

// deno-lint-ignore no-explicit-any
function ruleWater(water: any[]): Finding | null {
  /* Осем чаши. Толкова е и в приложението: целта не се пази в профила, а е
     подразбиране на похвата — ако някога се превърне в поле, се чете оттам. */
  const target = 8
  const days = [1, 2, 3, 4].map(d => iso(d))
  const vals = days.map(d => water.find(w => w.log_date === d)?.glasses)
  if (vals.some(v => v == null)) return null
  if (!vals.every(v => (v as number) < target / 2)) return null
  return {
    rule: 'water',
    payload: { target, days, vals },
    title: 'Водата четири дни',
    fact: `Водата му е под половината от целта четири дни подред: ${vals.join(', ')} чаши при цел ${target}.`,
  }
}

// deno-lint-ignore no-explicit-any
function ruleMissedWorkout(workouts: any[]): Finding | null {
  /* Един и същи ден от седмицата, пропуснат три пъти подред. Търси се ритъм, а
     не общо мързел: „сряда не ти се получава" е нещо, което може да се смени —
     „тренираш малко" не е. */
  const done = new Set((workouts ?? []).map(w => String(w.completed_date)))
  for (let dow = 0; dow < 7; dow++) {
    const dates: string[] = []
    for (let d = 1; d <= 21 && dates.length < 3; d++) {
      const day = new Date()
      day.setDate(day.getDate() - d)
      if (day.getDay() === dow) dates.push(day.toISOString().slice(0, 10))
    }
    if (dates.length < 3) continue
    if (dates.every(d => !done.has(d))) {
      /* Само ако другаде се тренира: човек, който не е тренирал нито веднъж,
         няма пропуснат ден — той има друг разговор, и той е с Николай. */
      if (done.size < 3) return null
      const names = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота']
      return {
        rule: 'missed_workout',
        payload: { dow, dates },
        title: `Три пъти в ${names[dow]}`,
        fact: `Пропуснал е тренировката в ${names[dow]} три пъти подред (${dates.reverse().join(', ')}), а в другите дни тренира.`,
      }
    }
  }
  return null
}

// deno-lint-ignore no-explicit-any
function ruleCheckin(p: any, checkins: any[]): Finding | null {
  const day = p.checkin_day
  if (day == null) return null
  const last = checkins?.[0]?.date ?? null
  /* Два дни след деня за чекин. Един ден закъснение е живот, не пропускане. */
  const due = iso(2)
  if (last && last >= due) return null
  if (!last) return null                 // никога нечекван човек се води другаде
  const passed = Math.round((Date.now() - new Date(last).getTime()) / 86400000)
  if (passed < 9) return null            // чекинът е седмичен: под девет дни още е в срок
  return {
    rule: 'checkin',
    payload: { last, passed },
    title: 'Чекинът е закъснял',
    fact: `Последният му чекин е преди ${passed} дни, а е седмичен.`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const apiKey = Deno.env.get('GROQ_API_KEY')
  const url    = Deno.env.get('SUPABASE_URL')
  const key    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const secret = Deno.env.get('REMINDER_SECRET')
  if (!apiKey || !url || !key) return json({ error: 'not configured' }, 500)

  /* Същата ключалка като на напомнянията: функцията се вика от разписанието в
     базата, не от телефон. */
  const given = new URL(req.url).searchParams.get('secret')
  if (secret && given !== secret) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(url, key)
  /* Две степени на празен ход.
     `dry=1` само смята и казва кое правило е уцелило — с него се проверява
     дали праговете са разумни, без нито едно обръщение към модела.
     `dry=2` минава и през модела и връща текста, но не пише нищо. С него се
     чете как ще звучи изречението, преди да застане пред клиент. */
  const dryParam = new URL(req.url).searchParams.get('dry')
  const dry  = dryParam === '1'
  const peek = dryParam === '2'

  const { data: people } = await admin.from('profiles')
    .select('id, name, protein, goal, checkin_day')
    .eq('role', 'client')

  const out: Record<string, unknown>[] = []

  for (const p of people ?? []) {
    const uid = p.id
    try {
      const [food, weights, water, workouts, checkins, log] = await Promise.all([
        admin.from('food_logs').select('date, protein').eq('user_id', uid).gte('date', iso(4)),
        admin.from('weight_logs').select('date, kg').eq('user_id', uid)
          .order('date', { ascending: false }).limit(20),
        admin.from('water_logs').select('log_date, glasses').eq('user_id', uid).gte('log_date', iso(5)),
        admin.from('workout_completions').select('completed_date').eq('user_id', uid).gte('completed_date', iso(24)),
        admin.from('form_checkins').select('date').eq('user_id', uid)
          .order('date', { ascending: false }).limit(1),
        admin.from('bot_watch_log').select('rule, created_at').eq('user_id', uid).gte('created_at', iso(21)),
      ])

      /* Белтъкът по дни: сборът е тук, а не в подканата — число, сметнато от
         модел, е число, на което не може да се вярва. */
      const byDay: Record<string, { protein: number }> = {}
      for (const r of food.data ?? []) {
        const d = String(r.date)
        byDay[d] = { protein: (byDay[d]?.protein ?? 0) + (Number(r.protein) || 0) }
      }

      const found: Record<string, Finding | null> = {
        protein:        ruleProtein(p, byDay),
        weight_flat:    ruleWeightFlat(p, weights.data ?? []),
        water:          ruleWater(water.data ?? []),
        missed_workout: ruleMissedWorkout(workouts.data ?? []),
        checkin:        ruleCheckin(p, checkins.data ?? []),
      }

      /* Тишината. Правило, казано наскоро, се пропуска — дори да е още вярно.
         Особено ако е още вярно: човекът го е чул и или го оправя, или е
         решил да не го оправя, и второто не се лекува с повторение. */
      const said = (rule: string) => {
        const rows = (log.data ?? []).filter(r => r.rule === rule)
        if (!rows.length) return false
        const newest = rows.map(r => new Date(r.created_at).getTime()).sort((a, b) => b - a)[0]
        return (Date.now() - newest) / 86400000 < (QUIET_DAYS[rule] ?? 7)
      }

      const pick = ORDER.map(r => found[r]).find(f => f && !said(f.rule)) ?? null
      if (!pick) { out.push({ uid, picked: null }); continue }

      if (dry) { out.push({ uid, picked: pick.rule, fact: pick.fact }); continue }

      const text = await ask(apiKey, [
        { role: 'system', content: VOICE },
        { role: 'user', content: `НАБЛЮДЕНИЕ\n${pick.fact}` },
      ])
      if (!text) { out.push({ uid, picked: pick.rule, error: 'no answer' }); continue }

      if (peek) { out.push({ uid, picked: pick.rule, text }); continue }

      /* Разговорът се отваря непрочетен и със знак, че го е започнал ботът.
         Влиза в същия списък като останалите: наблюдение, което живее в
         отделно място „известия", се чете веднъж и после никога. */
      const { data: chat } = await admin.from('bot_chats')
        .insert({ user_id: uid, title: pick.title, kind: 'watch', unread: true })
        .select('id').single()

      if (chat) {
        await admin.from('bot_messages').insert({
          user_id: uid, chat_id: chat.id, role: 'bot', content: text,
          context: { watch: pick.rule, payload: pick.payload },
        })
      }

      await admin.from('bot_watch_log').insert({
        user_id: uid, rule: pick.rule, payload: pick.payload, chat_id: chat?.id ?? null,
      })

      out.push({ uid, picked: pick.rule, chat: chat?.id ?? null })
    } catch (e) {
      out.push({ uid, error: String(e) })
    }
  }

  return json({ checked: (people ?? []).length, result: out })
})
