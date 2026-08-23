import { useMemo, useState } from 'react'
import { resolveGroups } from '../../utils/recovery'
import { MONTHS_SHORT, dayDate, iso, mondayOf } from '../../utils/training'
import styles from './MonthCalendar.module.css'

const MONTHS_FULL = [
  'Януари','Февруари','Март','Април','Май','Юни',
  'Юли','Август','Септември','Октомври','Ноември','Декември',
]
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const GROUP_COLOR = {
  upper: '#FFB74D',
  pull:  '#EF9A9A',
  lower: '#90CAF9',
  extra: '#A5D6A7',
}

/**
 * Month grid with a coloured dot per completed block per day. The dots come
 * from workout_completions — the "Готово" tick — and their colour comes from
 * the block's groups, so a glance at the month says which halves of the body
 * a week actually covered.
 */
export default function MonthCalendar({ completions = [], blocks = [] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const groupsByLabel = useMemo(() => {
    const out = {}
    for (const b of blocks) out[b.label] = resolveGroups(b)
    return out
  }, [blocks])

  const byDate = useMemo(() => {
    const map = new Map()
    for (const c of completions) {
      const list = map.get(c.completed_date) ?? []
      list.push(c)
      map.set(c.completed_date, list)
    }
    return map
  }, [completions])

  const { firstDayIdx, daysInMonth } = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    // Monday = 0 for us; JS getDay: 0 = Sunday.
    const idx = (first.getDay() + 6) % 7
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate()
    return { firstDayIdx: idx, daysInMonth: days }
  }, [cursor.y, cursor.m])

  const todayStr = iso(new Date())

  const prevMonth = () => setCursor(c =>
    c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCursor(c =>
    c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })

  const isFutureMonth = cursor.y > new Date().getFullYear() ||
    (cursor.y === new Date().getFullYear() && cursor.m >= new Date().getMonth())

  const cells = []
  for (let i = 0; i < firstDayIdx; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <button type="button" className={styles.nav} onClick={prevMonth} aria-label="Предишен месец">‹</button>
        <span className={styles.title}>
          {MONTHS_FULL[cursor.m]} {cursor.y}
        </span>
        <button
          type="button"
          className={styles.nav}
          onClick={nextMonth}
          aria-label="Следващ месец"
          disabled={isFutureMonth}
        >›</button>
      </div>

      <div className={styles.dayNames}>
        {DAY_NAMES.map(d => <span key={d} className={styles.dayName}>{d}</span>)}
      </div>

      <div className={styles.grid}>
        {cells.map((d, i) => {
          if (d == null) return <span key={`e-${i}`} className={styles.empty} />
          const dateIso = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const done = byDate.get(dateIso) ?? []
          // Deduplicate colours so a session ticked twice doesn't triple-dot.
          const colours = [...new Set(
            done.flatMap(c => (groupsByLabel[c.block_label] ?? []).map(g => GROUP_COLOR[g]))
          )].filter(Boolean).slice(0, 4)
          const isToday = dateIso === todayStr
          return (
            <div
              key={dateIso}
              className={`${styles.cell} ${isToday ? styles.today : ''} ${done.length ? styles.hasWork : ''}`}
              title={done.length ? done.map(c => c.block_label).join(' · ') : ''}
            >
              <span className={styles.dayNum}>{d}</span>
              {colours.length > 0 && (
                <span className={styles.dots}>
                  {colours.map((col, j) => (
                    <span key={j} className={styles.dot} style={{ background: col }} />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: GROUP_COLOR.upper }} /> ГОРНА
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: GROUP_COLOR.pull }} /> ГРЪБ
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: GROUP_COLOR.lower }} /> ДОЛНА
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: GROUP_COLOR.extra }} /> ЕКСТРА
        </span>
      </div>
    </div>
  )
}
