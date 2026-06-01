import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './MealBot.module.css'

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTIONS = {
  timing: {
    text: 'Кога е храненето? 🕐',
    options: [
      { value: 'pre',    emoji: '🏋️', label: 'Преди тренировка' },
      { value: 'post',   emoji: '💪', label: 'След тренировка' },
      { value: 'normal', emoji: '🍽',  label: 'Обичайно хранене' },
    ],
  },
  taste: {
    text: 'Какво ти се яде?',
    options: [
      { value: 'salty', emoji: '🧂', label: 'Солено' },
      { value: 'sweet', emoji: '🍫', label: 'Сладко' },
      { value: 'any',   emoji: '🤷', label: 'Без значение' },
    ],
  },
  cooking: {
    text: 'Колко искаш да готвиш?',
    options: [
      { value: 'none',  emoji: '⚡',  label: 'Без готвене' },
      { value: 'quick', emoji: '🥗', label: 'До 15 минути' },
      { value: 'full',  emoji: '👨‍🍳', label: 'Готов съм да готвя' },
    ],
  },
  calories: {
    text: 'Колко калории?',
    options: [
      { value: 'light',    emoji: '🥗', label: 'Леко  (до 400)' },
      { value: 'moderate', emoji: '🍱', label: 'Умерено  (400–700)' },
      { value: 'heavy',    emoji: '🍖', label: 'Заситено  (700+)' },
      { value: 'any',      emoji: '🎯', label: 'Без значение' },
    ],
  },
}

const REACTIONS = {
  timing: {
    pre:    'Добра идея! 🔋 Ще потърся нещо с добри въглехидрати за енергия.',
    post:   'Страхотно! 💪 Трябват протеини за възстановяване.',
    normal: 'Разбрано! 🍽 Ще намерим нещо вкусно и балансирано.',
  },
  taste: {
    salty: 'Солено — класиката. 🧂',
    sweet: 'Сладко е! Понякога е необходимо. 🍫',
    any:   'Гъвкав! Нямам ограничения. 🤷',
  },
  cooking: {
    none:  'Без готвене — разумно! ⚡',
    quick: '15 минути — напълно достатъчно! 🥗',
    full:  'Готов да готвиш — обичам ентусиазма! 👨‍🍳',
  },
  calories: {
    light:    'Леко хранене — умно! 🥗',
    moderate: 'Умерено — перфектен баланс! 🍱',
    heavy:    'Заситено — трябва ти гориво! 🍖',
    any:      'Без ограничения — харесва ми! 🎯',
  },
}

const FLOW = ['timing', 'taste', 'cooking', 'calories']

const MACRO_META = {
  protein: { label: 'Протеин',      emoji: '🥩', unit: 'g' },
  carbs:   { label: 'Въглехидрати', emoji: '🍞', unit: 'g' },
  fat:     { label: 'Мазнини',      emoji: '🧈', unit: 'g' },
  kcal:    { label: 'Калории',      emoji: '🔥', unit: 'ккал' },
}

// ─── Session persistence ──────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function sessionKey(userId) {
  return `blag_mealbot_${userId}_${todayStr()}`
}

