import { useState, useMemo } from 'react'
import styles from './WorkoutCalendar.module.css'

const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
]
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

/**
 * The month, as a record of what was trained.
 *
 * Two earlier attempts failed for the same reason: both tried to say *which*
 * block was done inside the cell — first as coloured dots, then as two-letter
 * codes. Seven blocks means seven colours, two of which shared a hue, and no
 * amount of squinting fixes that; abbreviations turned the month into a wall
 * of letters.
 *
 * So the grid answers only what a grid is good at: which days, and where the
 * gaps are. There is one mark and it is the same for every session, which
 * means nothing to identify. Which block was done is one tap away, in words,
 * underneath — and words never need a legend.
 */
export default function WorkoutCalendar({ completions }) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const byDate = useMemo(() => {
    const m = {}
    for (const c of completions) {
      (m[c.completed_date] ??= []).push(c.block_label)
    }
    return m
  }, [completions])

  // Opens on the most recent session, so the card already says something.
  const [selected, setSelected] = useState(() => {
    const dates = Object.keys(byDate).sort()
    return dates[dates.length - 1] ?? null
  })

  const cells = useMemo(() => {
    const daysIn = new Date(year, month + 1, 0).getDate()
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7   // Monday first
    const out = Array.from({ length: firstDow }, () => null)
    for (let d = 1; d <= daysIn; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      out.push({ day: d, date: ds, blocks: byDate[ds] ?? [] })
    }
    return out
  }, [year, month, byDate])

  const monthCount = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    return Object.keys(byDate).filter(d => d.startsWith(prefix)).length
  }, [byDate, year, month])

  function step(delta) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const chosen = selected ? byDate[selected] : null

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <button className={styles.nav} onClick={() => step(-1)} type="button" aria-label="Предходен месец">‹</button>
        <div className={styles.title}>
          <span className={styles.month}>{MONTHS[month]} {year}</span>
          <span className={styles.count}>
            {monthCount} {monthCount === 1 ? 'тренировка' : 'тренировки'}
          </span>
        </div>
        <button className={styles.nav} onClick={() => step(1)} type="button" aria-label="Следващ месец">›</button>
      </div>

      <div className={styles.dowRow}>
        {DOW.map(d => <span key={d} className={styles.dow}>{d}</span>)}
      </div>

      <div className={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <span key={`pad-${i}`} />
          const done   = cell.blocks.length > 0
          const isPast = cell.date < todayStr
          return (
            <button
              key={cell.date}
              type="button"
              disabled={!done}
              onClick={() => setSelected(cell.date)}
              className={[
                styles.day,
                done ? styles.done : '',
                cell.date === todayStr ? styles.today : '',
                cell.date === selected ? styles.selected : '',
                !done && isPast ? styles.missed : '',
              ].join(' ')}
              aria-label={done ? `${cell.day} — ${cell.blocks.join(', ')}` : `${cell.day}`}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {/* What was done, in words. The grid never tries to say this. */}
      <div className={styles.detail}>
        {chosen ? (
          <>
            <span className={styles.detailDate}>
              {new Date(selected + 'T12:00:00').toLocaleDateString('bg-BG', {
                day: 'numeric', month: 'long',
              })}
            </span>
            <span className={styles.detailBlocks}>{chosen.join(' · ')}</span>
          </>
        ) : (
          <span className={styles.detailEmpty}>Избери ден с тренировка</span>
        )}
      </div>
    </div>
  )
}
