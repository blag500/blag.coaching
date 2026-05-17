import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './MealBot.module.css'

const QUESTIONS = {
  timing: {
    text: 'Кога е храненето? 🕐',
    options: [
      { value: 'pre',    emoji: '🏋️', label: 'Преди тренировка' },
      { value: 'post',   emoji: '💪', label: 'След тренировка' },
      { value: 'normal', emoji: '🍽', label: 'Обичайно хранене' },
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
      { value: 'none',  emoji: '⚡', label: 'Без готвене' },
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

function scoreItem(item, prefs) {
  let score = 0

  // More frequently eaten = higher base score
  score += Math.min(item.frequency * 1.5, 12)

  // Timing — post-workout favours protein, pre-workout favours carbs
  if (item.kcal > 0) {
    if (prefs.timing === 'post') score += (item.protein * 4 / item.kcal) * 20
    if (prefs.timing === 'pre')  score += (item.carbs   * 4 / item.kcal) * 16
  }

  // Calories range
  const k = item.kcal
  if (prefs.calories === 'light')    score += k <= 400 ? 10 : k > 600 ? -8 : 2
  if (prefs.calories === 'moderate') score += (k >= 300 && k <= 750) ? 10 : 0
  if (prefs.calories === 'heavy')    score += k >= 500 ? 10 : k < 250 ? -6 : 2
  if (prefs.calories === 'any')      score += 4

  return score
}

function parseBold(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

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

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function MealBot({ onAddRaw }) {
  const { user } = useAuth()
  const [messages, setMessages]     = useState([])
  const [step, setStep]             = useState('welcome')
  const [prefs, setPrefs]           = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [suggIdx, setSuggIdx]       = useState(0)
  const [typing, setTyping]         = useState(false)
  const sessionRef = useRef(0) // cancels stale async chains on restart
  const endRef = useRef(null)

  const addBot  = (text) => setMessages(p => [...p, { from: 'bot',  text, id: Date.now() + Math.random() }])
  const addUser = (text) => setMessages(p => [...p, { from: 'user', text, id: Date.now() + Math.random() }])

  async function botSay(text, session) {
    setTyping(true)
    await delay(750)
    if (sessionRef.current !== session) return
    setTyping(false)
    addBot(text)
  }

  // Mount: show welcome
  useEffect(() => {
    addBot('Здравей! 👋 Аз съм **Благ Бот** — твоят личен хранителен асистент!\n\nНе знаеш какво да ядеш? Ще те насоча с 4 бързи въпроса! 🎯')
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

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

    // Reaction
    await botSay(REACTIONS[qKey][opt.value], s)
    if (sessionRef.current !== s) return

    const nextIdx = FLOW.indexOf(qKey) + 1

    if (nextIdx < FLOW.length) {
      const nextKey = FLOW[nextIdx]
      await botSay(QUESTIONS[nextKey].text, s)
      if (sessionRef.current !== s) return
      setStep(nextKey)
    } else {
      // All questions answered — analyze
      await botSay('Анализирам историята ти... 🧠', s)
      if (sessionRef.current !== s) return
      setStep('analyzing')
      await analyze(newPrefs, s)
    }
  }

  async function analyze(finalPrefs, s) {
    const { data } = await supabase
      .from('food_logs')
      .select('name, grams, kcal, protein, carbs, fat')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(500)

    if (sessionRef.current !== s) return

    if (!data?.length) {
      await botSay('Нямаш достатъчно история! Логни повече храни и тогава ще мога да те насоча по-добре. 📝', s)
      if (sessionRef.current === s) setStep('empty')
      return
    }

    // Aggregate by food name
    const map = {}
    for (const e of data) {
      const key = e.name.toLowerCase().trim()
      if (!map[key]) map[key] = { name: e.name, n: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
      map[key].n++
      map[key].kcal    += e.kcal    || 0
      map[key].protein += e.protein || 0
      map[key].carbs   += e.carbs   || 0
      map[key].fat     += e.fat     || 0
      map[key].grams   += e.grams   || 0
    }

    const items = Object.values(map).map(m => ({
      name: m.name, frequency: m.n,
      kcal:    m.kcal    / m.n,
      protein: m.protein / m.n,
      carbs:   m.carbs   / m.n,
      fat:     m.fat     / m.n,
      grams:   m.grams   / m.n,
    }))

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
      `Намерих го! На база **${data.length}** хранения ти препоръчвам:\n\n` +
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

  function handleAdd() {
    const item = suggestions[suggIdx]
    if (!item) return
    onAddRaw({
      name:    item.name,
      grams:   Math.round(item.grams),
      kcal:    Math.round(item.kcal),
      protein: Math.round(item.protein * 10) / 10,
      carbs:   Math.round(item.carbs   * 10) / 10,
      fat:     Math.round(item.fat     * 10) / 10,
    })
  }

  function handleRestart() {
    sessionRef.current++
    setTyping(false)
    setMessages([{ from: 'bot', text: 'Хайде наново! 👋 Нови въпроси, нови идеи! 🎯', id: Date.now() }])
    setStep('welcome')
    setPrefs({})
    setSuggestions([])
    setSuggIdx(0)
  }

  const currentItem = suggestions[suggIdx]

  return (
    <div className={styles.wrap}>
      <div className={styles.feed}>
        {messages.map(msg =>
          msg.from === 'bot'
            ? <BotBubble key={msg.id} text={msg.text} />
            : <UserBubble key={msg.id} text={msg.text} />
        )}
        {typing && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      <div className={styles.controls}>
        {step === 'welcome' && (
          <button className={styles.startBtn} onClick={handleStart} type="button">
            Хайде! 🚀
          </button>
        )}

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

        {step === 'results' && currentItem && (
          <div className={styles.resultBtns}>
            <button className={styles.addBtn} onClick={handleAdd} type="button">
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

        {step === 'empty' && (
          <button className={styles.restartBtn} onClick={handleRestart} type="button">
            Опитай отново ↺
          </button>
        )}
      </div>
    </div>
  )
}
