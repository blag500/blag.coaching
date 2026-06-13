import { useState, useEffect, useRef } from 'react'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import { useHabitHistory } from '../../hooks/useHabitHistory'
import HabitCheckbox from './HabitCheckbox'
import RingProgress from './RingProgress'
import StreakBar from './StreakBar'
import HabitCalendar from './HabitCalendar'
import SupplementSection from './SupplementSection'
import StreakCelebration from './StreakCelebration'
import WaterTracker from './WaterTracker'
import styles from './Compliance.module.css'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function calcCelebStreak(history) {
  let streak = 1 // today just completed
  const today = new Date()
  for (let i = 1; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const entry = history.get(iso)
    if (entry && entry.completed === entry.total) streak++
    else break
  }
  return streak
}

export default function Compliance() {
  const { habits, checked, toggle } = useHabitsToday()
  const history = useHabitHistory()
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebStreak, setCelebStreak] = useState(1)
  const celebratedRef = useRef(false)

  const completedCount = habits.filter(h => checked[h.id]).length
  const allDone = habits.length > 0 && completedCount === habits.length

  useEffect(() => {
    if (!allDone) return
    const key = `blag_celeb_${todayKey()}`
    if (celebratedRef.current || localStorage.getItem(key)) return
    celebratedRef.current = true
    localStorage.setItem(key, '1')
    setCelebStreak(calcCelebStreak(history))
    setShowCelebration(true)
  }, [allDone, history])

  const today = new Date().toLocaleDateString('bg-BG', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className={styles.page}>
      {showCelebration && (
        <StreakCelebration streak={celebStreak} onDone={() => setShowCelebration(false)} />
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>HABITS</h1>
        <p className={styles.date}>{today}</p>
      </header>

      <RingProgress completed={completedCount} total={habits.length} />

      <div className={styles.list}>
        {habits.map((habit, i) => (
          <HabitCheckbox
            key={habit.id}
            habit={habit}
            checked={!!checked[habit.id]}
            onToggle={toggle}
            index={i}
          />
        ))}
      </div>

      <WaterTracker />
      <StreakBar />
      <HabitCalendar />
      <SupplementSection />
    </div>
  )
}
