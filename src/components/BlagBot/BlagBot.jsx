import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import { createPortal } from 'react-dom'
import Pictogram from '../Pictogram/Pictogram'
import { isHidden, setHidden } from './botBubbleStore'
import { logFoodRows } from '../../hooks/useFoodLog'
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

/* Разчетеното от изречение, преди да влезе в дневника.
   Показва се цялото: име, количество и четирите числа. Човекът натиска един
   бутон — но преди това вижда какво точно ще се впише, защото сгрешен ред в
   дневника се намира чак вечерта, когато сборът не излиза. */
function DraftCard({ plan, state, onLog, onSkip, t }) {
  const tot = plan.totals
  return (
    <div className={`${styles.draft} ${state ? styles.draftDone : ''}`}>
      {plan.items.map((i, n) => (
        <div key={n} className={styles.draftRow}>
          <span className={styles.draftName}>
            {i.name}
            {i.grams > 0 && <span className={styles.draftGrams}> {i.grams} г</span>}
            {i.approx && <span className={styles.draftApprox}> {t('bot.log.approx')}</span>}
          </span>
          <span className={styles.draftMacros}>
            {Math.round(i.kcal)} · {Math.round(i.protein)}/{Math.round(i.carbs)}/{Math.round(i.fat)}
          </span>
        </div>
      ))}

      {plan.items.length > 1 && (
        <div className={`${styles.draftRow} ${styles.draftTotal}`}>
          <span className={styles.draftName}>{t('bot.log.total')}</span>
          <span className={styles.draftMacros}>
            {Math.round(tot.kcal)} · {Math.round(tot.protein)}/{Math.round(tot.carbs)}/{Math.round(tot.fat)}
          </span>
        </div>
      )}

      {state
        ? <span className={styles.draftState}>
            {t(state === 'in' ? 'bot.log.done' : 'bot.log.left')}
          </span>
        : (
          <div className={styles.draftBtns}>
            <button type="button" className={styles.draftNo} onClick={onSkip}>
              {t('bot.log.no')}
            </button>
            <button type="button" className={styles.draftYes} onClick={onLog}>
              <Pictogram name="plus" size={15} />
              {t('bot.log.yes')}
            </button>
          </div>
        )}
    </div>
  )
}

