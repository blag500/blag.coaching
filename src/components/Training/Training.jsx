import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { TRAINING_SPLIT, DAYS_BG_TO_EN } from '../../data/appData'
import DayCard from './DayCard'
import styles from './Training.module.css'

function getTodayBg() {
  const en = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  return DAYS_BG_TO_EN[en] || 'Понеделник'
}

function getNextWorkout(split, dayName) {
  const idx = split.findIndex(d => d.day === dayName)
  for (let i = 1; i <= split.length; i++) {
    const candidate = split[(idx + i) % split.length]
    if (candidate.label !== 'REST' && !candidate.isRest) return candidate
  }
  return null
}

export default function Training() {
  const { profile } = useAuth()
  const split = (profile?.training_plan?.length === 7)
    ? profile.training_plan
    : TRAINING_SPLIT

  const todayBg = getTodayBg()
  const [selectedDay, setSelectedDay] = useState(todayBg)

  const dayData     = split.find(d => d.day === selectedDay)
  const isRest      = dayData?.label === 'REST' || dayData?.isRest
  const nextWorkout = isRest ? getNextWorkout(split, selectedDay) : null

  const splitLabel = profile?.training_plan?.length === 7
    ? 'Персонален план'
    : 'Upper / Lower Split'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>TRAINING</h1>
        <p className={styles.subtitle}>{splitLabel}</p>
      </header>

      <div className={styles.pillBar} role="tablist" aria-label="Ден от седмицата">
        {split.map(d => (
          <button
            key={d.day}
            className={`${styles.pill} ${selectedDay === d.day ? styles.activePill : ''}`}
            onClick={() => setSelectedDay(d.day)}
            role="tab"
            aria-selected={selectedDay === d.day}
          >
            <span className={styles.pillDay}>{d.day.slice(0, 3)}</span>
            {d.day === todayBg && (
              <span className={styles.todayDot} aria-label="Днес" />
            )}
          </button>
        ))}
      </div>

      {dayData && (
        <div role="tabpanel">
          <div className={styles.dayTitle}>
            <span className={styles.dayName}>{dayData.day}</span>
            {dayData.day === todayBg && (
              <span className={styles.todayBadge}>ДНЕС</span>
            )}
          </div>
          <DayCard dayData={dayData} />
        </div>
      )}

      {nextWorkout && (
        <div className={styles.nextSection}>
          <p className={styles.nextLabel}>
            СЛЕДВАЩ ТРЕНИНГ
            <span className={styles.nextDay}>{nextWorkout.day.toUpperCase()}</span>
          </p>
          <DayCard dayData={nextWorkout} />
        </div>
      )}
    </div>
  )
}
