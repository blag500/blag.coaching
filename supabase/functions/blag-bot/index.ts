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

ОТКЪДЕ ЗНАЕШ
- Ако в отговора има число, взето от ДАННИ, завършваш с нов ред: ИЗТОЧНИК: и имената на разделите от ДАННИ, които наистина си ползвал, разделени със запетая.
- Имената са точно както са в ДАННИ — например: днес, седмица_ккал, вода, сън, тегло, упражнения, чекини.
- Ако отговорът не съдържа число от ДАННИ, не пишеш този ред.
- След този ред не пишеш нищо.

Отговаряш само с текста на отговора. Без markdown, без заглавия, без списъци с тирета, освен ако не изброяваш ястия.`

/* Езикът на отговора.
 *
 * Подканата остава на български — тя е дълга, точна и всяко нейно правило е
 * мерено. Преведена наполовина щеше да стане две подкани, които се разминават
 * тихо. Вместо това езикът на отговора се казва с едно изречение накрая, а
 * данните вътре остават с българските си имена: те са вътрешни ключове, не
 * текст за четене.
 *
 * Английският не е украса. Разпознаването на глас на iPhone няма български —
 * Apple просто не го поддържа — но има английски. Тоест за човек с iPhone
 * „англификация" значи „проработило диктуване", а диктуването е това, което
 * прави вписването с думи да си струва.
 */
const LANG_LINE: Record<string, string> = {
  bg: '',
  en: `\n\nВАЖНО: Отговаряй на АНГЛИЙСКИ език, независимо на какъв език са данните и предишните реплики. Имената на разделите в ДАННИ са на български, но това са вътрешни имена — не ги превеждай в отговора, просто говори за тях с обикновени английски думи.`,
}

/* Разчитането на изречение в редове за дневника.
   Отделна подкана и температура нула: тук не се иска мнение, а числа. И
   отделен изход — JSON, не текст — защото след него човекът натиска един бутон
   и редът влиза в дневника му. Затова и нищо не се вписва само: ботът предлага,
   човекът потвърждава. Асистент, който вписва сам, се проверява всеки ден; а
   асистент, който се проверява всеки ден, не върши работа. */
const EXTRACT = `Ти разчиташ изречение, с което човек казва какво е ял или пил, в редове за дневник на храната.

Отговаряш само с JSON и нищо друго:
{"items":[{"name":"извара 2%","grams":200,"kcal":180,"protein":28,"carbs":8,"fat":4,"meal":"breakfast","approx":false}]}

