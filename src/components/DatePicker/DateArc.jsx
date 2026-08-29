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

const rad = deg => (deg * Math.PI) / 180

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

export default function DateArc({ selectedDate, today, onChange, onOpenMonth }) {
  const { t } = useSettings()
  const hostRef = useRef(null)
  const [offset, setOffset] = useState(0)   // в дни, дробно по време на влачене
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  /* Огледало на offset за слушателите: те се закачат веднъж и иначе биха
     четели стойността от рендера, в който са били създадени. */
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

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    function down(e) {
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
      setOffset(clamp(d.start - dx / PX_DAY))
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
  }, [clamp, minO, maxO, selectedDate, onChange])

  const days = []
  for (let i = -SPAN; i <= SPAN; i++) {
    const d       = shift(selectedDate, i)
    const dIso    = iso(d)
    const theta   = (i - offset) * STEP
    const away    = Math.min(Math.abs(theta) / (SPAN * STEP), 1)
    const future  = dIso > today

    days.push({
      i,
      iso: dIso,
      num: d.getDate(),
      dow: t(`daysMon.${(d.getDay() + 6) % 7}`),
      future,
      isToday: dIso === today,
      /* Буквите живеят само около върха. Далече от него те падат в реда на
         числата и го задръстват, а и вече не носят информация: там важното
         е кой е денят, не как се казва. */
      dowStyle: { opacity: Math.max(0, 1 - away * 2.6).toFixed(2) },
      /* Формата носи разстоянието: колкото по-встрани е денят, толкова
         по-надолу пада, толкова по-малък и по-блед е. */
      style: {
        transform: `translate(-50%, 0) translate(${(R * Math.sin(rad(theta))).toFixed(2)}px, ${(R * (1 - Math.cos(rad(theta)))).toFixed(2)}px) scale(${(1 - away * 0.34).toFixed(3)})`,
        /* Бъдещето е по-бледо, но не изключено: то е план, не грешка.
           Избледняването расте с разстоянието, а не е постоянно — денят в
           горната точка трябва да се чете еднакво добре, независимо дали е
           вчерашен или утрешен. */
        opacity: (1 - away * 0.62) * (future ? 1 - away * 0.45 : 1),
        zIndex: 10 - Math.round(Math.abs(theta)),
      },
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

        {days.map(d => (
          <button
            key={d.iso}
            type="button"
            className={[
              styles.arcDay,
              d.i === 0 ? styles.arcDayOn : '',
              d.isToday ? styles.arcDayToday : '',
              d.future ? styles.arcDayFuture : '',
            ].join(' ')}
            style={d.style}
            onClick={() => { if (!dragging) onChange(d.iso) }}
          >
            <span className={styles.arcDow} style={d.dowStyle}>{d.dow}</span>
            <span className={styles.arcNum}>{d.num}</span>
          </button>
        ))}
      </div>

      <button type="button" className={styles.arcMonth} onClick={onOpenMonth}>
        {shift(selectedDate, Math.round(offset)).toLocaleDateString(loc(), { month: 'long', year: 'numeric' })}
      </button>
      <span className={styles.srOnly}>{label}</span>
    </div>
  )
}
