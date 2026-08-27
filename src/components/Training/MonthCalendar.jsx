import { useMemo, useState } from 'react'
import { monthsShort, iso } from '../../utils/training'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './MonthCalendar.module.css'

// One shade per plan variation. Assignment is deterministic by label so a
// block keeps its colour from one month to the next; the palette has enough
// steps that a five-day split still has five distinct dots.
const PALETTE = [
  '#FFB74D', '#90CAF9', '#A5D6A7', '#CE93D8',
  '#EF9A9A', '#FFD54F', '#80DEEA', '#FFAB91',
]

function hashLabel(s = '') {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) & 0x7fffffff
  return h
}

/**
 * Month grid with a coloured dot per completed block per day, one distinct
 * colour per plan variation. Tap a day and its completions expand below the
 * grid — which block, and a link into the day's log.
 */
export default function MonthCalendar({ completions = [], blocks = [], onOpenDay }) {
  const { t } = useSettings()
  const MS = monthsShort(t)
  const DAY_NAMES = [0, 1, 2, 3, 4, 5, 6].map(i => t(`daysMon.${i}`))
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [picked, setPicked] = useState(null)

  // A palette entry per block label the user has. Rest blocks are grey; a
  // completion that names a block no longer in the plan still gets a stable
  // colour from the same hash.
  const colorFor = useMemo(() => {
    const map = new Map()
    for (const b of blocks) {
      if (b.isRest || /почивк|\brest\b/i.test(b.label)) {
        map.set(b.label, 'rgba(255,255,255,0.35)')
      } else {
        map.set(b.label, PALETTE[hashLabel(b.label) % PALETTE.length])
      }
    }
    return label => map.get(label) ?? PALETTE[hashLabel(label) % PALETTE.length]
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
    const idx = (first.getDay() + 6) % 7   // Monday-first
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

  const pickedList = picked ? (byDate.get(picked) ?? []) : []

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <button type="button" className={styles.nav} onClick={prevMonth} aria-label={t('mc.prevMonth')}>‹</button>
        <span className={styles.title}>
          {t(`months.${cursor.m}`)} {cursor.y}
        </span>
        <button
          type="button"
          className={styles.nav}
          onClick={nextMonth}
          aria-label={t('mc.nextMonth')}
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
          // Dedup by label so the same completion never plots twice.
          const labels = [...new Set(done.map(c => c.block_label))].slice(0, 4)
          const isToday = dateIso === todayStr
          const isPicked = dateIso === picked
          return (
            <button
              key={dateIso}
              type="button"
              className={`${styles.cell} ${isToday ? styles.today : ''} ${done.length ? styles.hasWork : ''} ${isPicked ? styles.picked : ''}`}
              onClick={() => setPicked(p => p === dateIso ? null : dateIso)}
              aria-label={done.length ? `${d} ${MS[cursor.m]} · ${labels.join(', ')}` : `${d} ${MS[cursor.m]}`}
            >
              <span className={styles.dayNum}>{d}</span>
              {labels.length > 0 && (
                <span className={styles.dots}>
                  {labels.map(l => (
                    <span key={l} className={styles.dot} style={{ background: colorFor(l) }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day — the block names in full, with an entry point back into
          the log for that day if the parent wants one. */}
      {picked && (
        <div className={styles.picked_panel}>
          <div className={styles.picked_head}>
            <span className={styles.picked_date}>
              {new Date(picked + 'T12:00:00').toLocaleDateString('bg-BG', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </span>
            <button
              type="button"
              className={styles.picked_close}
              onClick={() => setPicked(null)}
              aria-label={t('mc.close')}
            >✕</button>
          </div>
          {pickedList.length === 0 ? (
            <p className={styles.picked_empty}>{t('mc.noSession')}</p>
          ) : (
            <ul className={styles.picked_list}>
              {pickedList.map((c, i) => (
                <li key={i} className={styles.picked_row}>
                  <span className={styles.picked_swatch} style={{ background: colorFor(c.block_label) }} />
                  <span className={styles.picked_label}>{c.block_label}</span>
                </li>
              ))}
              {onOpenDay && (
                <button type="button" className={styles.picked_open} onClick={() => onOpenDay(picked)}>
                  {t('mc.openInLog')}
                </button>
              )}
            </ul>
          )}
        </div>
      )}

    </div>
  )
}
