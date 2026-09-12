import { useEffect, useRef, useState } from 'react'
import styles from './BotBubble.module.css'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import { loadPos, savePos, isHidden, setHidden, DEFAULT_POS } from './botBubbleStore'

/**
 * Балончето на бота.
 *
 * Стои на един и същи ъгъл на всеки екран, защото въпросът идва, където
 * дойде: човек гледа теглото си и се пита защо стои, гледа тренировката и се
 * пита дали да я мести. Помощник, до който се стига през чекмеджето, се
 * ползва, когато човек вече е решил да го ползва — а точно това решение е
 * стъпката, която убива въпроса.
 *
 * Но балонче, което стои върху всичко, рано или късно застава точно върху
 * онова, което трябва да се натисне. Затова се мести: две секунди задържане и
 * тръгва с пръста. Две, не по-малко — под тази мярка всяко по-бавно натискане
 * би го откачало, а най-честото действие тук е обикновеното отваряне.
 *
 * Живее в обвивката на приложението, не вътре в страница: разделите се движат
 * с трансформация при плъзгане и `position: fixed` вътре в тях се закача за
 * тях, не за прозореца.
 */

/* Половин секунда и малко: толкова държи пръстът, когато иска нещо от
   задържане, и толкова е прагът навсякъде другаде в телефона. Две секунди
   бяха мярка, взета за да не се откача случайно — но случайното откачане и
   без това се пази от прага за движение, а две секунди чакане пред неподвижен
   екран се усещат като счупено. */
const HOLD_MS   = 550    // колко се държи, преди да се откачи
const MOVE_SLOP = 10     // px, след които задържането се смята за плъзгане
const SIZE      = 52
const EDGE      = 10     // най-близо до ръба, до което се допуска

/* Мишената за махане: горе в средата, появява се чак когато нещо се носи. */
const DROP_TOP    = 84
const DROP_SIZE   = 78
const DROP_REACH  = 62   // от колко близо се смята за уцелена

