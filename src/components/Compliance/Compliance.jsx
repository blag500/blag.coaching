import { useHabitsToday } from '../../hooks/useHabitsToday'
import HabitCheckbox from './HabitCheckbox'
import RingProgress from './RingProgress'
import StreakBar from './StreakBar'
import HabitCalendar from './HabitCalendar'
import SupplementSection from './SupplementSection'
import styles from './Compliance.module.css'

export default function Compliance() {
  const { habits, checked, toggle } = useHabitsToday()

  const completedCount = habits.filter(h => checked[h.id]).length
  const today = new Date().toLocaleDateString('bg-BG', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className={styles.page}>
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

      <StreakBar />
      <HabitCalendar />
      <SupplementSection />
    </div>
  )
}
