import { useMemo } from 'react'
import styles from './BlockCompare.module.css'

const WEEKS = 8
const DAYS  = WEEKS * 7

/**
 * One number that folds weight and reps together.
 *
 * Progression measured on load alone called 80kg × 10 no better than 80kg × 8,
 * and reported an eight-week block as "+0кг" while the reps had gone up by a
 * quarter. Epley's estimate is the ordinary way lifters compare sets that are
 * not the same shape: it says what the set is worth, not what was on the bar.
 */
function e1RM(weight, reps) {
  if (!weight) return 0
  return weight * (1 + (reps || 1) / 30)
}

/**
 * Total work in a session: kilograms actually moved.
 *
 * Nobody times a set, so time under tension cannot be recorded without asking
 * for something that will not be given — and a field left empty is worse than
 * no field. Volume measures the same thing from the other side: it is already
 * in the data, it needs nothing from anyone, and it rises when reps or sets
 * rise at the same load, which is exactly the progression that "+0кг" was
 * hiding.
 *
 * Rows from before one-set-per-row are a whole exercise carrying "sets: 4",
 * while rows since are a single set carrying "sets: 1" — multiplying by the
 * count is right for both, and a naïve sum would have undercounted every old
 * session fourfold.
 */
function volume(rows) {
  return rows.reduce((sum, r) => sum + (r.weight || 0) * (r.reps || 0) * (r.sets || 1), 0)
}

/** Sets behind a session, in the same two shapes. */
function setCount(rows) {
  return rows.reduce((n, r) => n + (r.sets || 1), 0)
}

/** Thousands separated — a five-figure tonnage is unreadable as a bare run. */
const fmt = n => Math.round(n).toLocaleString('bg-BG')

/** Best set of a session — best by what it was worth, not by what it weighed. */
function topSet(rows) {
  return rows.reduce((best, r) => {
    if (!r.weight) return best
    if (!best || e1RM(r.weight, r.reps) > e1RM(best.weight, best.reps)) return r
    return best
  }, null)
}

/** The change, said in whatever actually moved. */
function deltaLabel(first, last) {
  const dW = Math.round((last.weight - first.weight) * 10) / 10
  const dR = (last.reps || 0) - (first.reps || 0)
  const parts = []
  if (dW) parts.push(`${dW > 0 ? '+' : ''}${dW}кг`)
  if (dR) parts.push(`${dR > 0 ? '+' : ''}${dR} повт.`)
  return parts.join(' · ')
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

      const firstRows = byDay[days[0]]
      const lastRows  = byDay[days[days.length - 1]]
      const first = topSet(firstRows)
      const last  = topSet(lastRows)
      const a = first ? e1RM(first.weight, first.reps) : 0
      const b = last  ? e1RM(last.weight,  last.reps)  : 0
      const delta = b - a

      const volFirst  = volume(firstRows)
      const volLast   = volume(lastRows)
      const setsFirst = setCount(firstRows)
      const setsLast  = setCount(lastRows)

      return {
        name: ex.name,
        sessions: days.length,
        first,
        last,
        firstDate: days[0],
        lastDate: days[days.length - 1],
        delta,
        change: first && last ? deltaLabel(first, last) : '',
        pct: a ? Math.round((delta / a) * 100) : 0,
        single: days.length === 1,
        volFirst,
        volLast,
        volPct: volFirst ? Math.round(((volLast - volFirst) / volFirst) * 100) : 0,
        // Volume across a different number of sets is not the same measurement,
        // so the comparison says so rather than crediting an extra set as
        // strength gained.
        setsChanged: setsFirst !== setsLast,
        setsFirst,
        setsLast,
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
        Първата срещу последната тренировка от {sinceLabel} насам.
        Процентът брои и повторенията, не само килограмите, а обемът —
        колко тежест общо си вдигнал в тренировката.
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
                style={{ color: r.delta > 0.5 ? '#81C784' : r.delta < -0.5 ? '#ef5350' : 'var(--muted)' }}
              >
                {/* What moved, then what it was worth. A rep is progression and
                    now says so instead of reading as no change at all. */}
                {r.change || 'без промяна'}
                {r.change && ` · ${r.pct > 0 ? '+' : ''}${r.pct}%`}
              </span>

              {/* Work done, for the sessions where the top set barely moved but
                  the session was plainly harder. */}
              {r.volFirst > 0 && (
                <span className={styles.volume}>
                  обем {fmt(r.volFirst)} → {fmt(r.volLast)} кг
                  <span
                    className={styles.volPct}
                    style={{ color: r.volPct > 2 ? '#81C784' : r.volPct < -2 ? '#ef5350' : 'var(--muted)' }}
                  >
                    {r.volPct > 0 ? '+' : ''}{r.volPct}%
                  </span>
                  {r.setsChanged && (
                    <span className={styles.volNote}>
                      ({r.setsFirst} → {r.setsLast} серии)
                    </span>
                  )}
                </span>
              )}
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
