import { useHabitHistory } from '../../hooks/useHabitHistory'
import styles from './StreakBar.module.css'

const DAY_LABELS_BG = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    days.push({ iso, label: DAY_LABELS_BG[d.getDay()], isToday: i === 0 })
  }
  return days
}

function calcStreak(history) {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const entry = history.get(iso)
    if (entry && entry.completed === entry.total) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export default function StreakBar() {
  const history  = useHabitHistory()
  const days     = getLast7Days()
  const streak   = calcStreak(history)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>ПОСЛЕДНИ 7 ДНИ</span>
        {streak > 0 && (
          <span className={styles.streakBadge}>{streak} подред</span>
        )}
      </div>

      <div className={styles.bars}>
        {days.map(({ iso, label, isToday }) => {
          const entry  = history.get(iso)
          const ratio  = entry ? entry.completed / entry.total : 0
          const done   = ratio === 1
          const filled = ratio > 0

          return (
            <div
              key={iso}
              className={`${styles.col} ${isToday ? styles.colToday : ''}`}
            >
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${done ? styles.barDone : ''}`}
                  style={{ height: `${Math.max(ratio * 100, filled ? 8 : 0)}%` }}
                  aria-label={`${label}: ${entry ? `${entry.completed}/${entry.total}` : '0'}`}
                  role="meter"
                  aria-valuenow={entry?.completed ?? 0}
                  aria-valuemax={entry?.total ?? 6}
                />
              </div>
              <span className={`${styles.dayLabel} ${done ? styles.dayDone : ''}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
