import { useState, useEffect, useMemo } from 'react'
import { classifyMuscle, GROUP_LABELS, GROUP_COLORS } from '../../utils/recovery'
import Pictogram from '../Pictogram/Pictogram'
import DayLog from './DayLog'
import styles from './WorkoutCalendar.module.css'

const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
]
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const GROUPS = ['upper', 'lower', 'pull', 'extra']

/**
 * The month, as a record of what was trained.
 *
 * Colour is back, but by muscle group rather than by block — and that is the
 * whole difference between this and the two versions that failed. Seven blocks
 * meant seven colours, two of them sharing a hue, and no amount of squinting
 * fixed it. Three groups is a distinction the eye makes without effort, the
 * legend fits on one line, and it is the same vocabulary the readiness rows
 * above already use.
 *
 * A day still never tries to name the block inside the cell. That is one tap
 * away, in words, underneath — and words never need a legend.
 */
export default function WorkoutCalendar({ completions, blocks = [], lifts = {}, onLogged }) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const byDate = useMemo(() => {
    const m = {}
    for (const c of completions) {
      const e = (m[c.completed_date] ??= { blocks: [], groups: new Set() })
      e.blocks.push(c.block_label)
      const g = classifyMuscle(c.block_label)
      if (g && g !== 'full') e.groups.add(g)
      else if (g === 'full') GROUPS.forEach(x => e.groups.add(x))
    }
    return m
  }, [completions])

  const [selected, setSelected] = useState(null)

  // Opens on the most recent session. Set in an effect rather than as initial
  // state, because completions arrive from the network after the first render —
  // reading them at mount gave an empty map and the card sat there asking to be
  // told what to show.
  useEffect(() => {
    if (selected) return
    const dates = Object.keys(byDate).sort()
    if (dates.length) setSelected(dates[dates.length - 1])
  }, [byDate, selected])

  const cells = useMemo(() => {
    const daysIn = new Date(year, month + 1, 0).getDate()
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7   // Monday first
    const out = Array.from({ length: firstDow }, () => null)
    for (let d = 1; d <= daysIn; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const hit = byDate[ds]
      out.push({ day: d, date: ds, blocks: hit?.blocks ?? [], groups: [...(hit?.groups ?? [])] })
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

  const usedGroups = useMemo(() => {
    const seen = new Set()
    for (const e of Object.values(byDate)) for (const g of e.groups) seen.add(g)
    return GROUPS.filter(g => seen.has(g))
  }, [byDate])

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
          // A day that hit two groups is striped in both rather than picking a
          // winner — it happened, so it is drawn.
          const cols = cell.groups.map(g => GROUP_COLORS[g])
          const tint = cols.length === 0 ? 'var(--accent)'
            : cols.length === 1 ? cols[0]
            : `linear-gradient(135deg, ${cols[0]} 50%, ${cols[1]} 50%)`
          return (
            <button
              key={cell.date}
              type="button"
              disabled={!done}
              onClick={() => setSelected(cell.date)}
              style={done ? { '--tint': cols[0] ?? 'var(--accent)' } : undefined}
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
              {done && (
                <span className={styles.mark} style={{ background: tint }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Only the groups this person actually trains. A fixed list of three put
          ГРЪБ in the legend of someone on an upper/lower split, where it never
          appears — a key to a colour that is not on the page. */}
      {usedGroups.length > 0 && (
        <div className={styles.legend}>
          {usedGroups.map(g => (
            <span key={g} className={styles.legendItem} style={{ color: GROUP_COLORS[g] }}>
              <Pictogram name={g} size={15} />
              <span className={styles.legendLabel}>{GROUP_LABELS[g]}</span>
            </span>
          ))}
        </div>
      )}

      {/* The day opens here: what was done, then its exercises, editable. The
          calendar is the log book, so the log book is where logging happens. */}
      <div className={styles.detail}>
        {chosen ? (
          <>
            <span className={styles.detailDate}>
              {new Date(selected + 'T12:00:00').toLocaleDateString('bg-BG', {
                day: 'numeric', month: 'long',
              })}
            </span>
            <span className={styles.detailBlocks}>{chosen.blocks.join(' · ')}</span>
          </>
        ) : (
          <span className={styles.detailEmpty}>Избери ден с тренировка</span>
        )}
      </div>

      {chosen && (
        <DayLog
          date={selected}
          blockLabels={chosen.blocks}
          blocks={blocks}
          onLogged={onLogged}
        />
      )}
    </div>
  )
}