function BotBubble({ text, onClose, closeLabel, plan, planState, onLog, onSkip, t }) {
  return (
    /* С карта редът става висок и лицето, центрирано по средата, отива до
       картата вместо до думите. А то е бутонът за свиване — мястото му е при
       текста, който човекът чете. */
    <div className={`${styles.bubbleRow} ${plan ? styles.withDraft : ''}`}>
      <Face onClose={onClose} label={closeLabel} />
      <div className={styles.botSide}>
        <div className={`${styles.bubble} ${styles.botBubble}`}>
          {text.split('\n').map((line, i, arr) => (
            <span key={i}>{parseBold(line)}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
        {plan && (
          <DraftCard plan={plan} state={planState} onLog={onLog} onSkip={onSkip} t={t} />
        )}
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

/* Кога е било. Часовете и дните стигат: разговор отпреди месец се разпознава
   по заглавието си, не по датата. */
function when(iso, t) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1)    return t('feed.ago.now')
  if (mins < 60)   return t('feed.ago.min',  { n: mins })
  const h = Math.round(mins / 60)
  if (h < 24)      return t('feed.ago.hour', { n: h })
  return t('feed.ago.day', { n: Math.round(h / 24) })
}

// ─── Екранът ─────────────────────────────────────────────────────────────────

export default function BlagBot({ open, from = null, onClose }) {
  const { user, profile } = useAuth()
  const { t } = useSettings()

  const [messages, setMessages] = useState(() => loadSession(user?.id) ?? [])
  const [draft, setDraft]       = useState('')
  const [asking, setAsking]     = useState(false)
  const [typing, setTyping]     = useState(false)

  /* Кой разговор е отворен и какви има.
     null значи „никой" — тогава се рисува списъкът, не нишката. Така
     натискането на балончето пита кое, вместо да реши вместо човека. */
  const [chatId, setChatId]   = useState(null)
  const [chats, setChats]     = useState([])
  const [loadingChat, setLoadingChat] = useState(false)

  /* Махнато ли е балончето. Показва се само тогава: бутон „върни го", докато
     то си стои на екрана, е въпрос без повод. */
  const [bubbleGone, setBubbleGone] = useState(isHidden)

  /* Затварянето иска време, колкото и отварянето.
     Дотук слоят просто спираше да се рисува — разгъваше се плавно и изчезваше
     на кадър, което се чете като прекъсване, а не като свиване. Тук остава
     монтиран, докато обратният жест изтече, и чак тогава си отива. */
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef(null)

  function collapse() {
    if (closing) return
    setClosing(true)
    clearTimeout(closeTimer.current)
    /* 340: разговорът се сгъва към горния ъгъл за 200, а лицето пада обратно
       до балончето си за 280 след 40 закъснение. Слоят си отива, когато и
       двете са свършили — измерено, полетът каца на 320-ия милисекунд. */
    closeTimer.current = setTimeout(() => { setClosing(false); onClose() }, 340)
  }

  /* Полетът на лицето.
   *
   * Дотук натискането на балончето го изтриваше долу вдясно и след кадър
   * заглавието горе вече имаше лице. Двете са една и същата снимка, а окото
   * я губеше по пътя: отваряше се нещо ново вместо да се разгъне това, което
   * стои под пръста.
   *
   * Затова: снимката пропътува разстоянието от балончето до мястото си в
   * заглавието, а разговорът се разгъва от там — с малко закъснение, колкото
   * пътят да се види.
   *
   * Мястото на кацане се мери с offsetLeft/offsetTop, а не с
   * getBoundingClientRect: в този миг разговорът е в първия кадър на своята
   * анимация, свит до половина, и рамката му лъже. Отместванията са
   * подредбени числа — трансформациите не ги пипат. */
  const sheetRef = useRef(null)
  const faceRef  = useRef(null)
  const flyRef   = useRef(null)
  const [flying, setFlying] = useState(false)
  const flyTimer = useRef(null)

  useLayoutEffect(() => {
    if (!open || !from) { setFlying(false); return }
    const sheet = sheetRef.current, face = faceRef.current, el = flyRef.current
    if (!sheet || !face || !el) return

    const left = sheet.offsetLeft + face.offsetLeft
    const top  = sheet.offsetTop  + face.offsetTop
    const size = face.offsetWidth || 30

    el.style.setProperty('--fly-left', left + 'px')
    el.style.setProperty('--fly-top',  top  + 'px')
    el.style.setProperty('--fly-size', size + 'px')
    el.style.setProperty('--fly-dx', (from.x - (left + size / 2)) + 'px')
    el.style.setProperty('--fly-dy', (from.y - (top  + size / 2)) + 'px')
    el.style.setProperty('--fly-s',  ((from.size || size) / size).toFixed(3))

    setFlying(true)
    clearTimeout(flyTimer.current)
    flyTimer.current = setTimeout(() => setFlying(false), 360)
    return () => clearTimeout(flyTimer.current)
  }, [open, from])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const feedRef  = useRef(null)
  const inputRef = useRef(null)

  const add = (from, text, extra = null) =>
    setMessages(p => [...p, { from, text, id: Date.now() + Math.random(), ...extra }])

  /* Вписването на разчетеното.
     Редовете отиват в дневника, а приетото и отказаното се помнят като
     събития: от тях се учи какво човекът яде наистина, а не какво му е било
     предложено. */
  async function logPlan(msgId, plan) {
    const { error } = await logFoodRows(user.id, plan.items)
    setMessages(p => p.map(m => m.id === msgId ? { ...m, planState: error ? null : 'in' } : m))
    if (error) { haptic('reject'); return }
    haptic('success')
    supabase.from('bot_events')
      .insert({ user_id: user.id, kind: 'accepted', payload: { items: plan.items } })
      .then(() => {}, () => {})
  }

  function skipPlan(msgId, plan) {
    setMessages(p => p.map(m => m.id === msgId ? { ...m, planState: 'out' } : m))
    haptic('tap')
    supabase.from('bot_events')
      .insert({ user_id: user.id, kind: 'rejected', payload: { items: plan.items } })
      .then(() => {}, () => {})
  }


  /* Списъкът се чете при всяко отваряне: разговор, започнат на друг телефон
     или вчера, трябва да е тук. */
  useEffect(() => {
    if (!open || !user?.id) return
    supabase.from('bot_chats')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setChats(data ?? []))
  }, [open, user?.id])

  /* Отваряне на съществуваща нишка. Репликите идват от базата, не от паметта
     на телефона — тя пази само последния разговор, а тук се избира кой да е. */
  async function openChat(id) {
    setChatId(id)
    setLoadingChat(true)
    const { data } = await supabase.from('bot_messages')
      .select('id, role, content')
      .eq('chat_id', id)
      .order('created_at', { ascending: true })
      .limit(200)
    setLoadingChat(false)
    setMessages((data ?? []).map(m => ({
      id: m.id, from: m.role === 'bot' ? 'bot' : 'user', text: m.content,
    })))
  }

  function newChat() {
    setChatId('new')
    setMessages([{ from: 'bot', text: t('bot.intro'), id: Date.now() }])
  }

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
      /* Нишката се създава при първия въпрос, не при натискането на „нов":
         разговор без нито една реплика е ред в списъка, който не значи нищо.
         Заглавието е самият въпрос, отрязан — разговорът се разпознава по
         това, с което е започнал. */
      let id = chatId
      if (id === 'new' || !id) {
        const { data: made } = await supabase.from('bot_chats')
          .insert({ user_id: user.id, title: q.slice(0, 60) })
          .select('id, title, updated_at')
          .single()
        if (made) {
          id = made.id
          setChatId(id)
          setChats(prev => [made, ...prev])
        }
      }

      const { data, error } = await supabase.functions.invoke('blag-bot', {
        body: { question: q, chatId: id },
      })
      setTyping(false)
      /* Разчетеното живее само в този разговор на този телефон: отваряш ли
         нишката пак, картата я няма — тя е предложение за сега, а не ред,
         който чака вечно. */
      add('bot', (!error && data?.reply) ? data.reply : t('bot.err'),
          (!error && data?.draft?.items?.length) ? { plan: data.draft } : null)

      /* Подредбата в списъка е по последно казано, значи нишката се вдига
         отгоре при всяка реплика. */
      if (id) {
        supabase.from('bot_chats').update({ updated_at: new Date().toISOString() })
          .eq('id', id).then(() => {}, () => {})
        setChats(prev => prev.map(c => c.id === id
          ? { ...c, updated_at: new Date().toISOString() }
          : c))
      }
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
    <div className={`${styles.layer} ${closing ? styles.closing : ''}`} role="dialog" aria-modal="true" aria-label={t('nav.bot')}>
      {/* Прозрачно, не плътно: страницата отдолу не си е отишла никъде и това
          трябва да се вижда. Разговорът е отгоре, а не вместо. */}
      <div className={styles.scrim} onClick={collapse} aria-hidden="true" />

      {/* Пътуващата снимка. Държи се извън разговора, защото той се свива и
          разгъва, а тя само пътува. */}
      {from && (
        <img
          ref={flyRef}
          className={`${styles.fly} ${flying ? styles.flyGo : ''}`}
          src="/bot.webp" alt="" width="30" height="30" aria-hidden="true"
        />
      )}

      <div className={styles.sheet} ref={sheetRef}>
        <header className={styles.head}>
          <button type="button" className={styles.collapse} onClick={collapse} aria-label={t('bot.minimise')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {chatId ? (
            /* Назад към списъка. Заглавието е самата нишка — оттам се вижда
               кой разговор четеш, без да се брои назад по репликите. */
            <button type="button" className={styles.titleBtn} onClick={() => { setChatId(null); setMessages([]) }}>
              <span className={styles.titleText}>
                {chats.find(c => c.id === chatId)?.title ?? t('bot.newChat')}
              </span>
              <span className={styles.titleHint}>{t('bot.allChats')}</span>
            </button>
          ) : (
            <span className={styles.title}>{t('nav.bot')}</span>
          )}
          <img
            ref={faceRef}
            className={`${styles.headFace} ${(flying || (closing && from)) ? styles.faceWaiting : ''}`}
            src="/bot.webp" alt="" width="30" height="30"
          />
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

      {/* Без избрана нишка се рисува списъкът, не празен разговор.
          Натискането на балончето пита кое — вместо да реши вместо човека и
          после да се окаже, че е продължило вчерашен спор с днешен въпрос. */}
      {!chatId ? (
        <div className={styles.chats}>
          <button type="button" className={styles.newChat} onClick={newChat}>
            <Pictogram name="plus" size={17} />
            {t('bot.newChat')}
          </button>

          {chats.length > 0 && <span className={styles.chatsHead}>{t('bot.earlier')}</span>}

          {chats.map(c => (
            <button key={c.id} type="button" className={styles.chatRow} onClick={() => openChat(c.id)}>
              <img src="/bot.webp" alt="" width="26" height="26" />
              <span className={styles.chatText}>
                <span className={styles.chatTitle}>{c.title || t('bot.newChat')}</span>
                <span className={styles.chatWhen}>{when(c.updated_at, t)}</span>
              </span>
            </button>
          ))}

          {chats.length === 0 && <p className={styles.chatsEmpty}>{t('bot.noChats')}</p>}
        </div>
      ) : (
        <div className={styles.feed} ref={feedRef}>
          {loadingChat && <p className={styles.chatsEmpty}>…</p>}
          {messages.map(m =>
            m.from === 'bot'
              ? <BotBubble
                  key={m.id}
                  text={m.text}
                  onClose={collapse}
                  closeLabel={t('bot.minimise')}
                  plan={m.plan}
                  planState={m.planState}
                  onLog={() => logPlan(m.id, m.plan)}
                  onSkip={() => skipPlan(m.id, m.plan)}
                  t={t}
                />
              : <UserBubble key={m.id} text={m.text} />
          )}
          {typing && <TypingIndicator />}
        </div>
      )}

      {/* Полето се лепи за дъното и се вдига с клавиатурата. В списъка го няма:
          написаното там няма къде да отиде. */}
      <div className={styles.askRow} hidden={!chatId}>
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
