import { useMemo, useRef, useEffect, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './DayTimeline.module.css'

/**
 * Денят като линия.
 *
 * Списъкът казва какво има за вършене; линията казва кога. Това са два
 * различни въпроса и досега приложението отговаряше само на първия.
 *
 * Три жеста, и трите с пръст:
 *   · натисни-и-задръж върху блок → местиш го в друг час;
 *   · дърпай долния ръб → менѝ колко трае;
 *   · натисни-и-задръж празно и издърпай → изрязваш ново нещо с дължината му.
 *
 * Задържането преди местене не е украса. На тъч екран влаченето и
 * превъртането започват с едно и също движение, и ако блокът тръгне веднага,
 * всяко превъртане покрай него размества деня. Затова пръстът първо стои,
 * после хваща — както е и в календарите, които вършат работа.
 *
 * Тренировката се чертае от вписаните серии, а не от отделен запис за час:
 * времето, по което човек е вдигал, е в самите серии, и то е истинското.
 */

const HOUR_PX   = 52
/* Цялото денонощие, както е в Google Calendar.
   Линията започваше в 5 и свършваше в 23:00 — тоест смяна до полунощ
   нямаше къде да се впише, а нощната работа изобщо не съществуваше.
   Ден, който изключва часове, кара човека да си ги записва другаде. */
const DAY_START = 0
const DAY_END   = 24
/* Въздух над първия час: надписът седи над чертата си и без това излиза
   извън платното и се вижда срязан. */
const PAD_TOP   = 12
/* Лепи се на четвърт час. По-фино значи да се цели с пръст в три пиксела, а
   никой не планира деня си в седемминутни крачки. */
const SNAP_MIN  = 15
/* Колко стои пръстът, преди да хване. Под двеста е случайно, над петстотин се
   усеща като че ли не е станало. */
const HOLD_MS   = 300
/* Мръдне ли повече от това преди задържането — човекът е превъртал. */
const HOLD_SLOP = 8

function hhmmToHours(t) {
  if (!t) return null
  const [h, m] = String(t).split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (m || 0) / 60
}

function fmtHour(h) { return `${String(Math.floor(h)).padStart(2, '0')}:00` }

function fmtClock(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Часове → "HH:MM:SS", както го иска колоната `time`. */
function toSqlTime(hours) {
  const total = Math.round(hours * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`
}

const snapHours = h => Math.round((h * 60) / SNAP_MIN) * SNAP_MIN / 60

export default function DayTimeline({
  date, tasks, workoutSpan, onOpenTask, onResize, onMove, onCreate,
}) {
  const { t } = useSettings()
  const scrollRef = useRef(null)
  const canvasRef = useRef(null)
  const [now, setNow] = useState(() => new Date())

  /* Живият жест. В ref, защото го чете слушател, вързан веднъж; и в state —
     само толкова, колкото трябва, за да се пренарисува. */
  const gesture = useRef(null)
  const [live, setLive] = useState(null)
  const draggedAt = useRef(0)
  const recentlyDragged = () => Date.now() - draggedAt.current < 400

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  /* Превъртането спира, докато нещо се влачи.
     Слушателят е непасивен и вързан веднъж; проверката е вътре. `touch-action`
     не може да се смени в момента на хващането — браузърът вече е решил дали
     жестът е превъртане, преди React да разбере за него. */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const stop = e => { if (gesture.current) e.preventDefault() }
    el.addEventListener('touchmove', stop, { passive: false })
    return () => el.removeEventListener('touchmove', stop)
  }, [])

  const hours = []
  for (let h = DAY_START; h < DAY_END; h++) hours.push(h)

  const placed = useMemo(() => (tasks ?? [])
    .filter(x => x.start_time && x.due_date === date)
    .map(x => {
      const start = hhmmToHours(x.start_time)
      const dur = Math.max(SNAP_MIN, x.duration_min || 45) / 60
      return { ...x, _start: start, _end: start + dur }
    })
    .filter(x => x._start !== null)
    .sort((a, b) => a._start - b._start), [tasks, date])

  /* Застъпените се делят по ширина. Две неща в един час е нормално; едното
     скрито под другото не е. */
  const laidOut = useMemo(() => {
    const cols = []
    const withCol = placed.map(item => {
      let col = cols.findIndex(end => end <= item._start)
      if (col === -1) { cols.push(item._end); col = cols.length - 1 }
      else cols[col] = item._end
      return { ...item, _col: col }
    })
    return withCol.map(item => ({ ...item, _cols: Math.max(1, cols.length) }))
  }, [placed])

  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday = date === todayStr
  const nowH = now.getHours() + now.getMinutes() / 60
  const nowVisible = isToday && nowH >= DAY_START && nowH < DAY_END

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Без „сега" — там, където денят обикновено започва.
    const focus = nowVisible ? nowH : 8
    el.scrollTop = Math.max(0, (focus - DAY_START) * HOUR_PX - 80)
  }, [date])

  const topFor = h => PAD_TOP + (h - DAY_START) * HOUR_PX
  const heightFor = (a, b) => Math.max(22, (b - a) * HOUR_PX)

  /** Къде по линията е този пиксел, в часове. */
  function hoursAt(clientY) {
    const box = canvasRef.current?.getBoundingClientRect()
    if (!box) return DAY_START
    return DAY_START + (clientY - box.top - PAD_TOP) / HOUR_PX
  }

  /* Тиктакане при всяко прескачане на стъпка — жестът се усеща, а не само се
     вижда. Пази последната стъпка, за да не бръмчи на всеки кадър. */
  const lastStep = useRef(null)
  function tickAt(step) {
    if (lastStep.current === step) return
    lastStep.current = step
    haptic('tap')
  }

  /** Краят на всеки жест: гълта следващия клик, чисти, после записва. */
  function endGesture(commit) {
    gesture.current = null
    lastStep.current = null
    setLive(null)
    draggedAt.current = Date.now()

    /* След вдигане на пръста браузърът праща и съвместимостен click — върху
       това, което е под пръста. Без гълтане всяко пускане отмята задача или
       пита за нова. */
    const swallow = ev => { ev.preventDefault(); ev.stopPropagation() }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 400)

    commit?.()
  }

  function bindWindow(onMoveEv, onUpEv) {
    const move = e => onMoveEv(e)
    const up = e => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      onUpEv(e)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // ── Разтягане: долният ръб, без задържане (мишената е избрана нарочно) ──
  function startResize(e, item) {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const baseMin = Math.max(SNAP_MIN, item.duration_min || 45)
    gesture.current = { kind: 'resize' }
    haptic('tap')

    const calc = ev => Math.max(
      SNAP_MIN,
      Math.round((baseMin + ((ev.clientY - startY) / HOUR_PX) * 60) / SNAP_MIN) * SNAP_MIN,
    )
    bindWindow(
      ev => { const m = calc(ev); tickAt(m); setLive({ id: item.id, minutes: m }) },
      ev => {
        const m = calc(ev)
        endGesture(() => { if (m !== baseMin) { haptic('toggle'); onResize?.(item.id, m) } })
      },
    )
  }

  // ── Местене: натисни-и-задръж върху блока ──
  function startHoldMove(e, item) {
    if (e.button != null && e.button !== 0) return
    const startY = e.clientY
    const originalStart = item._start
    const durH = item._end - item._start
    let armed = false

    const timer = setTimeout(() => {
      armed = true
      gesture.current = { kind: 'move' }
      haptic('toggle')                     // хванато
      setLive({ id: item.id, start: originalStart })
    }, HOLD_MS)

    const calc = ev => {
      const raw = originalStart + (ev.clientY - startY) / HOUR_PX
      return Math.min(DAY_END - durH, Math.max(DAY_START, snapHours(raw)))
    }
    bindWindow(
      ev => {
        if (!armed) {
          if (Math.abs(ev.clientY - startY) > HOLD_SLOP) clearTimeout(timer)
          return
        }
        const s = calc(ev)
        tickAt(s)
        setLive({ id: item.id, start: s })
      },
      ev => {
        clearTimeout(timer)
        if (!armed) return                 // било е натискане, не влачене
        const s = calc(ev)
        endGesture(() => {
          if (s !== originalStart) { haptic('success'); onMove?.(item.id, toSqlTime(s)) }
        })
      },
    )
  }

  // ── Създаване: натисни-и-задръж празно и издърпай ──
  function startHoldCreate(e) {
    if (e.button != null && e.button !== 0) return
    const startY = e.clientY
    const from = Math.max(DAY_START, snapHours(hoursAt(startY)))
    let armed = false

    const timer = setTimeout(() => {
      armed = true
      gesture.current = { kind: 'create' }
      haptic('toggle')
      setLive({ create: true, start: from, end: from + 1 })
    }, HOLD_MS)

    const calc = ev => {
      const to = snapHours(hoursAt(ev.clientY))
      return Math.min(DAY_END, Math.max(from + SNAP_MIN / 60, to))
    }
    bindWindow(
      ev => {
        if (!armed) {
          if (Math.abs(ev.clientY - startY) > HOLD_SLOP) clearTimeout(timer)
          return
        }
        const to = calc(ev)
        tickAt(to)
        setLive({ create: true, start: from, end: to })
      },
      ev => {
        clearTimeout(timer)
        if (!armed) return
        const to = calc(ev)
        endGesture(() => {
          haptic('success')
          onCreate?.({ start: toSqlTime(from), minutes: Math.round((to - from) * 60) })
        })
      },
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.scroller} ref={scrollRef}>
        <div
          className={styles.canvas}
          ref={canvasRef}
          style={{ height: PAD_TOP + (DAY_END - DAY_START) * HOUR_PX }}
          onPointerDown={e => {
            // Само празното платно създава — блоковете си имат свой жест.
            if (e.target === e.currentTarget || e.target.dataset?.slot) startHoldCreate(e)
          }}
        >
          {hours.map(h => (
            /* Самият ред носи белега: той е това, което пръстът намира
               върху празно място, а не платното под него. */
            <div
              key={h}
              className={styles.hourRow}
              data-slot="1"
              style={{ top: topFor(h), height: HOUR_PX }}
            >
              <span className={styles.hourLabel}>{fmtHour(h)}</span>
            </div>
          ))}

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

          {/* Изрязваното в момента. Пунктир, защото още не съществува. */}
          {live?.create && (
            <div
              className={styles.ghost}
              style={{ top: topFor(live.start), height: heightFor(live.start, live.end) }}
            >
              <span className={styles.ghostTime}>
                {fmtClock(live.start)}–{fmtClock(live.end)}
              </span>
            </div>
          )}

          {laidOut.map(item => {
            const mine = live?.id === item.id ? live : null
            const start = mine?.start ?? item._start
            const height = mine?.minutes != null
              ? Math.max(22, (mine.minutes / 60) * HOUR_PX)
              : heightFor(item._start, item._end)
            return (
              <div
                key={item.id}
                className={[
                  styles.block,
                  item.done ? styles.blockDone : '',
                  item.priority >= 2 ? styles.blockHigh : '',
                  height < 44 ? styles.blockShort : '',
                  mine ? styles.blockDragging : '',
                ].join(' ')}
                style={{
                  top: topFor(start),
                  height,
                  left: `calc(46px + ${(item._col / item._cols) * 100}% * 0.86)`,
                  width: `calc(${(1 / item._cols) * 100}% * 0.86 - 6px)`,
                }}
              >
                <button
                  type="button"
                  className={styles.blockBody}
                  onPointerDown={e => startHoldMove(e, item)}
                  onClick={() => {
                    if (recentlyDragged()) return
                    haptic('tap'); onOpenTask?.(item)
                  }}
                >
                  <span className={styles.blockText}>{item.text}</span>
                  <span className={styles.blockTime}>
                    {mine?.minutes != null
                      ? `${fmtClock(start)} · ${mine.minutes} ${t('tl.min')}`
                      : fmtClock(start)}
                  </span>
                </button>

                <span
                  className={styles.blockGrip}
                  onPointerDown={e => startResize(e, item)}
                  role="separator"
                  aria-label={t('tl.resize', { name: item.text })}
                />
              </div>
            )
          })}

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
