import { useRef, useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import styles from './DatePicker.module.css'

/**
 * Дните на дъга.
 *
 * Две стрелки и надпис между тях са три мишени, за да се стигне до вчера, и
 * нула представа къде си в седмицата. Дъгата показва съседните дни наведнъж
 * и се върти с един пръст — денят, който търсиш, е на разстояние, а не на
 * брой натискания.
 *
 * Кръгът е много голям и се вижда само горната му ивица. Двете числа са
 * вързани: разстоянието между два дни е R·STEP в радиани, а падането на
 * петия е R·(1−cos 5·STEP). При 2000 и 1.5° това дава 52 пиксела на ден и
 * 17 пиксела падане на петия.
 *
 * Падането беше 25 и това го чупеше: буквите на крайните дни слизаха точно
 * на височината на числата на средните и редът се четеше като каша. Дъгата
 * трябва да личи, но не за сметка на реда — затова е по-плитка, а буквите
 * на далечните дни гаснат, докато числата остават.
 *
 * PX_DAY е същите 52: един ден влачене мести дъгата точно с един ден, иначе
 * пръстът и съдържанието се движат с различни скорости.
 */

const R      = 2000  // радиус на кръга в пиксели
const STEP   = 1.5   // градуса на ден
const SPAN   = 5     // колко дни се рисуват от всяка страна
const PX_DAY = 52    // колко пиксела влачене струва един ден
const LIMIT  = 365   // докъде стига дъгата във всяка посока
const TAP_MS = 300   // колко трае завъртането след натискане

const rad = deg => (deg * Math.PI) / 180
/* Тръгва бързо, спира меко — както спира въртящо се нещо, което го пускаш. */
const ease = p => 1 - Math.pow(1 - p, 3)

/**
 * Къде стои ден i, когато дъгата е завъртяна на off дни.
 *
 * Една функция, а не две: рендерът я вика за спокойното състояние, а
 * движението — кадър по кадър направо върху DOM. Ако бяха две, щяха да се
 * разминат при първата промяна и дъгата щеше да подскача в мига, в който
 * движението свърши.
 */
function geom(i, off, future) {
  const theta = (i - off) * STEP
  const away  = Math.min(Math.abs(theta) / (SPAN * STEP), 1)
  return {
    /* translate3d, а не translate: браузърът вдига елемента на собствен слой
       и въртенето не минава през прерисуване на страницата. */
    transform: `translate(-50%, 0) translate3d(${(R * Math.sin(rad(theta))).toFixed(2)}px, ${(R * (1 - Math.cos(rad(theta)))).toFixed(2)}px, 0) scale(${(1 - away * 0.34).toFixed(3)})`,
    /* Бъдещето е по-бледо, но не изключено: то е план, не грешка.
       Избледняването расте с разстоянието, а не е постоянно — денят в
       горната точка трябва да се чете еднакво добре, независимо дали е
       вчерашен или утрешен. */
    opacity: ((1 - away * 0.62) * (future ? 1 - away * 0.45 : 1)).toFixed(3),
    zIndex: 10 - Math.round(Math.abs(theta)),
    /* Буквите живеят само около върха. Далече от него те падат в реда на
       числата и го задръстват, а и вече не носят информация: там важното е
       кой е денят, не как се казва. */
    dow: Math.max(0, 1 - away * 2.6).toFixed(2),
  }
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function dayFromIso(s) { return new Date(s + 'T12:00:00') }
function shift(s, n) {
  const d = dayFromIso(s)
  d.setDate(d.getDate() + n)
  return d
}
/** Цели дни между два дни, без часовете да се месят. */
function daysBetween(aIso, bIso) {
  return Math.round((dayFromIso(bIso) - dayFromIso(aIso)) / 86400000)
}

function stillPreferred() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function DateArc({ selectedDate, today, onChange, onOpenMonth }) {
  const { t } = useSettings()
  const hostRef  = useRef(null)
  const monthRef = useRef(null)
  const dayRefs  = useRef([])
  const [offset, setOffset] = useState(0)   // в дни, дробно по време на движение
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  /* Огледало на offset за слушателите: те се закачат веднъж и иначе биха
     чели стойността от рендера, в който са били създадени. */
  const offsetRef = useRef(0)
  useEffect(() => { offsetRef.current = offset }, [offset])

  /* Напред се стига също толкова, колкото назад.
     Ден напред не е грешка, а план: човек, който знае какво ще яде утре,
     трябва да може да го запише днес. Границата е една година в двете
     посоки — не защото там свършва смисълът, а за да не отнесе едно
     замятане някого в 2031-ва.
     И в двата края спира със съпротива, не със стена: нещата в живота не
     спират внезапно, а се забавят. */
  const from = daysBetween(selectedDate, today)   // колко дни е днес спрямо избрания
  const minO = from - LIMIT
  const maxO = from + LIMIT

  const clamp = useCallback(o => {
    if (o > maxO) return maxO + (o - maxO) * 0.28
    if (o < minO) return minO + (o - minO) * 0.28
    return o
  }, [minO, maxO])

  useEffect(() => { setOffset(0) }, [selectedDate])

  /* ── Рисуването ────────────────────────────────────────────────────────
     Движението не минава през React — нито влаченето, нито натискането.
     Всеки милиметър пръст е отделно събитие, а един setState на събитие
     значи единайсет компонента наново по няколко пъти на кадър; при
     натискане пък смяната на датата вдига цялата страница и заявките за
     деня точно докато трябва да тече анимацията. Затова стойността се
     пише направо върху елементите, веднъж на кадър, по такта на браузъра.
     React научава крайното число чак когато движението е свършило. */
  const wantRef  = useRef(0)
  const frameRef = useRef(0)
  const animRef  = useRef(0)

  const paint = useCallback(() => {
    frameRef.current = 0
    const off = wantRef.current
    for (let k = 0; k < dayRefs.current.length; k++) {
      const el = dayRefs.current[k]
      if (!el) continue
      const g = geom(k - SPAN, off, el.dataset.future === '1')
      el.style.transform = g.transform
      el.style.opacity   = g.opacity
      el.style.zIndex    = g.zIndex
      if (el.firstElementChild) el.firstElementChild.style.opacity = g.dow
    }
    /* Месецът се сменя под пръста, а не след него. */
    if (monthRef.current) {
      monthRef.current.textContent = shift(selectedDate, Math.round(off))
        .toLocaleDateString(loc(), { month: 'long', year: 'numeric' })
    }
  }, [selectedDate])

  const schedule = useCallback(off => {
    wantRef.current   = off
    offsetRef.current = off
    if (!frameRef.current) frameRef.current = requestAnimationFrame(paint)
  }, [paint])

  /** Кой ден носи кръга. Пипа се на ръка, защото React не участва в хода. */
  const markOn = useCallback(k => {
    dayRefs.current.forEach((el, idx) => {
      el?.classList.toggle(styles.arcDayOn, idx === k + SPAN)
    })
  }, [])

  /** Спира започнато завъртане, връща кръга и CSS преходите. */
  const stopAnim = useCallback(() => {
    if (!animRef.current) return
    cancelAnimationFrame(animRef.current)
    animRef.current = 0
    markOn(0)                                     // прекъснато — изборът е старият
    hostRef.current?.classList.remove(styles.arcDragging)
  }, [markOn])

  /**
   * Натиснат ден.
   *
   * Дъгата се завърта дотам сама, със същата ръка, с която я върти пръстът,
   * и чак когато спре, датата се сменя. Обратният ред — първо датата, после
   * анимацията — значи страницата да се прерисува върху движещата се дъга,
   * а това се вижда. Денят вече стои на върха, когато React стигне до него,
   * затова смяната не се забелязва като скок.
   */
  const tap = useCallback((k, dIso) => {
    if (k === 0) return
    const host = hostRef.current
    if (!host || stillPreferred()) { onChange(dIso); return }

    stopAnim()
    /* Класът маха CSS преходите: те и кадрите биха дърпали един елемент в
       две посоки. Сваля се преди смяната на датата, за да е налице пак за
       всичко останало. */
    host.classList.add(styles.arcDragging)
    /* Кръгът минава на натиснатия ден веднага и се качва заедно с него.
       Ако чакаше края, изборът щеше да щракне от единия ден на другия в
       един кадър — точно това се вижда като нескопосано. */
    markOn(k)
    const t0 = performance.now()

    const stepFrame = now => {
      const p = Math.min((now - t0) / TAP_MS, 1)
      wantRef.current   = k * ease(p)
      offsetRef.current = wantRef.current
      paint()
      if (p < 1) { animRef.current = requestAnimationFrame(stepFrame); return }
      animRef.current = 0
      host.classList.remove(styles.arcDragging)
      onChange(dIso)
    }
    animRef.current = requestAnimationFrame(stepFrame)
  }, [paint, stopAnim, markOn, onChange])

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    function down(e) {
      stopAnim()                                  // пръстът има думата пред анимацията
      const p = e.touches ? e.touches[0] : e
      drag.current = { x: p.clientX, y: p.clientY, start: offsetRef.current, moved: false, cancelled: false }
    }

    function move(e) {
      const d = drag.current
      if (!d || d.cancelled) return
      const p = e.touches ? e.touches[0] : e
      const dx = p.clientX - d.x
      const dy = p.clientY - d.y

      /* Вертикално надделяване отменя жеста: страницата под дъгата се
         превърта, а дъга, която краде скрола, е по-лоша от липсваща дъга. */
      if (!d.moved && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        d.cancelled = true
        return
      }
      if (Math.abs(dx) > 4 && !d.moved) { d.moved = true; setDragging(true) }
      if (!d.moved) return

      e.preventDefault?.()
      schedule(clamp(d.start - dx / PX_DAY))
    }

    function up() {
      const d = drag.current
      drag.current = null
      if (!d) return
      /* Кликът тръгва след pointerup; вдига се на следващия такт, за да не
         избере деня, върху който пръстът случайно е свършил. */
      setTimeout(() => setDragging(false), 0)
      if (d.cancelled || !d.moved) return

      const k = Math.max(Math.min(Math.round(offsetRef.current), maxO), minO)
      if (k === 0) setOffset(0)              // празен ход — дъгата се връща
      else onChange(iso(shift(selectedDate, k)))
    }

    host.addEventListener('touchstart', down,  { passive: true })
    host.addEventListener('touchmove',  move,  { passive: false })
    host.addEventListener('touchend',   up)
    host.addEventListener('touchcancel', up)
    host.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup',   up)
    return () => {
      host.removeEventListener('touchstart', down)
      host.removeEventListener('touchmove',  move)
      host.removeEventListener('touchend',   up)
      host.removeEventListener('touchcancel', up)
      host.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup',   up)
    }
  }, [clamp, minO, maxO, selectedDate, onChange, schedule, stopAnim])

  const days = []
  for (let i = -SPAN; i <= SPAN; i++) {
    const d      = shift(selectedDate, i)
    const dIso   = iso(d)
    const future = dIso > today
    const g      = geom(i, offset, future)

    days.push({
      i,
      iso: dIso,
      num: d.getDate(),
      dow: t(`daysMon.${(d.getDay() + 6) % 7}`),
      future,
      isToday: dIso === today,
      style: { transform: g.transform, opacity: g.opacity, zIndex: g.zIndex },
      dowStyle: { opacity: g.dow },
    })
  }

  /* Кой ден стои в горната точка в момента — той е този, който надписът
     отдолу назовава, дори докато пръстът още се движи. */
  const centred = shift(selectedDate, Math.round(offset))
  const label = centred.toLocaleDateString(loc(), { day: 'numeric' })

  return (
    <div className={styles.arcWrap}>
      <div
        className={`${styles.arc} ${dragging ? styles.arcDragging : ''}`}
        ref={hostRef}
        /* Хоризонталното влачене тук е на дъгата, не на страницата.
           SwipePager пита isProtected() при всяко докосване и се отдръпва,
           щом срещне този атрибут по пътя нагоре към body. */
        data-no-swipe=""
        role="group"
        aria-label={t('dp.arcAria')}
      >
        {/* Отметката, която казва къде е „сега" — дъгата се върти под нея. */}
        <span className={styles.arcMark} aria-hidden="true" />

        {days.map((d, k) => (
          <button
            key={d.iso}
            type="button"
            ref={el => { dayRefs.current[k] = el }}
            data-future={d.future ? '1' : '0'}
            className={[
              styles.arcDay,
              d.i === 0 ? styles.arcDayOn : '',
              d.isToday ? styles.arcDayToday : '',
              d.future ? styles.arcDayFuture : '',
            ].join(' ')}
            style={d.style}
            onClick={() => { if (!dragging) tap(d.i, d.iso) }}
          >
            <span className={styles.arcDow} style={d.dowStyle}>{d.dow}</span>
            <span className={styles.arcNum}>{d.num}</span>
          </button>
        ))}
      </div>

      <button type="button" className={styles.arcMonth} ref={monthRef} onClick={onOpenMonth}>
        {shift(selectedDate, Math.round(offset)).toLocaleDateString(loc(), { month: 'long', year: 'numeric' })}
      </button>
      <span className={styles.srOnly}>{label}</span>
    </div>
  )
}
