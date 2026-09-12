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
- Числото значи точно това, което пише в наблюдението. Разлика, наречена „липса на посока", не се превръща в покачване или сваляне.
- Съветът е за онова, което е измерено. Човек, който тренира редовно, няма нужда да чуе „добави движение" — за него остава храната.
- Не изброяваш дати. Казваш колко пъти и в кой ден от седмицата — редицата дати не значи нищо за четящия, а изяжда цялото изречение.

Отговаряш само с двете изречения.`

/* Езикът на наблюдението. Същият похват като в разговора: подканата остава на
   български, а езикът на изхода се казва накрая. Наблюдението е две изречения —
   превод на цяла подкана заради тях би бил втора подкана, която се разминава с
   първата при всяка поправка. */
const LANG_LINE: Record<string, string> = {
  bg: '',
  en: `\n\nВАЖНО: Пиши двете изречения на АНГЛИЙСКИ език.`,
}

/* Заглавията на правилата, на двата езика. Заглавието стои в списъка с
   разговорите и се чете от човека — то не е вътрешно име. */
const TITLES: Record<string, { bg: string; en: string }> = {
  protein:        { bg: 'Белтъкът три дни',   en: 'Protein, three days' },
  weight_flat:    { bg: 'Теглото стои',       en: 'Weight is flat' },
  water:          { bg: 'Водата четири дни',  en: 'Water, four days' },
  checkin:        { bg: 'Чекинът е закъснял', en: 'Check-in is overdue' },
}

/* Свиването на научено.
   Живее тук, а не в разговора: работата след отговора се пуска заедно с
   изолата, който го е изпратил („Shutdown: EarlyDrop" в дневниците), и просто
   не се случва. Тук никой не чака. */
const DISTILL = `Ти поддържаш кратък списък с това, което се знае за един човек.

Получаваш какво се е помнело ДОСЕГА, какво е предлагал помощникът и какво е приел или отказал човекът, и последните им разговори.

Напиши новия списък — до осем кратки реда на български.
Всеки ред е наблюдение, не съвет. Например: "отказва риба", "приема яйца на закуска", "не иска готвене над 15 минути", "тренира сутрин".

Правила:
- Помниш само трайното: вкусове, отказани храни, навици, часове, ограничения, начин на готвене, повтарящи се оплаквания.
- НЕ помниш днешни числа — калории, макроси, тегло, вода, коя е последната тренировка. Те стоят в данните и утре са други. Ред като "консумира 2043 ккал" утре е лъжа.
- Каквото е в ДОСЕГА и още е вярно, го запазваш дословно. Паметта не се пренаписва всеки път.
- Каквото е в ДОСЕГА, но човекът е казал друго после, го махаш.
- Добавяш новото, което се вижда от данните.
- Нещо, което се е случило веднъж, не е правило — освен ако човекът не го е казал за себе си направо ("не ям риба", "тренирам в шест").
- Без увод, без заключение, без номерация. Само редовете.`

/* Заглавието на пораснал разговор. Кратко до немай-къде: списъкът е тесен и
   реже на един ред. */
const TITLE = `Дай заглавие на този разговор.

До четири думи на български. Без кавички, без точка, без думата „разговор".
Заглавието казва за какво се е говорило, не кой е питал.
Отговаряш само със заглавието.`

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
/* Разсъждаващи модели: таванът трябва да ги побере.
 *
 * gpt-oss мисли, преди да пише, и мисленето се брои в същия таван. При нисък
 * таван цялото отива в разсъждение и `content` се връща празен — с код 200,
 * тоест като успех. Оттам идваха три тихи провала наведнъж: паметта никога не
 * се свиваше, заглавията не се прекрояваха, а дълъг разговор понякога
 * получаваше „нещо се обърка".
 *
 * Лечението е двойно: `reasoning_effort: 'low'` свива мисленето, а таваните са
 * вдигнати, за да има място и за двете. Открито по дневника, след като
 * записването на грешките стана истинско — дотук „!res.ok → continue" гълташе
 * точно това.
 */
async function ask(apiKey: string, messages: unknown[], maxTokens = 900) {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: maxTokens, reasoning_effort: 'low' }),
      })
      if (!res.ok) {
        /* Тихият провал е най-скъпият: и двата модела отказват, функцията
           връща „няма", а после се гадае между изчерпана квота, пенсиониран
           модел и твърде дълга подкана — три неща с три различни лечения. */
        const why = await res.text().catch(() => '')
        console.error(`groq ${model} → ${res.status}: ${why.slice(0, 300)}`)
        continue
      }
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return text
      console.error(`groq ${model} → празен отговор`)
    } catch (e) { console.error(`groq ${model} → ${String(e).slice(0, 200)}`) }
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
    title: 'Белтъкът три дни',   // преведено при писането през TITLES
    fact: `Белтъкът му е под 70% от целта три дни подред: ${vals.map(v => Math.round(v as number)).join(', ')} г при цел ${target} г. Средно ${avg} г.`,
  }
}

// deno-lint-ignore no-explicit-any
function ruleWeightFlat(p: any, weights: any[], trained: number): Finding | null {
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
    title: 'Теглото стои',   // преведено при писането през TITLES
    /* Двете числа се дават заедно с това какво значат.
       Първият опит подаваше само „74 кг преди, 74.2 кг сега" и моделът написа
       „теглото ти се е увеличило с 0.2 кг" — тоест превърна шума в посока.
       Точно обратното на смисъла: правилото се задейства, защото разликата е
       под прага, а не защото има движение. Числото без своето значение се
       тълкува от модела, а моделът тълкува към нещо, което звучи като новина. */
    fact: `Теглото му не се е помръднало за две седмици: ${first} кг тогава, ${last} кг сега. `
        + `Разликата е в рамките на дневните колебания — това НЕ е покачване и НЕ е сваляне, а липса на посока. `
        + `Целта му е „${goal === 'cut' ? 'сваляне' : 'качване'}". `
        /* Колко тренира. Без това моделът съветваше „добави кардио" на човек с
           двайсет и четири тренировки за двайсет и четири дни — съвет, който
           казва „не съм те погледнал". Когато движението го има, остава
           храната. */
        + `За последните две седмици е тренирал ${trained} пъти.`,
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
    title: 'Водата четири дни',   // преведено при писането през TITLES
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
        payload: { dow, dates, day: names[dow] },
        title: `Три пъти в ${names[dow]}`,
        fact: `Пропуснал е тренировката в ${names[dow]} три пъти подред (${dates.reverse().join(', ')}), а в другите дни тренира.`,
      }
    }
  }
  return null
}

