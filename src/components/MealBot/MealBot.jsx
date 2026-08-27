import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './MealBot.module.css'

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTIONS = {
  timing: {
    textKey: 'mb.q.timing',
    options: [
      { value: 'pre',    emoji: '🏋️', labelKey: 'mb.timing.pre'    },
      { value: 'post',   emoji: '💪', labelKey: 'mb.timing.post'   },
      { value: 'normal', emoji: '🍽',  labelKey: 'mb.timing.normal' },
    ],
  },
  taste: {
    textKey: 'mb.q.craving',
    options: [
      { value: 'salty', emoji: '🧂', labelKey: 'mb.craving.salty' },
      { value: 'sweet', emoji: '🍫', labelKey: 'mb.craving.sweet' },
      { value: 'any',   emoji: '🤷', labelKey: 'mb.craving.any'   },
    ],
  },
  cooking: {
    textKey: 'mb.q.effort',
    options: [
      { value: 'none',  emoji: '⚡',  labelKey: 'mb.effort.none'  },
      { value: 'quick', emoji: '🥗', labelKey: 'mb.effort.quick' },
      { value: 'full',  emoji: '👨‍🍳', labelKey: 'mb.effort.full'  },
    ],
  },
  calories: {
    textKey: 'mb.q.size',
    options: [
      { value: 'light',    emoji: '🥗', labelKey: 'mb.size.light'    },
      { value: 'moderate', emoji: '🍱', labelKey: 'mb.size.moderate' },
      { value: 'heavy',    emoji: '🍖', labelKey: 'mb.size.heavy'    },
      { value: 'any',      emoji: '🎯', labelKey: 'mb.size.any'      },
    ],
  },
}

const REACTION_KEYS = {
  timing:   { pre: 'mb.ack.pre',     post: 'mb.ack.post',        normal: 'mb.ack.normal' },
  taste:    { salty: 'mb.ack.salty', sweet: 'mb.ack.sweet',      any: 'mb.ack.any' },
  cooking:  { none: 'mb.ack.none',   quick: 'mb.ack.quick',      full: 'mb.ack.full' },
  calories: { light: 'mb.ack.light', moderate: 'mb.ack.moderate',
              heavy: 'mb.ack.heavy', any: 'mb.ack.anySize' },
}

const FLOW = ['timing', 'taste', 'cooking', 'calories']

const MACRO_META = {
  protein: { labelKey: 'mb.macro.protein', emoji: '🥩', unit: 'g' },
  carbs:   { labelKey: 'mb.macro.carbs',   emoji: '🍞', unit: 'g' },
  fat:     { labelKey: 'mb.macro.fat',     emoji: '🧈', unit: 'g' },
  kcal:    { labelKey: 'mb.macro.kcal',    emoji: '🔥', unitKey: 'mb.unit.kcal' },
}

/** Мерната единица на макроса — калориите са единствените с преводима. */
const macroUnit = (t, m) => (m.unitKey ? t(m.unitKey) : m.unit)

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

/** Round a gram amount to a realistic serving size. */
function roundServing(g) {
  if (g <= 30)  return 30
  if (g <= 80)  return Math.round(g / 10) * 10
  if (g <= 200) return Math.round(g / 25) * 25
  return Math.round(g / 50) * 50
}

/**
 * Suggest 1-3 foods from history that fit approximately within `gap` of the
 * given macro.  Uses the user's typical serving size — NOT a calculated exact
 * portion — so suggestions are realistic and never try to hit the gap precisely.
 */