export default function BotBubble({ activeTab, onOpen }) {
  const { t } = useSettings()

  const [hidden, setHiddenState] = useState(isHidden)
  const [pos, setPos]      = useState(loadPos)
  const [armed, setArmed]  = useState(false)   // откачено, движи се с пръста
  const [overDrop, setOver] = useState(false)

  const holdRef  = useRef(null)   // таймерът за задържане
  const startRef = useRef(null)   // откъде тръгна пръстът
  const movedRef = useRef(false)  // мръднал ли е достатъчно, за да не е тап

  /* Връщането от страницата на бота стига дотук през събитие: двата
     компонента са в различни дървета. */
  useEffect(() => {
    const on = e => setHiddenState(!!e.detail?.hidden)
    window.addEventListener('blag:bot-bubble', on)
    return () => window.removeEventListener('blag:bot-bubble', on)
  }, [])

  /* Прозорецът се върти или клавиатурата го свива — балонче, оставено на
     стар ъгъл, може да се окаже извън екрана. */
  useEffect(() => {
    const clampNow = () => setPos(p => clamp(p))
    window.addEventListener('resize', clampNow)
    return () => window.removeEventListener('resize', clampNow)
  }, [])

  useEffect(() => () => clearTimeout(holdRef.current), [])

  if (hidden || activeTab === 'bot') return null

  function clamp({ right, bottom }, safe = 0) {
    const maxRight  = Math.max(EDGE, window.innerWidth  - SIZE - EDGE)
    const maxBottom = Math.max(EDGE, window.innerHeight - SIZE - EDGE - safe)
    return {
      right:  Math.min(Math.max(right,  EDGE), maxRight),
      bottom: Math.min(Math.max(bottom, EDGE), maxBottom),
    }
  }

  /** Уцелена ли е мишената за махане — мери се от центъра ѝ. */
  function onTarget({ right, bottom }, safe = 0) {
    const cx = window.innerWidth - right - SIZE / 2
    const cy = window.innerHeight - bottom - safe - SIZE / 2
    const tx = window.innerWidth / 2
    const ty = DROP_TOP + DROP_SIZE / 2
    return Math.hypot(cx - tx, cy - ty) < DROP_REACH
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    /* Колко добавя безопасната зона към отместването. Мери се от самия
       елемент, защото env() не се чете от JavaScript, а без него горният таван
       щеше да пуска балончето да излиза над ръба на екрана. */
    const rect = e.currentTarget.getBoundingClientRect()
    const safe = Math.max(0, Math.round(window.innerHeight - rect.bottom - pos.bottom))
    startRef.current = { x: e.clientX, y: e.clientY, pos, safe }
    movedRef.current = false
    clearTimeout(holdRef.current)
    holdRef.current = setTimeout(() => {
      setArmed(true)
      /* Вибрацията е единственото, което казва „вече го носиш" — окото в този
         момент гледа пръста, не екрана. */
      haptic('lift')
    }, HOLD_MS)
  }

  function onPointerMove(e) {
    const s = startRef.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y

    if (!armed) {
      /* Мръднал пръст преди двете секунди значи скрол или несигурен тап, не
         задържане. */
      if (Math.hypot(dx, dy) > MOVE_SLOP) clearTimeout(holdRef.current)
      return
    }

    movedRef.current = true
    const next = clamp({ right: s.pos.right - dx, bottom: s.pos.bottom - dy }, s.safe)
    setPos(next)
    setOver(onTarget(next, s.safe))
  }

  function onPointerUp(e) {
    /* Без това натискането минава през балончето и попада в екрана, който
       току-що се е отворил под пръста: балончето стои долу вдясно, а там на
       страницата на бота е полето за писане. Резултатът беше бот, отворен с
       вдигната клавиатура и без нито един видим ред. */
    e.preventDefault?.()
    clearTimeout(holdRef.current)
    const wasArmed = armed
    const moved    = movedRef.current
    startRef.current = null

    if (wasArmed) {
      setArmed(false)
      if (overDrop) {
        setOver(false)
        setHidden(true)
        setHiddenState(true)
        haptic('success')
        return
      }
      setOver(false)
      savePos(pos)
      if (moved) return          // това беше местене, не отваряне
    }

    onOpen('bot')
    haptic('tap')
  }

  function onPointerCancel() {
    clearTimeout(holdRef.current)
    startRef.current = null
    if (armed) { setArmed(false); setOver(false); savePos(pos) }
  }

  return (
    <>
      {/* Мишената се появява само докато нещо се носи: кошче, което виси
          постоянно, е покана да се махне нещо, което не пречи. */}
      {armed && (
        <div
          className={`${styles.drop} ${overDrop ? styles.dropOver : ''}`}
          style={{ top: DROP_TOP, width: DROP_SIZE, height: DROP_SIZE, marginLeft: -DROP_SIZE / 2 }}
          aria-hidden="true"
        >
          <Pictogram name="close" size={24} />
        </div>
      )}

      <button
        type="button"
        /* Над мишената балончето се свива и избледнява: иначе то стои точно
           върху хикса и човекът не вижда какво ще стане, а точно това е мигът,
           в който трябва да го види. */
        className={`${styles.bubble} ${armed ? styles.armed : ''} ${overDrop ? styles.overDrop : ''}`}
        /* Отместването минава през променливи, а не право в `bottom`:
           стилът добавя към него безопасната зона на телефона. Дотук
           балончето сядаше на голи 84 пиксела от долния ръб, докато бутонът
           за писане над него броеше и индикатора за начало — оттам двете се
           разделиха с трийсетина пиксела повече, отколкото трябва. */
        style={{ '--bot-right': `${pos.right}px`, '--bot-bottom': `${pos.bottom}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={e => e.preventDefault()}
        aria-label={t('nav.bot')}
      >
        <img src="/bot.webp" alt="" width="34" height="34" draggable="false" />
      </button>
    </>
  )
}

/** Връщането на махнатото балонче. Стои на страницата на бота, където човек
 *  така или иначе отива, когато му потрябва. */
export function restoreBubble() {
  setHidden(false)
}

export { isHidden as bubbleHidden, DEFAULT_POS }