function loadSession(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(sessionKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(userId, state) {
  if (!userId) return
  try {
    localStorage.setItem(sessionKey(userId), JSON.stringify(state))
  } catch {}
}

function clearSession(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(sessionKey(userId))
  } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreItem(item, prefs) {
  let score = 0
  score += Math.min(item.frequency * 1.5, 12)
  if (item.kcal > 0) {
    if (prefs.timing === 'post') score += (item.protein * 4 / item.kcal) * 20
    if (prefs.timing === 'pre')  score += (item.carbs   * 4 / item.kcal) * 16
  }
  const k = item.kcal
  if (prefs.calories === 'light')    score += k <= 400 ? 10 : k > 600 ? -8 : 2
  if (prefs.calories === 'moderate') score += (k >= 300 && k <= 750) ? 10 : 0
  if (prefs.calories === 'heavy')    score += k >= 500 ? 10 : k < 250 ? -6 : 2
  if (prefs.calories === 'any')      score += 4
  return score
}

/**
 * Greedily pick 1-3 foods from history to cover `gap` of the given macro.
 * Returns portion-adjusted food objects + remaining deficit after the picks.
 */
function buildMacroSuggestions(macro, gap, foods) {
  const key = macro === 'kcal' ? 'kcalPerGram' : `${macro}PerGram`

  const sorted = foods
    .filter(f => f[key] > 0.01) // must contain a meaningful amount
    .sort((a, b) => b[key] - a[key])
    .slice(0, 15) // top 15 most dense candidates

  const result = []
  let remaining = gap

  for (const food of sorted) {
    if (remaining <= 0.5) break
    if (result.length >= 3) break

    // How many grams to cover `remaining`?
    const gramsNeeded  = remaining / food[key]
    // Cap at 1.5× typical serving or 500 g; minimum 30 g
    const maxGrams     = Math.min(food.avgGrams * 1.5, 500)
    const rawGrams     = Math.max(30, Math.min(gramsNeeded, maxGrams))
    const grams        = Math.round(rawGrams / 10) * 10  // round to nearest 10 g

    result.push({
      name:    food.name,
      grams,
      kcal:    Math.round(food.kcalPerGram    * grams),
      protein: Math.round(food.proteinPerGram * grams * 10) / 10,
      carbs:   Math.round(food.carbsPerGram   * grams * 10) / 10,
      fat:     Math.round(food.fatPerGram     * grams * 10) / 10,
    })

    remaining -= food[key] * grams
  }

  return { suggestions: result, remaining: Math.max(0, Math.round(remaining * 10) / 10) }
}

/**
 * Aggregate raw food_log rows into per-food summary with per-gram macro ratios.
 */
function aggregateFoodHistory(rows) {
  const map = {}
  for (const e of rows) {
    if (!e.grams || e.grams <= 0) continue
    const key = e.name.toLowerCase().trim()
    if (!map[key]) map[key] = { name: e.name, n: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
    map[key].n++
    map[key].kcal    += e.kcal    || 0
    map[key].protein += e.protein || 0
    map[key].carbs   += e.carbs   || 0
    map[key].fat     += e.fat     || 0
    map[key].grams   += e.grams   || 0
  }
  return Object.values(map)
    .filter(m => m.grams > 0)
    .map(m => ({
      name:           m.name,
      frequency:      m.n,
      avgGrams:       m.grams   / m.n,
      kcalPerGram:    (m.kcal    / m.n) / (m.grams / m.n),
      proteinPerGram: (m.protein / m.n) / (m.grams / m.n),
      carbsPerGram:   (m.carbs   / m.n) / (m.grams / m.n),
      fatPerGram:     (m.fat     / m.n) / (m.grams / m.n),
      // kept for old flow
      kcal:    m.kcal    / m.n,
      protein: m.protein / m.n,
      carbs:   m.carbs   / m.n,
      fat:     m.fat     / m.n,
    }))
}

function parseBold(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Sub-components ──────────────────────────────────────────────────────────

function BotBubble({ text }) {
  return (
    <div className={styles.bubbleRow}>
      <span className={styles.avatar}>🤖</span>
      <div className={`${styles.bubble} ${styles.botBubble}`}>
        {text.split('\n').map((line, i, arr) => (
          <span key={i}>{parseBold(line)}{i < arr.length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className={`${styles.bubbleRow} ${styles.userRow}`}>
      <div className={`${styles.bubble} ${styles.userBubble}`}>{text}</div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className={styles.bubbleRow}>
      <span className={styles.avatar}>🤖</span>
      <div className={`${styles.bubble} ${styles.botBubble} ${styles.typing}`}>
        <span /><span /><span />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MealBot({ onAddRaw }) {
  const { user, profile } = useAuth()

  // ── Restore persisted session (today only) ────────────────────────────────
  const [saved] = useState(() => loadSession(user?.id))

  const [messages, setMessages]               = useState(saved?.messages           ?? [])
  const [step, setStep]                       = useState(saved?.step               ?? 'welcome')
  const [prefs, setPrefs]                     = useState(saved?.prefs              ?? {})
  const [suggestions, setSuggestions]         = useState(saved?.suggestions        ?? [])
  const [suggIdx, setSuggIdx]                 = useState(saved?.suggIdx            ?? 0)
  const [typing, setTyping]                   = useState(false)
  const [macroDeficits, setMacroDeficits]     = useState(saved?.macroDeficits      ?? {})
  const [macroSuggestions, setMacroSuggestions] = useState(saved?.macroSuggestions ?? [])
  const [addedItems, setAddedItems]           = useState(saved?.addedItems         ?? {})
  const [historyCache, setHistoryCache]       = useState(null) // never persist cache

  const sessionRef = useRef(0)
  const feedRef    = useRef(null)

  const addBot  = (text) => setMessages(p => [...p, { from: 'bot',  text, id: Date.now() + Math.random() }])
  const addUser = (text) => setMessages(p => [...p, { from: 'user', text, id: Date.now() + Math.random() }])

  async function botSay(text, session) {
    setTyping(true)
    await delay(750)
    if (sessionRef.current !== session) return
    setTyping(false)
    addBot(text)
  }

  // Show welcome only on a fresh session (skip if restoring)
  useEffect(() => {
    if (messages.length > 0) return
    addBot(
      'Здравей! 👋 Аз съм **Благ Бот** — твоят личен хранителен асистент!\n\n' +
      'Не знаеш какво да ядеш? Ще те насоча с 4 бързи въпроса.\n\n' +
      'Или анализирам деня ти и ти казвам точно как да покриеш оставащите макроси! 📊'
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist session to localStorage on every meaningful change
  useEffect(() => {
    saveSession(user?.id, {
      messages, step, prefs, suggestions, suggIdx,
      macroDeficits, macroSuggestions, addedItems,
    })
  }, [messages, step, prefs, suggestions, suggIdx, macroDeficits, macroSuggestions, addedItems]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages, typing])

  // ── Existing 4-question flow ────────────────────────────────────────────────

  async function handleStart() {
    const s = ++sessionRef.current
    addUser('Хайде! 🚀')
    await botSay(QUESTIONS.timing.text, s)
    if (sessionRef.current !== s) return
    setStep('timing')
  }

  async function handleOption(qKey, opt) {
    const s = sessionRef.current
    addUser(`${opt.emoji} ${opt.label}`)
    const newPrefs = { ...prefs, [qKey]: opt.value }
    setPrefs(newPrefs)
    await botSay(REACTIONS[qKey][opt.value], s)
    if (sessionRef.current !== s) return
    const nextIdx = FLOW.indexOf(qKey) + 1
    if (nextIdx < FLOW.length) {
      const nextKey = FLOW[nextIdx]
      await botSay(QUESTIONS[nextKey].text, s)
      if (sessionRef.current !== s) return
      setStep(nextKey)
    } else {
      await botSay('Анализирам историята ти... 🧠', s)
      if (sessionRef.current !== s) return
      setStep('analyzing')
      await runMealSuggestion(newPrefs, s)
    }
  }

  async function runMealSuggestion(finalPrefs, s) {
    const items = await getHistory(s)
    if (!items) return

    const ranked = items
      .map(it => ({ ...it, score: scoreItem(it, finalPrefs) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    if (!ranked.length) {
      await botSay('Не намерих подходящи съвпадения. Опитай с различни критерии! 🔄', s)
      if (sessionRef.current === s) setStep('empty')
      return
    }

    setSuggestions(ranked)
    setSuggIdx(0)

    const top = ranked[0]
    const timingNote =
      finalPrefs.timing === 'post' ? 'Богато на протеин — идеално за след тренировка! 💪' :
      finalPrefs.timing === 'pre'  ? 'Добри въглехидрати за енергия! 🔋' :
                                     'Балансирано и вкусно! 🍽'

    await botSay(
      `Намерих го! На база хранителната ти история ти препоръчвам:\n\n` +
      `🍴 **${top.name}**\n` +
      `${Math.round(top.kcal)} ккал · П ${Math.round(top.protein * 10) / 10}g · В ${Math.round(top.carbs * 10) / 10}g · М ${Math.round(top.fat * 10) / 10}g\n` +
      `Хапвал си го **${top.frequency}** ${top.frequency === 1 ? 'път' : 'пъти'}!\n\n` +
      timingNote,
      s
    )
    if (sessionRef.current === s) setStep('results')
  }

  async function handleNextSuggestion() {
    const s = sessionRef.current
    const next = suggIdx + 1
    if (next >= suggestions.length) {
      addUser('Покажи друго 🔄')
      await botSay('Изчерпах всички предложения! Опитай нови критерии. ↺', s)
      return
    }
    setSuggIdx(next)
    addUser('Покажи друго 🔄')
    const item = suggestions[next]
    await botSay(
      `Ето още едно:\n\n🍴 **${item.name}**\n` +
      `${Math.round(item.kcal)} ккал · П ${Math.round(item.protein * 10) / 10}g · ${Math.round(item.grams)}g\n` +
      `Хапвал си го **${item.frequency}** ${item.frequency === 1 ? 'път' : 'пъти'}!`,
      s
    )
  }

  function handleAddSuggestion() {
    const item = suggestions[suggIdx]
    if (!item) return
    onAddRaw({
      name:    item.name,
      grams:   Math.round(item.grams || 100),
      kcal:    Math.round(item.kcal),
      protein: Math.round(item.protein * 10) / 10,
      carbs:   Math.round(item.carbs   * 10) / 10,
      fat:     Math.round(item.fat     * 10) / 10,
    })
  }

  // ── Daily macro analysis flow ───────────────────────────────────────────────

  async function handleDailyAnalysis() {
    const s = ++sessionRef.current
    addUser('📊 Анализирай деня')

    await botSay('Зареждам дневния ти лог... ⏳', s)
    if (sessionRef.current !== s) return

    // Targets from profile
    const targets = {
      kcal:    profile?.calories ?? 0,
      protein: profile?.protein  ?? 0,
      carbs:   profile?.carbs    ?? 0,
      fat:     profile?.fat      ?? 0,
    }

    if (!targets.protein && !targets.kcal) {
      await botSay('Нямаш зададени макро цели. Попитай своя треньор да ги настрои в профила ти! 📊', s)
      if (sessionRef.current === s) setStep('empty')
      return
    }

    // Fetch today's log totals
    const today = new Date().toISOString().slice(0, 10)
    const { data: todayLog } = await supabase
      .from('food_logs')
      .select('kcal, protein, carbs, fat')
      .eq('user_id', user.id)
      .eq('date', today)

    if (sessionRef.current !== s) return

    const totals = (todayLog || []).reduce(
      (acc, e) => ({
        kcal:    Math.round(acc.kcal    + (e.kcal    || 0)),
        protein: Math.round((acc.protein + (e.protein || 0)) * 10) / 10,
        carbs:   Math.round((acc.carbs   + (e.carbs   || 0)) * 10) / 10,
        fat:     Math.round((acc.fat     + (e.fat     || 0)) * 10) / 10,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )

    // Compute per-macro deficits
    const deficits = {}
    if (targets.protein > 0 && targets.protein - totals.protein > 2)
      deficits.protein = Math.round((targets.protein - totals.protein) * 10) / 10
    if (targets.carbs > 0 && targets.carbs - totals.carbs > 2)
      deficits.carbs   = Math.round((targets.carbs   - totals.carbs)   * 10) / 10
    if (targets.fat > 0 && targets.fat - totals.fat > 1)
      deficits.fat     = Math.round((targets.fat     - totals.fat)     * 10) / 10
    if (targets.kcal > 0 && targets.kcal - totals.kcal > 50)
      deficits.kcal    = Math.round(targets.kcal    - totals.kcal)

    const pct = (v, t) => t > 0 ? ` (${Math.round(v / t * 100)}%)` : ''

    const statusMsg =
      `Ето как изглежда денят ти:\n\n` +
      `🔥 Калории: **${totals.kcal}** / ${targets.kcal} ккал${pct(totals.kcal, targets.kcal)}\n` +
      `🥩 Протеин: **${totals.protein}g** / ${targets.protein}g${pct(totals.protein, targets.protein)}\n` +
      `🍞 Въглехидрати: **${totals.carbs}g** / ${targets.carbs}g${pct(totals.carbs, targets.carbs)}\n` +
      `🧈 Мазнини: **${totals.fat}g** / ${targets.fat}g${pct(totals.fat, targets.fat)}`

    await botSay(statusMsg, s)
    if (sessionRef.current !== s) return

    if (Object.keys(deficits).length === 0) {
      await botSay('Браво! 🎉 Покрил си всички макроси за деня! Продължавай така! 💪', s)
      if (sessionRef.current === s) setStep('empty')
      return
    }

    const deficitLines = Object.entries(deficits)
      .map(([k, v]) => `${MACRO_META[k].emoji} **${MACRO_META[k].label}**: нужни още **${v}${MACRO_META[k].unit}**`)
      .join('\n')

    await botSay(`Имаш следните дефицити:\n\n${deficitLines}\n\nКой да покрием? 🎯`, s)
    if (sessionRef.current !== s) return

    setMacroDeficits(deficits)
    setStep('macroSelect')
  }

  async function handleMacroPick(macro) {
    const s = sessionRef.current
    const m = MACRO_META[macro]
    addUser(`${m.emoji} Покрий ${m.label}`)

    await botSay(`Анализирам историята ти за най-добри източници на ${m.label.toLowerCase()}... 🧠`, s)
    if (sessionRef.current !== s) return

    const items = await getHistory(s)
    if (!items) return

    const gap = macroDeficits[macro]
    const { suggestions: suggs, remaining } = buildMacroSuggestions(macro, gap, items)

    if (!suggs.length) {
      await botSay(
        `Не намерих подходящи храни в историята ти за **${m.label.toLowerCase()}**.\n` +
        `Логни по-разнообразни храни и ще мога да предложа по-добро решение! 📝`,
        s
      )
      if (sessionRef.current === s) setStep('macroSelect')
      return
    }

    const foodLines = suggs.map(sg => {
      const macroVal = macro === 'kcal'
        ? `${sg.kcal} ккал`
        : `${sg[macro]}g ${m.label.toLowerCase()}`
      return `🍴 **${sg.name}** — ${sg.grams}g → ${macroVal}`
    }).join('\n')

    const totalMacro = Math.round(
      suggs.reduce((sum, sg) => sum + (macro === 'kcal' ? sg.kcal : sg[macro]), 0) * 10
    ) / 10

    const coverNote = remaining <= 1
      ? `✅ Покрива нуждата ти напълно!`
      : `⚡ Остават още **${remaining}${m.unit}** след добавяне.`

    await botSay(
      `Намерих решение! 💡\n\n` +
      `За да покриеш **${gap}${m.unit}** ${m.label.toLowerCase()}:\n\n` +
      `${foodLines}\n\n` +
      `📊 Общо: **${totalMacro}${m.unit}** — ${coverNote}`,
      s
    )
    if (sessionRef.current !== s) return

    setMacroSuggestions(suggs)
    setAddedItems({})
    setStep('macroResults')
  }

  function handleAddMacroItem(item, idx) {
    onAddRaw(item)
    setAddedItems(prev => ({ ...prev, [idx]: true }))
  }

  function handlePickAnotherMacro() {
    setMacroSuggestions([])
    setAddedItems({})
    setStep('macroSelect')
    addBot('Окей! Кой друг макрос да покрием? 🎯')
  }

  // ── Shared: fetch + cache history ──────────────────────────────────────────

  async function getHistory(s) {
    if (historyCache) return historyCache

    const { data } = await supabase
      .from('food_logs')
      .select('name, grams, kcal, protein, carbs, fat')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(600)

    if (sessionRef.current !== s) return null

    if (!data?.length) {
      await botSay('Нямаш достатъчно хранителна история! Логни повече храни и тогава ще мога да те насоча по-добре. 📝', s)
      if (sessionRef.current === s) setStep('empty')
      return null
    }

    const items = aggregateFoodHistory(data)
    setHistoryCache(items)
    return items
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleRestart() {
    clearSession(user?.id)
    sessionRef.current++
    setTyping(false)
    setMessages([{ from: 'bot', text: 'Хайде наново! 👋 Нови въпроси, нови идеи! 🎯', id: Date.now() }])
    setStep('welcome')
    setPrefs({})
    setSuggestions([])
    setSuggIdx(0)
    setMacroDeficits({})
    setMacroSuggestions([])
    setAddedItems({})
    // keep historyCache — no point re-fetching
  }

  const currentItem = suggestions[suggIdx]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.wrap}>
      <div className={styles.feed} ref={feedRef}>
        {messages.map(msg =>
          msg.from === 'bot'
            ? <BotBubble key={msg.id} text={msg.text} />
            : <UserBubble key={msg.id} text={msg.text} />
        )}
        {typing && <TypingIndicator />}
      </div>

      <div className={styles.controls}>

        {/* ── Welcome ── */}
        {step === 'welcome' && (
          <div className={styles.welcomeBtns}>
            <button className={styles.startBtn} onClick={handleStart} type="button">
              Хайде! 🚀
            </button>
            <button className={styles.analysisBtn} onClick={handleDailyAnalysis} type="button">
              📊 Анализирай деня
            </button>
          </div>
        )}

        {/* ── 4-question flow options ── */}
        {FLOW.includes(step) && (
          <div className={styles.options}>
            {QUESTIONS[step].options.map(opt => (
              <button
                key={opt.value}
                className={styles.optBtn}
                onClick={() => handleOption(step, opt)}
                type="button"
              >
                <span className={styles.optEmoji}>{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Meal suggestion result ── */}
        {step === 'results' && currentItem && (
          <div className={styles.resultBtns}>
            <button className={styles.addBtn} onClick={handleAddSuggestion} type="button">
              + Добави към лога
            </button>
            <button className={styles.nextBtn} onClick={handleNextSuggestion} type="button">
              Друго 🔄
            </button>
            <button className={styles.restartBtn} onClick={handleRestart} type="button">
              Нов въпрос ↺
            </button>
          </div>
        )}

        {/* ── Macro picker ── */}
        {step === 'macroSelect' && Object.keys(macroDeficits).length > 0 && (
          <div className={styles.options}>
            {Object.entries(macroDeficits).map(([macro, gap]) => {
              const m = MACRO_META[macro]
              return (
                <button
                  key={macro}
                  className={styles.optBtn}
                  onClick={() => handleMacroPick(macro)}
                  type="button"
                >
                  <span className={styles.optEmoji}>{m.emoji}</span>
                  {m.label} — нужни {gap}{m.unit}
                </button>
              )
            })}
            <button className={styles.restartBtn} onClick={handleRestart} type="button">
              ↺ Нов въпрос
            </button>
          </div>
        )}

        {/* ── Macro food suggestions ── */}
        {step === 'macroResults' && macroSuggestions.length > 0 && (
          <div className={styles.macroResultsWrap}>
            {macroSuggestions.map((item, i) => (
              <div key={i} className={`${styles.macroSugCard} ${addedItems[i] ? styles.macroSugAdded : ''}`}>
                <div className={styles.macroSugInfo}>
                  <span className={styles.macroSugName}>{item.name}</span>
                  <span className={styles.macroSugMeta}>
                    {item.grams}g · {item.kcal} ккал · П{item.protein}g · В{item.carbs}g · М{item.fat}g
                  </span>
                </div>
                <button
                  className={styles.macroSugAddBtn}
                  onClick={() => handleAddMacroItem(item, i)}
                  disabled={addedItems[i]}
                  type="button"
                >
                  {addedItems[i] ? '✓' : '+ Добави'}
                </button>
              </div>
            ))}
            <div className={styles.macroResultActions}>
              <button className={styles.nextBtn} onClick={handlePickAnotherMacro} type="button">
                Друг макрос 🔄
              </button>
              <button className={styles.restartBtn} onClick={handleRestart} type="button">
                ↺ Нов въпрос
              </button>
            </div>
          </div>
        )}

        {step === 'empty' && (
          <button className={styles.restartBtn} onClick={handleRestart} type="button">
            Опитай отново ↺
          </button>
        )}

      </div>
    </div>
  )
}
