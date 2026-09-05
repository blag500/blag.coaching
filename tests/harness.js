/* Приложението, пуснато без база.
 *
 * Всеки екран зад входа искаше сесия и данни, което значеше, че единственото
 * място, което тестовете и една проверка с очи можеха да стигнат, беше
 * лендингът. Оттам идваше и старият смоук набор: писан срещу приложение с
 * четири раздела на английски, което вече не съществува, и червен от толкова
 * време, че никой не го гледаше.
 *
 * Тук сесията се подава наготово в localStorage, а всяка заявка към Supabase
 * се посреща от таблиците по-долу. Нищо не излиза към мрежата и нищо не се
 * пише в продукционната база — приложението обаче не знае разликата: получава
 * същите форми, които PostgREST би върнал.
 */

export const PROJECT_REF = 'eiltoadzaqbuqdilsfpi'
export const USER_ID     = '00000000-0000-4000-8000-000000000001'
export const COACH_ID    = '00000000-0000-4000-8000-000000000002'

/** Днес, като PostgREST би го върнал. */
export function today(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export const PROFILE = {
  id: USER_ID,
  email: 'test@blag.local',
  name: 'Тест Клиент',
  role: 'client',
  plan: 'pro',
  onboarding_done: true,
  coach_id: COACH_ID,
  calories: 2400, protein: 180, carbs: 250, fat: 70,
  target_weight: 82,
  goal: 'cut',
  avatar_url: null,
  username: 'test',
  dashboard_cards: null,
  water_target: 8,
  /* План с два блока: един за вдигане и един за почивка/кардио. Вторият е
     тук нарочно — той е единственият, който досега не можеше да се отбележи,
     и без него тестът не вижда точно това, което е поправено. */
  training_plan: [
    {
      id: '0', label: 'Upper A', isRest: false,
      groups: ['upper'], muscles: [],
      exercises: [
        { id: '0-0', name: 'Лежанка', sets: '4', reps: '6–8' },
        { id: '0-1', name: 'Гребане', sets: '3', reps: '8–10' },
      ],
    },
    {
      id: '1', label: 'Почивка / Кардио', isRest: true,
      groups: [], muscles: [],
      exercises: [
        { id: '1-0', name: 'Кардио по избор', sets: '1', reps: '30–45 мин' },
        { id: '1-1', name: 'Подвижност',      sets: '1', reps: '15 мин'    },
      ],
    },
  ],
  habits: [
    { id: 'water',    emoji: '💧',  label: 'Вода 3л'       },
    { id: 'protein',  emoji: '🥩',  label: 'Протеин'       },
    { id: 'training', emoji: '🏋️', label: 'Тренировка'    },
    { id: 'sleep',    emoji: '😴',  label: 'Сън 7ч'        },
    { id: 'steps',    emoji: '👟',  label: '10 000 крачки' },
    { id: 'nosugar',  emoji: '🚫',  label: 'Без захар'     },
  ],
}

/* Един ден с живот в него: част от навиците отметнати, част от водата налята,
   храна в дневника. Празният ден показва празни състояния и не казва нищо за
   това как изглеждат лентите, броячите и цветовете. */
export const TABLES = {
  profiles: [PROFILE],
  habit_completions: [
    { id: 1, user_id: USER_ID, habit_id: 'water',    date: today(), completed: true },
    { id: 2, user_id: USER_ID, habit_id: 'protein',  date: today(), completed: true },
    { id: 3, user_id: USER_ID, habit_id: 'training', date: today(), completed: true },
    { id: 4, user_id: USER_ID, habit_id: 'sleep',    date: today(), completed: true },
  ],
  // Колоната е log_date, не date — hook-ът филтрира по нея.
  water_logs: [{ id: 1, user_id: USER_ID, log_date: today(), glasses: 5 }],
  food_logs: [
    { id: 'f1', user_id: USER_ID, date: today(), name: 'Овесени ядки', grams: 80,  kcal: 304, protein: 10.6, carbs: 52, fat: 5.4, meal_type: 'breakfast', estimated: null },
    { id: 'f2', user_id: USER_ID, date: today(), name: 'Пилешко филе', grams: 250, kcal: 412, protein: 77.5, carbs: 0,  fat: 9,   meal_type: 'lunch',     estimated: null },
    { id: 'f3', user_id: USER_ID, date: today(), name: 'Ориз варен',   grams: 300, kcal: 390, protein: 8.1,  carbs: 84, fat: 0.9, meal_type: 'lunch',     estimated: null },
    { id: 'f4', user_id: USER_ID, date: today(), name: 'Извара',       grams: 200, kcal: 196, protein: 24,   carbs: 7.2, fat: 8,  meal_type: 'snack',     estimated: true },
  ],
  weight_logs: Array.from({ length: 10 }, (_, i) => ({
    id: `w${i}`, user_id: USER_ID, date: today(27 - i * 3),
    kg: Math.round((88 - i * 0.45) * 10) / 10,
  })),
  supplements: [
    { id: 's1', user_id: USER_ID, name: 'Креатин',   dose: '5 г',     sort: 0 },
    { id: 's2', user_id: USER_ID, name: 'Витамин D', dose: '4000 IU', sort: 1 },
    { id: 's3', user_id: USER_ID, name: 'Омега 3',   dose: '2 капс.', sort: 2 },
  ],
  /* Приети през последните дни — за да има какво да рисува календарът.
     Креатинът се пие всеки ден, витаминът през ден, омегата рядко. */
  supplement_logs: [
    ...[0, 1, 2, 3, 4, 5, 6].map((d, i) => ({ id: `sl-c${i}`, user_id: USER_ID, supplement_id: 's1', date: today(d) })),
    ...[0, 2, 4, 6].map((d, i)          => ({ id: `sl-d${i}`, user_id: USER_ID, supplement_id: 's2', date: today(d) })),
    ...[1, 5].map((d, i)                => ({ id: `sl-o${i}`, user_id: USER_ID, supplement_id: 's3', date: today(d) })),
  ],
  /* Колоната е date. Сериите се групират по нея; ред без нея прави сесия с
     date: undefined и списъкът пада при подреждането. */
  exercise_logs: [
    { id: 'e1', user_id: USER_ID, date: today(1), exercise_name: 'Лежанка', weight: 100, reps: 8, sets: 1, set_index: 0, replaces: null, notes: null },
    { id: 'e2', user_id: USER_ID, date: today(1), exercise_name: 'Гребане', weight: 80,  reps: 10, sets: 1, set_index: 0, replaces: null, notes: null },
    { id: 'e3', user_id: USER_ID, date: today(3), exercise_name: 'Лежанка с щанга', weight: 95, reps: 8, sets: 1, set_index: 0, replaces: null, notes: null },
  ],
  workout_completions: [
    { id: 'wc1', user_id: USER_ID, completed_date: today(1), block_label: 'Upper A' },
  ],
  sleep_logs: [{ id: 'sl1', user_id: USER_ID, date: today(), hours: 7.5, quality: 4 }],

  /* Адресникът: един приет приятел, една покана към мен, една моя покана без
     отговор. Трите състояния наведнъж, защото празният списък не казва нищо
     за това как изглежда редът с двата бутона. */
  /* Пост от друг човек — за да има чие лице да се отвори от фийда. */
  posts: [
    { id: 'p1', user_id: 'u-ivan', body: 'Първа тренировка от седмицата.', photo_url: null,
      created_at: new Date().toISOString(), kind: 'post', meta: null, post_likes: [], post_comments: [] },
  ],
  friendships: [
    { id: 'fr1', requester_id: USER_ID, addressee_id: 'u-ivan',  status: 'accepted', created_at: new Date().toISOString() },
    { id: 'fr2', requester_id: 'u-mara', addressee_id: USER_ID,  status: 'pending',  created_at: new Date().toISOString() },
    { id: 'fr3', requester_id: USER_ID, addressee_id: 'u-petar', status: 'pending',  created_at: new Date().toISOString() },
  ],
  follows: [
    { follower_id: USER_ID, followee_id: 'u-coach', created_at: new Date().toISOString() },
  ],
  /* Заготовки — две за гърди и една без папка, за да се види и подредбата,
     и подреждането по мускулна група в молива. */
  /* Задачи с час — за времевата линия. Една се застъпва с друга,
     за да се види деленето по ширина. */
  tasks: [
    { id: 't1', user_id: USER_ID, text: 'Обаждане на клиент', done: false, priority: 2, category: 'general', due_date: today(), start_time: '09:00:00', duration_min: 60, created_at: new Date().toISOString() },
    { id: 't2', user_id: USER_ID, text: 'Пазар', done: false, priority: 1, category: 'general', due_date: today(), start_time: '09:30:00', duration_min: 45, created_at: new Date().toISOString() },
    { id: 't3', user_id: USER_ID, text: 'Напиши пост', done: true, priority: 1, category: 'general', due_date: today(), start_time: '13:00:00', duration_min: 30, created_at: new Date().toISOString() },
    { id: 't4', user_id: USER_ID, text: 'Без час — стои само в списъка', done: false, priority: 1, category: 'general', due_date: null, start_time: null, duration_min: null, created_at: new Date().toISOString() },
  ],
  /* Същото движение, писано по два начина — точно случаят, заради който
     съществува обединяването. */
  exercise_aliases: [],
  exercise_library: [
    { id: 'el1', user_id: USER_ID, name: 'Дъмбели на наклон', folder: 'Заместители за гърди', scheme: '3 × 8–10', muscle: 'chest', created_at: new Date().toISOString() },
    { id: 'el2', user_id: USER_ID, name: 'Кросовер', folder: 'Заместители за гърди', scheme: '3 × 12', muscle: 'chest', created_at: new Date().toISOString() },
    { id: 'el3', user_id: USER_ID, name: 'Лицева опора', folder: null, scheme: null, muscle: null, created_at: new Date().toISOString() },
  ],
  feed_authors: [
    { id: 'u-ivan',  name: 'Иван Петров',  username: 'ivan',  avatar_url: null, role: 'client', bio: null },
    { id: 'u-mara',  name: 'Мара Илиева',  username: 'mara',  avatar_url: null, role: 'client', bio: null },
    { id: 'u-petar', name: 'Петър Георгиев', username: 'pesho', avatar_url: null, role: 'client', bio: null },
    { id: 'u-coach', name: 'Николай Благьов', username: 'blag', avatar_url: null, role: 'coach',  bio: null },
  ],
}

const RPC = {
  get_coach_id: COACH_ID,
  email_status: 'confirmed',
  food_history: [],
  get_all_coaches: [],
}

const CORS = {
  'access-control-allow-origin':   '*',
  'access-control-allow-headers':  '*',
  'access-control-allow-methods':  '*',
  'access-control-expose-headers': 'content-range',
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/* Филтрите на PostgREST, колкото трябват тук: `col=eq.value`.
   Ред без нито един разпознат филтър се смята за незасегнат — по-добре
   заявка, която не изтрива нищо, отколкото такава, която изтрива всичко. */
function matchesFilters(row, url) {
  const params = new URL(url).searchParams
  let seen = 0
  for (const [col, raw] of params.entries()) {
    if (col === 'select' || col === 'order' || col === 'limit' || col === 'offset') continue
    if (!String(raw).startsWith('eq.')) continue
    seen++
    if (String(row[col]) !== String(raw).slice(3)) return false
  }
  return seen > 0
}

/** single() и maybeSingle() искат обект, не масив — казват го в Accept. */
function wantsSingle(req) {
  return (req.headers()['accept'] || '').includes('pgrst.object')
}

/**
 * Слага сесия и посреща всичко към Supabase.
 *
 * Вика се ПРЕДИ page.goto — заявките тръгват от първия кадър.
 */
export async function signIn(page, { theme = 'dark', profile = {}, lang = 'bg' } = {}) {
  const merged = { ...PROFILE, ...profile }
  const tables = { ...TABLES, profiles: [merged] }

  await page.addInitScript(
    ({ ref, user, th, lg }) => {
      const session = {
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        // Далеч в бъдещето: клиентът иначе решава, че сесията е изтекла, и
        // тръгва да я подновява още преди първото рисуване.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        refresh_token: 'test-refresh',
        user: {
          id: user, aud: 'authenticated', role: 'authenticated',
          email: 'test@blag.local', app_metadata: {}, user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session))
      localStorage.setItem('blag_theme', th)
      localStorage.setItem('blag_lang', lg)
      // Поздравът и подсказката за известия стоят пред екрана и го крият.
      localStorage.setItem('blag_welcome_seen', '1')
      // Ключът е този, който NotificationPrompt чете — иначе листът застава
      // пред целия екран и всяка снимка е негова.
      localStorage.setItem('notif_prompt_last_shown', String(Date.now()))
    },
    { ref: PROJECT_REF, user: merged.id, th: theme, lg: lang },
  )

  await page.route('**/*.supabase.co/**', route => {
    const req = route.request()
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS, body: '' })
    }

    const path = new URL(req.url()).pathname

    // ── вход ──
    if (path.includes('/auth/v1/')) {
      if (path.endsWith('/user')) return json(route, { id: merged.id, email: merged.email })
      return json(route, {})
    }

    // ── функции ──
    const rpc = path.match(/\/rest\/v1\/rpc\/([a-z_]+)$/)
    if (rpc) return json(route, RPC[rpc[1]] ?? null)

    // ── таблици ──
    const table = path.match(/\/rest\/v1\/([a-z_]+)$/)?.[1]
    if (!table) return json(route, [])

    /* Писането се помни до края на теста.
     *
     * Дотук писането само се потвърждаваше и следващото четене го
     * нямаше. Значеше, че всичко, което се записва и после се пречита —
     * обединяване на упражнения, добавяне на приятел, заготовка — не може
     * да се тества изобщо.
     *
     * Състоянието живее в `tables` — копие за този тест, не общо за
     * набора: два теста, които си делят базата, се влияят по ред, който
     * никой не е писал.
     */
    if (req.method() !== 'GET') {
      let sent = null
      try { sent = JSON.parse(req.postData() || 'null') } catch { /* празно тяло */ }
      const rowsIn = Array.isArray(sent) ? sent : [sent].filter(Boolean)
      if (!tables[table]) tables[table] = []

      if (req.method() === 'DELETE') {
        const keep = tables[table].filter(r => !matchesFilters(r, req.url()))
        tables[table] = keep
        return json(route, [])
      }

      if (req.method() === 'PATCH') {
        const patch = rowsIn[0] || {}
        const out = []
        tables[table] = tables[table].map(r => {
          if (!matchesFilters(r, req.url())) return r
          const merged = { ...r, ...patch }
          out.push(merged)
          return merged
        })
        /* PATCH връща ЦЕЛИЯ ред, както прави PostgREST. Само пратените
           полета значат, че приложението подменя реда с огризка и той
           изчезва от екрана — бъг, който вече беше гонен в приложението,
           а живееше тук. */
        const first = out[0] ?? { ...patch }
        return json(route, wantsSingle(req) ? first : out)
      }

      const stored = rowsIn.map(r => ({
        id: `new-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        ...r,
      }))
      tables[table].push(...stored)
      return json(route, wantsSingle(req) ? stored[0] : stored, 201)
    }

    const rows = tables[table] ?? []
    return json(route, wantsSingle(req) ? (rows[0] ?? null) : rows)
  })
}

/** Сплашът стои три секунди отгоре; всичко останало е под него. */
export async function enterApp(page, opts = {}) {
  await signIn(page, opts)
  await page.goto('/')
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 20000 })
}