Правила:
- Ако изречението не казва какво е изядено или изпито, връщаш {"items":[]}.
- Ако е въпрос — „колко", „да ям ли", „какво да", „защо" — връщаш {"items":[]}.
- Ако името съвпада с нещо от МОИ ХРАНИ, вземаш неговите числа и ги преизчисляваш за количеството. Тогава approx е false.
- Ако не съвпада, слагаш най-близките числа, които знаеш, и approx е true.
- grams е количеството в грамове или милилитри. „Едно яйце", „филия", „лъжица" се превръщат в грамове.
- kcal, protein, carbs, fat са за цялото количество, не за 100 грама. Числа, не текст.
- meal е едно от: breakfast, lunch, dinner, snack — ако е казано или се подразбира. Иначе null.
- Няколко храни в едно изречение са няколко реда.
- Най-много шест реда.
- Изречението може да е на английски. Тогава името на храната се пише на английски, а числата са същите.`

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

/** Прилича ли изречението на вписване.
 *
 *  Сито преди модела, не вместо него: разчитането е втори разговор с Groq и
 *  не бива да се случва на всеки въпрос „колко ми остава". Ситото е широко —
 *  пропусне ли нещо, човекът си го вписва с ръка, както досега; хване ли
 *  нещо излишно, разчитането връща нула реда и отговорът тръгва по стария път.
 */
function looksLikeLog(q: string) {
  const t = q.toLowerCase()
  /* Английският минава по същия път: същите два списъка, само с други думи.
     Отделен ред, а не добавени думи в българския израз — двата езика се четат
     и се поправят поотделно, а смесеният израз не се чете от никого. */
  if (/^[\x00-\x7f\s.,!?'"-]+$/.test(t)) return looksLikeLogEn(t)
  /* Без граница на дума: в JavaScript тя се мери с \w, а \w е само латиница —
     пред „и" от „изядох" граница няма и изразът не хваща нищо. Съвпадението е
     по част от дума нарочно: „изядох" и „изядохме" са едно и също тук. */
  /* Въпрос е въпрос, дори да има храна в него. */
  if (/[?]/.test(t)) return false
  if (/(колко|какво|защо|кога|дали|да ям|да хапна|мога ли|трябва ли|препоръч)/.test(t)) return false
  return (
    /(изядох|ядох|хапнах|похапнах|изпих|пих|закусих|обядвах|вечерях|взех|сложи|впиши|запиши|запази|добави|отбележи|вписвай)/.test(t) ||
    /\d+\s*(г|гр|грам|грама|мл|ml|g)/.test(t) ||
    /(яйц|филия|филии|лъжиц|порция|шейк|кафе|банан)/.test(t)
  )
}

/** Отделя реда с източниците от отговора.
 *
 *  Помощник, който казва число, трябва да може да каже и откъде го е взел.
 *  Дотук всеки отговор беше твърдение без следа: „белтъкът ти е малко" —
 *  спрямо какво, от кой ден, от кой ред. А ботът ще греши, и точно тогава
 *  човекът трябва да може да провери него, вместо да повярва или да се откаже.
 *
 *  Имената не се вземат на доверие: сверяват се с разделите, които наистина са
 *  влезли в подканата, и се изхвърля всяко, което го няма или е празно.
 *  Иначе „откъде знам" става още едно нещо, което моделът може да измисли.
 */
function splitSources(text: string, context: Record<string, unknown>) {
  /* Търси се самата дума, а не „нов ред и после думата".
     Първият вариант искаше редът да започва на чист ред — а моделът го лепна
     след точката на последното изречение: „...по-точно тегло. ИЗТОЧНИК: тегло,
     вода". Изразът не хвана нищо, отрязването не стана и белегът излезе на
     екрана като част от отговора. Подканата казва „на нов ред", но подканата е
     молба, не гаранция — четенето трябва да издържа и на неспазена молба.
     Взема се ПОСЛЕДНОТО срещане: дума, спомената по средата на разговор, не
     бива да реже отговора наполовина. */
  const at = text.toUpperCase().lastIndexOf('ИЗТОЧНИК')
  const m = at < 0 ? null : /^\s*:?\s*(.*)$/s.exec(text.slice(at + 'ИЗТОЧНИК'.length))
  if (!m) return { reply: text.trim(), sources: [] as string[] }

  const has = (k: string) => {
    const v = context[k]
    if (v == null) return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(x => x != null)
    return true
  }
  const sources = m[1].split(/\n/)[0].split(/[,;]/).map(x => x.trim().replace(/[.\s]+$/, ''))
    .filter(k => k && has(k))
    .slice(0, 4)

  /* Отрязва се до самата дума, заедно с празното и висящия разделител преди
     нея. Точката НЕ се пипа: тя завършва изречението, а не белега — първият
     вариант я махаше и отговорите оставаха без препинание. */
  return {
    reply: text.slice(0, at).replace(/\s*[—–,;:-]?\s*$/, '').trim(),
    sources: [...new Set(sources)],
  }
}

/** Същото сито, но за английско изречение.
 *
 *  Разделено от българското нарочно: думите нямат нищо общо, а един израз с
 *  четирийсет думи на два езика не се чете и не се поправя. Тук важи същото
 *  правило — въпрос е въпрос, дори да има храна в него.
 */
function looksLikeLogEn(t: string) {
  if (/[?]/.test(t)) return false
  if (/\b(how much|how many|what|why|when|should i|can i|could i|do i|recommend|suggest)\b/.test(t)) return false
  return (
    /\b(ate|eaten|had|having|drank|drunk|ate|log|logged|add|note|record|track)\b/.test(t) ||
    /\d+\s*(g|gr|gram|grams|ml|oz|kcal|cal)\b/.test(t) ||
    /\b(egg|eggs|slice|slices|spoon|scoop|shake|coffee|banana|serving)\b/.test(t)
  )
}

/** Изкопава JSON от отговор, който може да е с ограда от код. */
function parseItems(raw: string | null) {
  if (!raw) return []
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return []
  try {
    const o = JSON.parse(m[0])
    const list = Array.isArray(o?.items) ? o.items : []
    return list.slice(0, 6).map((i: Record<string, unknown>) => ({
      name:    String(i.name ?? '').slice(0, 80),
      grams:   Math.max(0, Math.round(Number(i.grams) || 0)),
      kcal:    Math.max(0, Math.round(Number(i.kcal) || 0)),
      protein: Math.max(0, Math.round((Number(i.protein) || 0) * 10) / 10),
      carbs:   Math.max(0, Math.round((Number(i.carbs)   || 0) * 10) / 10),
      fat:     Math.max(0, Math.round((Number(i.fat)     || 0) * 10) / 10),
      meal:    ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(i.meal)) ? String(i.meal) : null,
      approx:  i.approx !== false,
    })).filter((i: { name: string; kcal: number }) => i.name && i.kcal > 0)
  } catch {
    return []
  }
}

/** Вика Groq, минавайки през списъка, докато един отговори. */
/* Седемстотин, не четиристотин: при четиристотин отговор от пет изречения се
   срязваше по средата на думата — „намали въглехидратите и добави малко
   мазнини, за да се доб". Отрязан съвет е по-лош от никакъв, защото човекът
   довършва изречението сам и обикновено не както е било започнато. */
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
async function ask(apiKey: string, messages: unknown[], maxTokens = 1400) {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxTokens, reasoning_effort: 'low' }),
      })
      if (!res.ok) {
        /* Дотук провалът беше тих: и двата модела отказваха, функцията връщаше
           „няма отговор", а на екрана пишеше „нещо се обърка" — без нито един
           ред, по който да се разбере кое се е объркало. Търсенето после опира
           до гадаене между изчерпана квота, пенсиониран модел и твърде дълга
           подкана, а трите се лекуват различно.
           Тялото се реже: съобщенията за грешка от Groq са къси, а дълъг запис
           в дневника е дълъг запис, който никой не чете. */
        const why = await res.text().catch(() => '')
        console.error(`groq ${model} → ${res.status}: ${why.slice(0, 300)}`)
        continue
      }
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return text
      console.error(`groq ${model} → празен отговор`)
    } catch (e) {
      console.error(`groq ${model} → ${String(e).slice(0, 200)}`)
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

  /* На какъв език да отговори. Идва от приложението, защото там е изборът;
     проверява се, защото идва от телефон. */
  const lang = body?.lang === 'en' ? 'en' : 'bg'

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
    meals, mine, recent, learned,
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
      /* Неговите си храни, с числа за сто грама. Разчитането на изречение взема
         числата оттук, когато името съвпада: „изядох извара" за човек, който си
         е вписал изварата, не бива да става догадка на модел. */
      admin.from('custom_foods').select('name, serving_grams, kcal, protein, carbs, fat').eq('user_id', uid).limit(60),
      /* Нишката, не купчината. Осем реплики от този разговор — иначе
         днешният въпрос за водата получава отговор, забъркан с миналоседмичния
         спор за въглехидратите. */
      (chatId
        ? admin.from('bot_messages').select('role, content').eq('chat_id', chatId)
            .order('created_at', { ascending: false }).limit(8)
        : admin.from('bot_messages').select('role, content').eq('user_id', uid).is('chat_id', null)
            .order('created_at', { ascending: false }).limit(8)),
      admin.from('bot_profile').select('learned, events_seen, messages_seen').eq('user_id', uid).maybeSingle(),
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
    { role: 'system', content: SYSTEM + LANG_LINE[lang] },
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

  /* Вписване с думи.
   *
   * „Изядох 200 г извара" не е въпрос и не иска отговор — иска ред в дневника.
   * Дотук единственият път до дневника беше търсачката: отвори, намери, избери
   * количество, впиши. Това е четири стъпки за нещо, което човекът вече е
   * казал с едно изречение, и точно затова дневникът се води по памет вечерта,
   * а не в момента.
   *
   * Тук изречението се разчита в редове и се връща като предложение. Нищо не
   * се вписва само: човекът го вижда и натиска. Асистент, който вписва сам,
   * трябва да се проверява всеки ден — а проверката отнема повече от самото
   * вписване.
   *
   * Числата идват от неговите храни, когато името съвпада; иначе са догадка и
   * редът е отбелязан като приблизителен, за да може денят да се чете честно
   * после.
   */
  let draft: unknown = null
  if (looksLikeLog(question)) {
    const mineList = (mine.data ?? []).map(f =>
      `${f.name} (за ${f.serving_grams ?? 100} г): ${f.kcal ?? '?'} ккал, П${f.protein ?? 0} В${f.carbs ?? 0} М${f.fat ?? 0}`
    )
    const read = await ask(apiKey, [
      { role: 'system', content: EXTRACT + (lang === 'en' ? '\n- Изречението е на английски.' : '') },
      ...(mineList.length ? [{ role: 'system', content: `МОИ ХРАНИ\n${mineList.join('\n')}` }] : []),
      { role: 'user', content: question },
    ], 900)
    const items = parseItems(read)
    if (items.length) {
      /* Отговорът се сглобява тук, а не от модел: това е сбор на числа, които
         вече са известни, и точно за такива неща моделът няма работа. */
      const tot = items.reduce((a: Record<string, number>, i: Record<string, number>) => ({
        kcal: a.kcal + i.kcal, protein: a.protein + i.protein,
        carbs: a.carbs + i.carbs, fat: a.fat + i.fat,
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
      const one = items.length === 1
      const approx = items.some((i: { approx: boolean }) => i.approx)
      /* Сглобява се тук, а не от модел: това е сбор на известни числа. Затова и
         двата езика са изписани — превод на две изречения е по-евтин от още
         едно обръщане към модела, а и по-сигурен. */
      const text = lang === 'en'
        ? (one ? `Read: ${items[0].name}` : `Read ${items.length} rows`) +
          ` — ${Math.round(tot.kcal)} kcal, P${Math.round(tot.protein)} C${Math.round(tot.carbs)} F${Math.round(tot.fat)}.` +
          (approx ? ' The numbers are approximate.' : '') +
          ' Log it?'
        : (one ? `Разчетох ${items[0].name}` : `Разчетох ${items.length} реда`) +
          ` — ${Math.round(tot.kcal)} ккал, П${Math.round(tot.protein)} В${Math.round(tot.carbs)} М${Math.round(tot.fat)}.` +
          (approx ? ' Числата са приблизителни.' : '') +
          ' Да го впиша ли?'

      draft = { items, totals: tot }
      const rememberDraft = admin.from('bot_messages').insert([
        { user_id: uid, chat_id: chatId, role: 'user', content: question },
        { user_id: uid, chat_id: chatId, role: 'bot',  content: text, context: { draft } },
      ])
      /* Предложеното се помни: приемането и отказът след него са материалът,
         от който се учи какво човекът яде наистина. */
      const seen = admin.from('bot_events').insert({ user_id: uid, kind: 'suggested', payload: { items } })
      // deno-lint-ignore no-explicit-any
      const rt0 = (globalThis as any).EdgeRuntime
      if (rt0?.waitUntil) rt0.waitUntil(Promise.all([rememberDraft, seen]))
      else await Promise.all([rememberDraft, seen])

      return json({ reply: text, draft })
    }
  }

  const raw = await ask(apiKey, messages)
  if (!raw) {
    console.error(`без отговор за ${uid}, въпрос ${question.length} знака, нишка ${chatId ?? '—'}`)
    return json({ error: 'no answer' }, 502)
  }
  const { reply, sources } = splitSources(raw, context)

  /* Записва се и въпросът, и отговорът — заедно с това, което ботът е виждал.
     Не се чака: човекът вече има отговора си. */
  const remember = admin.from('bot_messages').insert([
    { user_id: uid, chat_id: chatId, role: 'user', content: question },
    { user_id: uid, chat_id: chatId, role: 'bot',  content: reply, context },
  ])

  /* Ученето. Става рядко и наведнъж, не при всеки въпрос: свиването е втори
     разговор с модела и би удвоило чакането за нещо, което се променя веднъж
     на десет реплики. */
  /* Каквото остава за след отговора, е само записването.
   *
   * Дотук тук стояха и ученето, и прекрояването на заглавието — и двете
   * пуснати през `waitUntil`. Само че изолатът, който обслужва заявката, се
   * пуска веднага щом отговорът замине: в дневниците стои „Shutdown:
   * EarlyDrop" и работата след това просто не се случва. Проверено по
   * резултата — двайсет и пет реплики разговор и нито един ред в bot_profile.
   * Тоест паметта беше написана, пусната и мъртва.
   *
   * Сега и двете живеят в нощната обиколка (`bot-watch`), където никой не чака
   * отговор и времето е колкото трябва. Нито ученето, нито заглавието са
   * спешни — важното е да се случват изобщо.
   */
  const after = async () => {
    try { await remember } catch { /* записът е важен, но не и условие */ }
  }

  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt?.waitUntil) rt.waitUntil(after())
  else after()

  return json({ reply, sources })
})
