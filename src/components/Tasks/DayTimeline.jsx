import { useMemo, useRef, useEffect, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './DayTimeline.module.css'

/**
 * Денят като линия.
 *
 * Списъкът казва какво има за вършене; линията казва кога. Това са два
 * различни въпроса и досега приложението отговаряше само на първия — задачата
 * пазеше дата, но не и час, така че „днес" беше купчина без ред.
 *
 * Тренировката се чертае от вписаните серии, а не от отделен запис за час:
 * времето, по което човек е вдигал, е в самите серии, и то е истинското. Ден
 * без вписани серии просто няма блок за тренировка — по-добре, отколкото да
 * се измисли час, който никой не е казал.
 */

const HOUR_PX = 52          // височина на един час
const DAY_START = 5         // линията започва в 5 сутринта
const DAY_END   = 24

/** "18:30:00" → 18.5 */
function hhmmToHours(t) {
  if (!t) return null
  const [h, m] = String(t).split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (m || 0) / 60
}

function fmtHour(h) {
  return `${String(Math.floor(h)).padStart(2, '0')}:00`
}

function fmtClock(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function DayTimeline({ date, tasks, workoutSpan, onPickSlot, onOpenTask }) {
  const { t } = useSettings()
  const scrollRef = useRef(null)
  const [now, setNow] = useState(() => new Date())

  // Часовникът тиктака веднъж в минута — линията на „сега" е права само ако се
  // мести. По-често от това не се вижда, по-рядко — лъже.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const hours = []
  for (let h = DAY_START; h < DAY_END; h++) hours.push(h)

  /* Само задачите с час. Останалите си остават в списъка отдолу — линия, в
     която всичко без час пада в 00:00, е по-лоша от линия без тях. */
  const placed = useMemo(() => {
    return (tasks ?? [])
      .filter(x => x.start_time && x.due_date === date)
      .map(x => {
        const start = hhmmToHours(x.start_time)
        const dur = Math.max(15, x.duration_min || 45) / 60
        return { ...x, _start: start, _end: start + dur }
      })
      .filter(x => x._start !== null)
      .sort((a, b) => a._start - b._start)
  }, [tasks, date])

  /* Застъпените блокове се делят по ширина, вместо да се покриват. Две неща в
     един час е нормално; едното скрито под другото не е. */
  const laidOut = useMemo(() => {
    const cols = []
    return placed.map(item => {
      let col = cols.findIndex(end => end <= item._start)
      if (col === -1) { cols.push(item._end); col = cols.length - 1 }
      else cols[col] = item._end
      return { ...item, _col: col }
    }).map(item => ({ ...item, _cols: Math.max(1, cols.length) }))
  }, [placed])

  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday = date === todayStr
  const nowH = now.getHours() + now.getMinutes() / 60
  const nowVisible = isToday && nowH >= DAY_START && nowH < DAY_END

  // Отваря се там, където е сега — денят почти никога не се планира от 5 ч.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const focus = nowVisible ? nowH : 8
    el.scrollTop = Math.max(0, (focus - DAY_START) * HOUR_PX - 80)
  }, [date])

  function topFor(h)    { return (h - DAY_START) * HOUR_PX }
  function heightFor(a, b) { return Math.max(22, (b - a) * HOUR_PX) }

  return (
    <div className={styles.wrap}>
      <div className={styles.scroller} ref={scrollRef}>
        <div className={styles.canvas} style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
          {hours.map(h => (
            <div key={h} className={styles.hourRow} style={{ top: topFor(h), height: HOUR_PX }}>
              <span className={styles.hourLabel}>{fmtHour(h)}</span>
              {/* Празният час е бутон: натискаш там, където искаш нещото да
                  стане, вместо да въвеждаш час в отделно поле. */}
              <button
                type="button"
                className={styles.hourSlot}
                onClick={() => { haptic('tap'); onPickSlot?.(`${String(h).padStart(2, '0')}:00`) }}
                aria-label={t('tl.addAt', { time: fmtHour(h) })}
              />
            </div>
          ))}

          {/* Тренировката, както е била наистина: от първата до последната серия. */}
          {workoutSpan && (
            <div
              className={styles.workout}
              style={{
                top: topFor(workoutSpan.start),
                height: heightFor(workoutSpan.start, workoutSpan.end),
              }}
            >
              <span className={styles.workoutLabel}>{workoutSpan.label}</span>
              <span className={styles.workoutTime}>
                {fmtClock(workoutSpan.start)}–{fmtClock(workoutSpan.end)}
              </span>
            </div>
          )}

          {laidOut.map(item => (
            <button
              key={item.id}
              type="button"
              /* Къс блок носи само името. Два реда в двайсет и шест пиксела
                 значат изрязан текст, а часът го пише и линейката отляво. */
              className={[
                styles.block,
                item.done ? styles.blockDone : '',
                item.priority >= 2 ? styles.blockHigh : '',
                (item._end - item._start) * HOUR_PX < 44 ? styles.blockShort : '',
              ].join(' ')}
              style={{
                top: topFor(item._start),
                height: heightFor(item._start, item._end),
                left: `calc(46px + ${(item._col / item._cols) * 100}% * 0.86)`,
                width: `calc(${(1 / item._cols) * 100}% * 0.86 - 6px)`,
              }}
              onClick={() => { haptic('tap'); onOpenTask?.(item) }}
            >
              <span className={styles.blockText}>{item.text}</span>
              <span className={styles.blockTime}>{fmtClock(item._start)}</span>
            </button>
          ))}

          {nowVisible && (
            <div className={styles.nowLine} style={{ top: topFor(nowH) }}>
              <span className={styles.nowDot} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
