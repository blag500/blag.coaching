import WorkoutHeatmap from './WorkoutHeatmap'
import { kg, bigNum, agoLabel, e1RM } from '../../utils/training'
import styles from './TrainingDashboard.module.css'

const R = 34
const C = 2 * Math.PI * R

/** The week against the goal, as one shape. A ring rather than a bar because
 *  a week is a thing that comes round again, and a bar that fills and resets
 *  reads as a task rather than a rhythm. */
function GoalRing({ done, goal }) {
  const pct = goal > 0 ? Math.min(1, done / goal) : 0
  const met = goal > 0 && done >= goal
  return (
    <svg viewBox="0 0 84 84" className={styles.ring} role="img"
         aria-label={`${done} от ${goal} тренировки тази седмица`}>
      <circle cx="42" cy="42" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
      <circle
        cx="42" cy="42" r={R} fill="none"
        stroke={met ? '#81C784' : 'var(--accent)'}
        strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`}
        transform="rotate(-90 42 42)"
        style={{ transition: 'stroke-dasharray 500ms ease' }}
      />
      <text x="42" y="45" textAnchor="middle" fontSize="20" fontFamily="var(--font-heading)"
            fill={met ? '#81C784' : 'var(--text)'}>{done}</text>
      <text x="42" y="58" textAnchor="middle" fontSize="10" fontFamily="var(--font-body)"
            fill="var(--muted)">от {goal}</text>
    </svg>
  )
}

/** The heaviest set of an exercise, which is what "beat it" actually means. */
function topSet(ex) {
  let best = null
  for (const s of ex.sets) {
    if (!s.weight) continue
    if (!best || e1RM(s.weight, s.reps) > e1RM(best.weight, best.reps)) best = s
  }
  return best
}

/**
 * The numbers above the log: the week, the totals, the year as a wall of days,
 * and the session this one is measured against.
 *
 * None of it is new data — it is the same completions and sets the calendar has
 * always held. What it adds is a horizon. The page could say what was done
 * yesterday and what to do today, and had no way at all to say whether the last
 * three months were better than the three before them.
 */
export default function TrainingDashboard({ sessions, stats, toBeat, onOpenSession }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>СЕДМИЧНА ЦЕЛ</h3>
          <div className={styles.ringWrap}><GoalRing done={stats.week} goal={stats.goal} /></div>
          <div className={styles.streak}>
            <span className={styles.streakNum}>{stats.streak}</span>
            <span className={styles.streakLabel}>
              {stats.streak === 1 ? 'седмица подред' : 'седмици подред'}
            </span>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>ТРЕНИРОВКИ</h3>
          <div className={styles.bigStat}>
            <span className={styles.bigNum}>{stats.total}</span>
            <span className={styles.bigLabel}>ВСИЧКИ</span>
          </div>
          <div className={styles.subStats}>
            <div className={styles.subStat}>
              <span className={styles.subNum}>{stats.year}</span>
              <span className={styles.subLabel}>ГОДИНА</span>
            </div>
            <div className={styles.subStat}>
              <span className={styles.subNum}>{stats.month}</span>
              <span className={styles.subLabel}>МЕСЕЦ</span>
            </div>
            <div className={`${styles.subStat} ${styles.subStatLive}`}>
              <span className={styles.subNum}>{stats.week}</span>
              <span className={styles.subLabel}>СЕДМИЦА</span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>ОБЕМ ПО ДНИ</h3>
        <WorkoutHeatmap sessions={sessions} />
      </section>

      {/* The last time this block was trained, with the load to beat on each
          lift. It is the only number that makes today's first set a decision
          rather than a guess. */}
      {toBeat && (
        <button type="button" className={`${styles.card} ${styles.beat}`} onClick={onOpenSession}>
          <div className={styles.beatHead}>
            <div>
              <span className={styles.beatEyebrow}>ПОСЛЕДНО · {agoLabel(toBeat.date).toUpperCase()}</span>
              <span className={styles.beatTitle}>{toBeat.title}</span>
            </div>
            <span className={styles.beatBadge}>ЗА НАДМИНАВАНЕ</span>
          </div>

          <ul className={styles.beatList}>
            {toBeat.exerciseList.slice(0, 4).map(ex => {
              const t = topSet(ex)
              return (
                <li key={ex.name} className={styles.beatRow}>
                  <span className={styles.beatName}>{ex.name}</span>
                  <span className={styles.beatVal}>
                    {t ? `${kg(t.weight)}кг × ${t.reps ?? '?'}` : `${ex.sets.length} серии`}
                  </span>
                </li>
              )
            })}
            {toBeat.exerciseList.length > 4 && (
              <li className={styles.beatMore}>+ още {toBeat.exerciseList.length - 4}</li>
            )}
          </ul>

          {toBeat.volume > 0 && (
            <span className={styles.beatFoot}>{bigNum(toBeat.volume)} кг общ обем · {toBeat.setCount} серии</span>
          )}
        </button>
      )}
    </div>
  )
}
