import { useMemo } from 'react'
import styles from './SessionLog.module.css'

function agoLabel(dateStr) {
  const days = Math.round((Date.now() - new Date(dateStr + 'T12:00:00')) / 86400000)
  if (days <= 0)  return 'днес'
  if (days === 1) return 'вчера'
  if (days < 7)   return `преди ${days} дни`
  return null
}

/**
 * What was trained, and when.
 *
 * Cut when the month grid went, and it should not have been: readiness says
 * what to do next, but a training page also has to be a record of what was
 * actually done. A list rather than a grid of colours — a date and a name need
 * no legend, and there is nothing to identify.
 */
export default function SessionLog({ completions, limit = 8 }) {
  const sessions = useMemo(() => {
    // Newest first, and a day with two blocks logged stays two lines, because
    // that is what happened.
    return [...completions]
      .sort((a, b) => b.completed_date.localeCompare(a.completed_date))
      .slice(0, limit)
  }, [completions, limit])

  if (!sessions.length) return null

  return (
    <div className={styles.wrap}>
      {sessions.map((s, i) => {
        const d = new Date(s.completed_date + 'T12:00:00')
        const ago = agoLabel(s.completed_date)
        return (
          <div key={`${s.completed_date}-${s.block_label}-${i}`} className={styles.row}>
            <span className={styles.date}>
              {d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}
            </span>
            <span className={styles.label}>{s.block_label}</span>
            <span className={styles.ago}>
              {ago ?? d.toLocaleDateString('bg-BG', { weekday: 'short' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
