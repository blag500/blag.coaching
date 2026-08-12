import { useMemo } from 'react'
import { classifyMuscle, GROUP_LABELS, RECOVERY_H } from '../../utils/recovery'
import styles from './MuscleTimeline.module.css'

const WEEKS = 4
const DAYS  = WEEKS * 7
const DOW   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * Four weeks, one row per muscle group.
 *
 * The month grid answered "which days did I train", which is the wrong
 * question for someone who trains a group once it has recovered. This answers
 * the one actually being asked — when did I last hit legs, and how often am I
 * getting to my back — and it does it without asking anyone to identify a
 * colour, because every row carries its own name.
 *
 * A filled mark is the A session of that group, a hollow one the B. That is the
 * only distinction the old seven-colour legend was really carrying.
 */
export default function MuscleTimeline({ completions, recovery }) {
  const { days, rows, weeksLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    // Start on the Monday of the week four weeks back, so columns line up with
    // weekdays rather than drifting.
    const start = new Date(today)
    const dow = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dow - (WEEKS - 1) * 7)

    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return { date: dateStr(d), dom: d.getDate(), future: d > today }
    })

    // group → date → 'a' | 'b' | true
    const hits = {}
    for (const c of completions) {
      const g = classifyMuscle(c.block_label)
      if (!g) continue
      const variant = /\bb\b|б$/i.test((c.block_label || '').trim()) ? 'b' : 'a'
      if (!hits[g]) hits[g] = {}
      hits[g][c.completed_date] = variant
    }

    const rows = Object.keys(GROUP_LABELS)
      .filter(g => hits[g])
      .map(g => ({
        group: g,
        label: GROUP_LABELS[g],
        marks: days.map(d => hits[g]?.[d.date] ?? null),
        pct: recovery?.[g]?.pct ?? null,
      }))

    const weeksLabels = Array.from({ length: WEEKS }, (_, w) => {
      const d = days[w * 7]
      return `${d.dom}`
    })

    return { days, rows, weeksLabels }
  }, [completions, recovery])

  if (!rows.length) {
    return <p className={styles.empty}>Още няма записани тренировки.</p>
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.dowRow}>
        <span className={styles.rowLabel} />
        {DOW.map((d, i) => <span key={i} className={styles.dow}>{d}</span>)}
      </div>

      {rows.map(row => (
        <div key={row.group} className={styles.groupBlock}>
          <div className={styles.groupHead}>
            <span className={styles.groupName}>{row.label}</span>
            {row.pct !== null && (
              <span
                className={styles.groupPct}
                style={{ color: row.pct >= 80 ? '#81C784' : row.pct >= 55 ? 'var(--accent)' : '#ef5350' }}
              >
                {row.pct}%
              </span>
            )}
          </div>

          {Array.from({ length: WEEKS }, (_, w) => (
            <div key={w} className={styles.week}>
              <span className={styles.weekLabel}>{weeksLabels[w]}</span>
              {row.marks.slice(w * 7, w * 7 + 7).map((mark, i) => {
                const day = days[w * 7 + i]
                return (
                  <span
                    key={i}
                    className={[
                      styles.cell,
                      day.future ? styles.future : '',
                      mark === 'a' ? styles.markA : '',
                      mark === 'b' ? styles.markB : '',
                    ].join(' ')}
                    title={mark ? `${row.label} · ${day.date}` : day.date}
                  />
                )
              })}
            </div>
          ))}
        </div>
      ))}

      <div className={styles.key}>
        <span className={styles.keyItem}><span className={`${styles.cell} ${styles.markA}`} /> A</span>
        <span className={styles.keyItem}><span className={`${styles.cell} ${styles.markB}`} /> B</span>
      </div>
    </div>
  )
}