function buildMacroSuggestions(macro, gap, foods) {
  const key = macro === 'kcal' ? 'kcalPerGram' : `${macro}PerGram`

  const candidates = foods
    .filter(f => f[key] > 0.01 && f.avgGrams >= 15)
    .map(f => {
      const grams  = roundServing(f.avgGrams)
      const contrib = f[key] * grams
      const ratio  = contrib / gap  // how much of the gap one serving covers
      // Prefer servings that cover 25–100% of what's left per item.
      // Heavily penalise servings that would overshoot by more than 50%.
      const fit = ratio >= 0.2 && ratio <= 1.5
        ? f.frequency * Math.max(0, 1 - Math.abs(ratio - 0.65) * 1.2)
        : 0
      return { ...f, grams, contrib, fit }
    })
    .filter(c => c.fit > 0)
    .sort((a, b) => b.fit - a.fit)

  const result = []
  let totalContrib = 0

  for (const c of candidates) {
    if (result.length >= 3) break
    // Stop adding more items once we're at ~75% coverage with at least one pick
    if (result.length >= 1 && totalContrib >= gap * 0.75) break

    result.push({
      name:    c.name,
      grams:   c.grams,
      kcal:    Math.round(c.kcalPerGram    * c.grams),
      protein: Math.round(c.proteinPerGram * c.grams * 10) / 10,
      carbs:   Math.round(c.carbsPerGram   * c.grams * 10) / 10,
      fat:     Math.round(c.fatPerGram     * c.grams * 10) / 10,
    })
    totalContrib += c.contrib
  }

  return { suggestions: result, totalContrib: Math.round(totalContrib) }
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
  const { t } = useSettings()

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
    addBot(t('mb.intro'))
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
    addUser(t('mb.start'))
    await botSay(QUESTIONS.timing.text, s)
    if (sessionRef.current !== s) return
    setStep('timing')
  }

  async function handleOption(qKey, opt) {
    const s = sessionRef.current
    addUser(`${opt.emoji} ${t(opt.labelKey)}`)
    const newPrefs = { ...prefs, [qKey]: opt.value }
    setPrefs(newPrefs)
    await botSay(t(REACTION_KEYS[qKey][opt.value]), s)
    if (sessionRef.current !== s) return
    const nextIdx = FLOW.indexOf(qKey) + 1
    if (nextIdx < FLOW.length) {
      const nextKey = FLOW[nextIdx]
      await botSay(t(QUESTIONS[nextKey].textKey), s)
      if (sessionRef.current !== s) return
      setStep(nextKey)
    } else {
      await botSay(t('mb.analysing'), s)
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
      await botSay(t('mb.noMatch'), s)
      if (sessionRef.current === s) setStep('empty')
      return
    }

    setSuggestions(ranked)
    setSuggIdx(0)

    const top = ranked[0]
    const timingNote =
      finalPrefs.timing === 'post' ? t('mb.note.post') :
      finalPrefs.timing === 'pre'  ? t('mb.note.pre') :
                                     t('mb.note.normal')

    await botSay(
      `${t('mb.foundIt')}\n\n` +
      `🍴 **${top.name}**\n` +
      `${t('mb.suggestMacros', {
        kcal: Math.round(top.kcal),
        p: Math.round(top.protein * 10) / 10,
        c: Math.round(top.carbs * 10) / 10,
        f: Math.round(top.fat * 10) / 10,
      })}\n` +
      `${t(top.frequency === 1 ? 'mb.eatenOnce' : 'mb.eatenMany', { n: top.frequency })}\n\n` +
      timingNote,
      s
    )
    if (sessionRef.current === s) setStep('results')
  }

  async function handleNextSuggestion() {
    const s = sessionRef.current
    const next = suggIdx + 1
    if (next >= suggestions.length) {
      addUser(t('mb.showOther'))
      await botSay(t('mb.exhausted'), s)
      return
    }
    setSuggIdx(next)
    addUser(t('mb.showOther'))
    const item = suggestions[next]
    await botSay(
      `${t('mb.oneMore')}\n\n🍴 **${item.name}**\n` +
      `${t('mb.nextMacros', {
        kcal: Math.round(item.kcal),
        p: Math.round(item.protein * 10) / 10,
        g: Math.round(item.grams),
      })}\n` +
      `${t(item.frequency === 1 ? 'mb.eatenOnce' : 'mb.eatenMany', { n: item.frequency })}`,
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
    addUser(t('mb.analyseDay'))

    await botSay(t('mb.loadingLog'), s)
    if (sessionRef.current !== s) return

    // Targets from profile
    const targets = {
      kcal:    profile?.calories ?? 0,
      protein: profile?.protein  ?? 0,
      carbs:   profile?.carbs    ?? 0,
      fat:     profile?.fat      ?? 0,
    }

    if (!targets.protein && !targets.kcal) {
      await botSay(t('mb.noTargets'), s)
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
      `${t('mb.dayHeader')}\n\n` +
      `${t('mb.dayKcal',    { v: totals.kcal,    t: targets.kcal,    pct: pct(totals.kcal, targets.kcal) })}\n` +
      `${t('mb.dayProtein', { v: totals.protein, t: targets.protein, pct: pct(totals.protein, targets.protein) })}\n` +
      `${t('mb.dayCarbs',   { v: totals.carbs,   t: targets.carbs,   pct: pct(totals.carbs, targets.carbs) })}\n` +
      `${t('mb.dayFat',     { v: totals.fat,     t: targets.fat,     pct: pct(totals.fat, targets.fat) })}`

    await botSay(statusMsg, s)
    if (sessionRef.current !== s) return

    if (Object.keys(deficits).length === 0) {
      await botSay(t('mb.allCovered'), s)
      if (sessionRef.current === s) setStep('empty')
      return
    }

    const deficitLines = Object.entries(deficits)
      .map(([k, v]) => t('mb.deficitLine', {
        emoji: MACRO_META[k].emoji,
        label: t(MACRO_META[k].labelKey),
        v,
        unit: macroUnit(t, MACRO_META[k]),
      }))
      .join('\n')

    await botSay(t('mb.deficits', { lines: deficitLines }), s)
    if (sessionRef.current !== s) return

    setMacroDeficits(deficits)
    setStep('macroSelect')
  }

  async function handleMacroPick(macro) {
    const s = sessionRef.current
    const m = MACRO_META[macro]
    addUser(t('mb.coverMacro', { emoji: m.emoji, label: t(m.labelKey) }))

    await botSay(t('mb.analysingMacro', { label: t(m.labelKey).toLowerCase() }), s)
    if (sessionRef.current !== s) return

    const items = await getHistory(s)
    if (!items) return

    const gap = macroDeficits[macro]
    const { suggestions: suggs, totalContrib } = buildMacroSuggestions(macro, gap, items)

    if (!suggs.length) {
      await botSay(
        t('mb.noMacroFoods', { label: t(m.labelKey).toLowerCase() }),
        s
      )
      if (sessionRef.current === s) setStep('macroSelect')
      return
    }

    const foodLines = suggs.map(sg => {
      const macroVal = macro === 'kcal'
        ? t('mb.macroValKcal', { n: sg.kcal })
        : t('mb.macroVal', { n: sg[macro], label: t(m.labelKey).toLowerCase() })
      return t('mb.foodLine', { name: sg.name, g: sg.grams, val: macroVal })
    }).join('\n')

    await botSay(
      t('mb.macroSuggest', {
        gap, unit: macroUnit(t, m), lines: foodLines, total: totalContrib,
      }),
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
    addBot(t('mb.whichOther'))
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
      await botSay(t('mb.notEnoughHist'), s)
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
    setMessages([{ from: 'bot', text: t('mb.restart'), id: Date.now() }])
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
              {t('mb.start')}
            </button>
            <button className={styles.analysisBtn} onClick={handleDailyAnalysis} type="button">
              {t('mb.analyseDay')}
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
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        )}

        {/* ── Meal suggestion result ── */}
        {step === 'results' && currentItem && (
          <div className={styles.resultBtns}>
            <button className={styles.addBtn} onClick={handleAddSuggestion} type="button">
              {t('mb.addToLog')}
            </button>
            <button className={styles.nextBtn} onClick={handleNextSuggestion} type="button">
              {t('mb.other')}
            </button>
            <button className={styles.restartBtn} onClick={handleRestart} type="button">
              {t('mb.newQuestion')}
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
                  {t('mb.macroNeeded', { label: t(m.labelKey), gap, unit: macroUnit(t, m) })}
                </button>
              )
            })}
            <button className={styles.restartBtn} onClick={handleRestart} type="button">
              {t('mb.newQuestion2')}
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
                    {t('mb.itemMacros', { g: item.grams, kcal: item.kcal, p: item.protein, c: item.carbs, f: item.fat })}
                  </span>
                </div>
                <button
                  className={styles.macroSugAddBtn}
                  onClick={() => handleAddMacroItem(item, i)}
                  disabled={addedItems[i]}
                  type="button"
                >
                  {addedItems[i] ? '✓' : t('mb.add')}
                </button>
              </div>
            ))}
            <div className={styles.macroResultActions}>
              <button className={styles.nextBtn} onClick={handlePickAnotherMacro} type="button">
                {t('mb.otherMacro')}
              </button>
              <button className={styles.restartBtn} onClick={handleRestart} type="button">
                {t('mb.newQuestion2')}
              </button>
            </div>
          </div>
        )}

        {step === 'empty' && (
          <button className={styles.restartBtn} onClick={handleRestart} type="button">
            {t('mb.tryAgain')}
          </button>
        )}

      </div>
    </div>
  )
}
