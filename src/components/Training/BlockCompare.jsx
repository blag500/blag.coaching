import { useMemo } from 'react'
import styles from './BlockCompare.module.css'

const WEEKS = 8
const DAYS  = WEEKS * 7

/** Best working set of a session: heaviest weight, and the reps done with it. */
function topSet(rows) {
  return rows.reduce((best, r) => {
    if (!r.weight) return best
    if (!best || r.weight > best.weight) return r
    return best
  }, null)
}

/**
 * Start against now, for every exercise in the block.
 *
 * This is the method the training screen exists to serve: keep the same lifts
 * for eight weeks, log them, and at the end look at whether week eight is
 * heavier than week one. The per-exercise charts already showed each lift on
 * its own; nothing answered the question the block is actually asking, which is
 * about all of them at once.
 *
 * Compared on the heaviest set of the first session in the window against the
 * heaviest of the latest — not averages. A block is judged on what it moved.
 */
export default function BlockCompare({ block, allLogs }) {
  const { rows, since } = useMemo(() => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - DAYS)
    const cutoff = cutoffDate.toISOString().slice(0, 10)

    const rows = (block.exercises ?? []).map(ex => {
      const logs = (allLogs[ex.name] ?? [])
        .filter(l => l.date >= cutoff && l.weight > 0)
        .sort((a, b) => a.date.localeCompare(b.date))

      if (!logs.length) return { name: ex.name, sessions: 0 }

      // Group by day so a session counts once, however many sets were logged.
      const byDay = {}
      for (const l of logs) (byDay[l.date] ??= []).push(l)
      const days = Object.keys(byDay).sort()

      const first = topSet(byDay[days[0]])
      const last  = topSet(byDay[days[days.length - 1]])
      const delta = last && first ? last.weight - first.weight : 0

      return {
        name: ex.name,
        sessions: days.length,
        first,
        last,
        firstDate: days[0],
        lastDate: days[days.length - 1],
        delta,
        pct: first?.weight ? Math.round((delta / first.weight) * 100) : 0,
        single: days.length === 1,
      }
    })

    return { rows, since: cutoff }
  }, [block, allLogs])

  const tracked = rows.filter(r => r.sessions > 0)
  if (!tracked.length) {
    return (
      <p className={styles.empty}>
        Още няма логнати тежести за този блок през последните {WEEKS} седмици.
      </p>
    )
  }

  const sinceLabel = new Date(since + 'T12:00:00')
    .toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })

  return (
    <div className={styles.wrap}>
      <p className={styles.lead}>
        Първата срещу последната тренировка от {sinceLabel} насам
      </p>

      {rows.map(r => (
        <div key={r.name} className={styles.row}>
          <span className={styles.name}>{r.name}</span>

          {r.sessions === 0 ? (
            <span className={styles.none}>няма записи</span>
          ) : r.single ? (
            /* One session is a starting point, not a trend. Saying "+0" would
               claim a measurement that has not been made yet. */
            <span className={styles.startOnly}>
              {r.first.weight}кг × {r.first.reps} · начало
            </span>
          ) : (
            <span className={styles.compare}>
              <span className={styles.from}>{r.first.weight}кг × {r.first.reps}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.to}>{r.last.weight}кг × {r.last.reps}</span>
              <span
                className={styles.delta}
                style={{ color: r.delta > 0 ? '#81C784' : r.delta < 0 ? '#ef5350' : 'var(--muted)' }}
              >
                {r.delta > 0 ? '+' : ''}{Math.round(r.delta * 10) / 10}кг
                {r.delta !== 0 && ` · ${r.pct > 0 ? '+' : ''}${r.pct}%`}
              </span>
            </span>
          )}

          {r.sessions > 0 && (
            <span className={styles.count}>{r.sessions} трен.</span>
          )}
        </div>
      ))}
    </div>
  )
}
