import { useMemo } from 'react'
import { classifyMuscle, GROUP_LABELS, RECOVERY_H } from '../../utils/recovery'
import styles from './MuscleStatus.module.css'

// Green, amber, red — the same three steps and the same thresholds the
// readiness ring uses, so a percentage means the same thing wherever it is
// shown. A fourth scale invented here would be a fourth thing to learn.
function recoveryColor(pct) {
  if (pct >= 80) return '#81C784'
  if (pct >= 50) return 'var(--accent)'
  return '#ef5350'
}

/** "вчера", "преди 3 дни", or a date once it stops meaning anything in days. */
function agoLabel(dateStr) {
  const days = Math.round((Date.now() - new Date(dateStr + 'T12:00:00')) / 86400000)
  if (days <= 0)  return 'днес'
  if (days === 1) return 'вчера'
  if (days < 14)  return `преди ${days} дни`
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
}

/**
 * Where each muscle group stands.
 *
 * The first version of this was a four-week grid, one row per group — twelve
 * rows of near-identical squares to convey two facts per muscle. More
 * information and less understanding, which is the usual trade when a display
 * is designed around the data available rather than the question being asked.
 *
 * The question is: when did I last hit this, and is it ready. So that is what
 * it says, in that order, with the bar carrying the number so it can be read
 * without being read.
 */
export default function MuscleStatus({ completions, recovery }) {
  const { rows, recent } = useMemo(() => {
    const last = {}
    for (const c of completions) {
      const g = classifyMuscle(c.block_label)
      if (!g) continue
      if (!last[g] || c.completed_date > last[g]) last[g] = c.completed_date
    }

    const rows = Object.keys(GROUP_LABELS)
      .filter(g => last[g])
      .map(g => {
        const pct = recovery?.[g]?.pct ?? 100
        const hours = recovery?.[g]?.hours ?? 0
        const left = Math.max(0, Math.round(RECOVERY_H[g] - hours))
        return {
          group: g,
          label: GROUP_LABELS[g],
          date: last[g],
          pct,
          ready: pct >= 80,
          color: recoveryColor(pct),
          left,
        }
      })
      .sort((a, b) => b.pct - a.pct)

    // The consistency question, answered with one number instead of a month of
    // squares to count.
    const since = new Date()
    since.setDate(since.getDate() - 27)
    const cutoff = since.toISOString().slice(0, 10)
    const recent = new Set(
      completions.filter(c => c.completed_date >= cutoff).map(c => c.completed_date)
    ).size

    return { rows, recent }
  }, [completions, recovery])

  if (!rows.length) {
    return <p className={styles.empty}>Още няма записани тренировки.</p>
  }

  return (
    <div className={styles.wrap}>
      {rows.map(r => (
        <div key={r.group} className={styles.row}>
          <div className={styles.top}>
            <span className={styles.name}>{r.label}</span>
            <span className={styles.state} style={{ color: r.color }}>
              {r.ready ? 'готова' : `още ${r.left} ч`}
            </span>
          </div>

          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${r.pct}%`, background: r.color }}
            />
          </div>

          <span className={styles.last}>последно {agoLabel(r.date)}</span>
        </div>
      ))}

      <p className={styles.total}>
        {recent} {recent === 1 ? 'тренировка' : 'тренировки'} за последните 4 седмици
      </p>
    </div>
  )
}
