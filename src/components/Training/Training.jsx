import { useState } from 'react'
import { TRAINING_SPLIT, DAYS_BG_TO_EN } from '../../data/appData'
import DayCard from './DayCard'
import styles from './Training.module.css'

function getTodayBg() {
  const en = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  return DAYS_BG_TO_EN[en] || 'Понеделник'
}

export default function Training() {
  const todayBg = getTodayBg()
  const [selectedDay, setSelectedDay] = useState(todayBg)

  const dayData = TRAINING_SPLIT.find(d => d.day === selectedDay)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>TRAINING</h1>
        <p className={styles.subtitle}>Upper / Lower Split</p>
      </header>

      <div className={styles.pillBar} role="tablist" aria-label="Ден от седмицата">
        {TRAINING_SPLIT.map(d => (
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
    </div>
  )
}