// deno-lint-ignore no-explicit-any
function ruleCheckin(p: any, checkins: any[]): Finding | null {
  /* Чекинът е доклад до треньора. Самият треньор няма на кого да го праща —
     за него това правило не значи нищо. */
  if (p.role === 'coach') return null
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
    title: 'Чекинът е закъснял',   // преведено при писането през TITLES
    fact: `Последният му чекин е преди ${passed} дни, а е седмичен.`,
  }
}

/** Ученето и заглавията — нощната поддръжка на паметта.
 *
 *  Две неща, които не са спешни и точно затова не бива да висят на отговора:
 *  свиването на научено е втори разговор с модела, а прекрояването на заглавие
 *  е трети. Закачени за заявката, те или удвояваха чакането, или (както се
 *  оказа) не се случваха изобщо.
 */
// deno-lint-ignore no-explicit-any
async function maintain(admin: any, apiKey: string, uid: string, lang = 'bg') {
  /* ── Научено ── */
  try {
    const [prof, { count: evCount }, { count: msgCount }] = await Promise.all([
      admin.from('bot_profile').select('learned, events_seen, messages_seen')
        .eq('user_id', uid).maybeSingle(),
      admin.from('bot_events').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      admin.from('bot_messages').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ])

    const seen    = prof.data?.events_seen ?? 0
    const seenMsg = prof.data?.messages_seen ?? 0
    const total   = evCount ?? 0
    const totMsg  = msgCount ?? 0

    /* Два брояча, защото има два вида учене. Събитие се пише, когато ботът
       предложи храна и човекът я приеме или откаже — това учи какво яде. Но
       най-важното се казва с думи и веднъж: „не ям риба", „тренирам в шест".
       Десет събития или дванайсет реплики; първият път — при три събития или
       шест реплики, колкото да има от какво да се съди. */
    const first = seen === 0 && seenMsg === 0 && (total >= 3 || totMsg >= 6)
    if (total - seen >= 10 || totMsg - seenMsg >= 12 || first) {
      const [evs, msgs] = await Promise.all([
        admin.from('bot_events').select('kind, payload')
          .eq('user_id', uid).order('created_at', { ascending: false }).limit(80),
        admin.from('bot_messages').select('role, content')
          .eq('user_id', uid).order('created_at', { ascending: false }).limit(60),
      ])

      const distilled = await ask(apiKey, [
        { role: 'system', content: DISTILL + (lang === 'en'
          /* Паметта се води на езика, на който човекът говори сега — заедно с
             пренесените стари редове. Иначе, който смени езика, получава памет
             наполовина на единия и наполовина на другия и не може да я
             прочете, за да я поправи. Цената е, че пренесен ред минава през
             превод — но редовете са къси, а изборът е между леко изменен ред и
             ред, който собственикът му не разбира. */
          ? '\n\nВАЖНО: Пиши всички редове на АНГЛИЙСКИ. Ако ДОСЕГА е на български, преведи редовете, които запазваш.'
          : '\n\nВАЖНО: Пиши всички редове на БЪЛГАРСКИ. Ако ДОСЕГА е на английски, преведи редовете, които запазваш.') },
        {
          role: 'user',
          content:
            (prof.data?.learned ? `ДОСЕГА\n${prof.data.learned}\n\n` : '') +
            `СЪБИТИЯ\n${(evs.data ?? []).map((e: { kind: string; payload: unknown }) => `${e.kind}: ${JSON.stringify(e.payload)}`).join('\n')}\n\n` +
            `РАЗГОВОР\n${[...(msgs.data ?? [])].reverse().map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n')}`,
        },
      ], 1200)

      if (distilled) {
        await admin.from('bot_profile').upsert({
          user_id: uid,
          learned: distilled.slice(0, 1200),
          events_seen: total,
          messages_seen: totMsg,
          updated_at: new Date().toISOString(),
        })
      }
    }
  } catch (e) { console.error(`памет ${uid} → ${String(e).slice(0, 300)}`) }

  /* ── Заглавия ──
     Заглавието е първият въпрос, отрязан — добро за нов разговор, но след
     третата реплика често вече не описва за какво е станало дума. Прекроява се
     веднъж, когато нишката порасне, и това се отбелязва: заглавие, което се
     мени всеки път, е заглавие, по което не може да се търси с памет. */
  try {
    const { data: grown } = await admin.from('bot_chats')
      .select('id').eq('user_id', uid).eq('title_auto', false)
      .order('updated_at', { ascending: false }).limit(3)

    for (const chat of grown ?? []) {
      const { data: all } = await admin.from('bot_messages')
        .select('role, content').eq('chat_id', chat.id)
        .order('created_at', { ascending: true }).limit(12)
      /* Под шест реплики разговорът още е един въпрос с отговор и първият
         въпрос си е точното заглавие. */
      if (!all || all.length < 6) continue

      const made = await ask(apiKey, [
        { role: 'system', content: TITLE + (lang === 'en' ? '\n\nВАЖНО: Заглавието е на АНГЛИЙСКИ.' : '') },
        { role: 'user', content: all.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n') },
      ], 400)
      if (!made) continue

      const clean = made.replace(/["„""'.]/g, '').trim().slice(0, 60)
      if (clean) {
        await admin.from('bot_chats').update({ title: clean, title_auto: true }).eq('id', chat.id)
      }
    }
  } catch (e) { console.error(`заглавие ${uid} → ${String(e).slice(0, 300)}`) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const apiKey = Deno.env.get('GROQ_API_KEY')
  const url    = Deno.env.get('SUPABASE_URL')
  const key    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const secret = Deno.env.get('REMINDER_SECRET')
  if (!apiKey || !url || !key) return json({ error: 'not configured' }, 500)

  /* Ключалката е в заглавка, не в адреса.
     Адресът на всяко викане влиза в дневниците на проекта както си е — тайна,
     сложена в него, се чете после от всеки, който има достъп до дневниците.
     Старият начин остава приет, докато разписанието се смени, но новият е
     по-добрият. */
  const given = req.headers.get('x-bot-secret')
    ?? new URL(req.url).searchParams.get('secret')
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

  /* И треньорът, не само клиентите.
     Правилата гледат вписаното от самия човек — храна, тегло, тренировки — а
     Николай води своите наравно с всички. Ролята му го изключваше от обиколката
     и той не получаваше нищо, докато клиентите получаваха. Правило без данни
     просто не се задейства, така че разширяването не струва нищо на онзи, който
     не си води. */
  const { data: people } = await admin.from('profiles')
    .select('id, name, protein, goal, checkin_day, role, lang')
    .in('role', ['client', 'coach'])

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
        weight_flat:    ruleWeightFlat(p, weights.data ?? [],
          (workouts.data ?? []).filter(w => String(w.completed_date) >= iso(14)).length),
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

      /* Поддръжката върви за всеки, независимо дали има какво да се каже: човек,
         който само пита и никога не получава наблюдение, също трябва да бъде
         запомнен. */
      if (!dry) await maintain(admin, apiKey, uid, p.lang === 'en' ? 'en' : 'bg')

      const pick = ORDER.map(r => found[r]).find(f => f && !said(f.rule)) ?? null
      if (!pick) { out.push({ uid, picked: null }); continue }

      if (dry) { out.push({ uid, picked: pick.rule, fact: pick.fact }); continue }

      /* Езикът на човека. Празно значи български: приложението го записва при
         всяка смяна, а който не го е пипал, е на български. */
      const lang = p.lang === 'en' ? 'en' : 'bg'

      const text = await ask(apiKey, [
        { role: 'system', content: VOICE + LANG_LINE[lang] },
        { role: 'user', content: `НАБЛЮДЕНИЕ\n${pick.fact}` },
      ])
      if (!text) { out.push({ uid, picked: pick.rule, error: 'no answer' }); continue }

      if (peek) { out.push({ uid, picked: pick.rule, text }); continue }

      /* Разговорът се отваря непрочетен и със знак, че го е започнал ботът.
         Влиза в същия списък като останалите: наблюдение, което живее в
         отделно място „известия", се чете веднъж и после никога. */
      const { data: chat } = await admin.from('bot_chats')
        /* title_auto вече е вярно: заглавието е дадено от правилото и е точно.
           Прекрояването в blag-bot гледа този флаг — иначе, отговори ли човекът
           пет-шест реплики, „Три пъти в четвъртък" щеше да бъде заменено с
           преразказ на разговора. */
        .insert({
          user_id: uid,
          title: TITLES[pick.rule]?.[lang] ?? pick.title,
          kind: 'watch', unread: true, title_auto: true,
        })
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
