import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import { createPortal } from 'react-dom'
import Pictogram from '../Pictogram/Pictogram'
import { isHidden, setHidden } from './botBubbleStore'
import styles from './BlagBot.module.css'

/**
 * Благ Бот.
 *
 * Дотук беше раздел вътре в ХРАНЕНЕ и четири копчета: кога е храненето,
 * солено или сладко, колко готвене, колко голямо. Това вършеше работа за
 * един-единствен въпрос и за нищо друго — а когато въпросът е „защо теглото
 * стои" или „стига ли ми протеинът тази седмица", копчета няма как да го
 * поберат.
 *
 * Сега всичко минава през думи и ботът има свой екран. Двете вървят заедно:
 * помощник, който отговаря на каквото го питаш, не може да живее вътре в
 * страницата за храна, а страницата за храна не бива да се разраства, за да
 * го побере.
 *
 * Числата не се измислят тук и не се пращат оттук. Функцията blag-bot чете
 * базата сама и подава на модела днешния прием, целите, седмицата, навиците,
 * тренировките и теглото; телефонът праща само въпроса. Контекст, събран на
 * клиента, би значел, че всеки може да поиска чужд.
 */

const MAX_Q = 500

// ─── Паметта на разговора, за да не започва от нула при всяко влизане ────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/* Ключът носи деня: разговорът за вчерашния прием не помага днес, а и списък,
   който расте безкрайно в localStorage, един ден се превръща в проблем. */
function sessionKey(userId) {
  return `blag_bot_${userId}_${todayStr()}`
}

function loadSession(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(sessionKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(userId, messages) {
  if (!userId) return
  try {
    localStorage.setItem(sessionKey(userId), JSON.stringify(messages))
  } catch { /* частен режим, пълна памет — разговорът пак работи */ }
}

// ─── Мехурчета ───────────────────────────────────────────────────────────────

function parseBold(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

/* Лицето е плакатът от landing страницата — асистентът, който говори с твоя
   глас, трябва да изглежда като теб, а не като иконка за чат.
   И е бутон: натискането му свива разговора обратно в балончето. Мястото е
   най-близкото до пръста, докато четеш отговор, и е същият знак, с който си
   го отворил. */
function Face({ onClose, label }) {
  if (!onClose) return <img className={styles.avatar} src="/bot.webp" alt="" width="28" height="28" />
  return (
    <button type="button" className={styles.avatarBtn} onClick={onClose} aria-label={label}>
      <img className={styles.avatar} src="/bot.webp" alt="" width="28" height="28" />
    </button>
  )
}

function BotBubble({ text, onClose, closeLabel }) {
  return (
    <div className={styles.bubbleRow}>
      <Face onClose={onClose} label={closeLabel} />
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
      <Face />
      <div className={`${styles.bubble} ${styles.botBubble} ${styles.typing}`}>
        <span /><span /><span />
      </div>
    </div>
  )
}

// ─── Екранът ─────────────────────────────────────────────────────────────────

export default function BlagBot({ open, onClose }) {
  const { user, profile } = useAuth()
  const { t } = useSettings()

  const [messages, setMessages] = useState(() => loadSession(user?.id) ?? [])
  const [draft, setDraft]       = useState('')
  const [asking, setAsking]     = useState(false)
  const [typing, setTyping]     = useState(false)

  /* Махнато ли е балончето. Показва се само тогава: бутон „върни го", докато
     то си стои на екрана, е въпрос без повод. */
  const [bubbleGone, setBubbleGone] = useState(isHidden)

  const feedRef  = useRef(null)
  const inputRef = useRef(null)

  const add = (from, text) =>
    setMessages(p => [...p, { from, text, id: Date.now() + Math.random() }])

  /* Поздравът е част от разговора, не отделно състояние: иначе при връщане
     той идва втори път над вчерашните реплики.

     Решението се взима вътре в setMessages, а не преди него. React вика
     ефектите при монтиране два пъти в режим на разработка, а проверка отвън
     чете празния списък и в двата случая — оттам идваше поздрав, написан два
     пъти един под друг. Така редът или го има, или се добавя, независимо
     колко пъти минава оттук. */
  useEffect(() => {
    setMessages(prev => prev.length
      ? prev
      : [{ from: 'bot', text: t('bot.intro'), id: Date.now() }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { saveSession(user?.id, messages) }, [messages, user?.id])

  /* Състоянието на балончето се чете при монтиране, а този компонент е
     монтиран от началото на приложението и само се показва и скрива. Без това
     „махнах балончето" не стигаше дотук и бутонът за връщане не се появяваше. */
  useEffect(() => {
    const on = e => setBubbleGone(!!e.detail?.hidden)
    window.addEventListener('blag:bot-bubble', on)
    return () => window.removeEventListener('blag:bot-bubble', on)
  }, [])

  /* Надолу при всяка нова реплика — разговорът се чете отдолу нагоре. */
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  /* И при клавиатурата. Тя изяжда половината екран, разговорът се свива до
     една лента и последната реплика излиза извън нея — човекът отваря полето,
     за да отговори, и губи от поглед това, на което отговаря. */
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const toBottom = () => {
      const el = feedRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    vv.addEventListener('resize', toBottom)
    return () => vv.removeEventListener('resize', toBottom)
  }, [])

  async function ask() {
    const q = draft.trim()
    if (!q || asking) return
    setDraft('')
    add('user', q)
    setAsking(true)
    setTyping(true)
    try {
      const { data, error } = await supabase.functions.invoke('blag-bot', {
        body: { question: q },
      })
      setTyping(false)
      add('bot', (!error && data?.reply) ? data.reply : t('bot.err'))
    } catch {
      setTyping(false)
      add('bot', t('bot.err'))
    } finally {
      setAsking(false)
      inputRef.current?.focus()
    }
  }

  if (!open) return null

  return createPortal(
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label={t('nav.bot')}>
      {/* Прозрачно, не плътно: страницата отдолу не си е отишла никъде и това
          трябва да се вижда. Разговорът е отгоре, а не вместо. */}
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <div className={styles.sheet}>
        <header className={styles.head}>
          <button type="button" className={styles.collapse} onClick={onClose} aria-label={t('bot.minimise')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span className={styles.title}>{t('nav.bot')}</span>
          <img className={styles.headFace} src="/bot.webp" alt="" width="30" height="30" />
        </header>

      {bubbleGone && (
        <button
          type="button"
          className={styles.restore}
          onClick={() => { setHidden(false); setBubbleGone(false); haptic('toggle') }}
        >
          <img src="/bot.webp" alt="" width="22" height="22" />
          {t('bot.restore')}
        </button>
      )}

      <div className={styles.feed} ref={feedRef}>
        {messages.map(m =>
          m.from === 'bot'
            ? <BotBubble key={m.id} text={m.text} onClose={onClose} closeLabel={t('bot.minimise')} />
            : <UserBubble key={m.id} text={m.text} />
        )}
        {typing && <TypingIndicator />}
      </div>

      {/* Полето се лепи за дъното над лентата и се вдига с клавиатурата.
          Разговор, чието поле бяга нагоре при писане, се пише наслуки. */}
      <div className={styles.askRow}>
        <input
          ref={inputRef}
          className={styles.askInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask() } }}
          placeholder={t('bot.placeholder')}
          maxLength={MAX_Q}
          disabled={asking}
        />
        <button
          className={styles.askSend}
          onClick={ask}
          disabled={!draft.trim() || asking}
          type="button"
          aria-label={t('bot.ask')}
        >
          <Pictogram name="chat" size={16} />
        </button>
      </div>
      </div>
    </div>,
    document.body
  )
}
