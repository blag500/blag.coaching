import { useLocalStorage } from '../../hooks/useLocalStorage'
import { HABITS } from '../../data/appData'
import HabitCheckbox from './HabitCheckbox'
import RingProgress from './RingProgress'
import SOSButton from './SOSButton'
import HabitCalendar from './HabitCalendar'
import styles from './Compliance.module.css'

function getTodayKey() {
  return `blag_habits_${new Date().toISOString().slice(0, 10)}`
}

export default function Compliance() {
  const [checked, setChecked] = useLocalStorage(getTodayKey(), {})

  function toggle(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const completedCount = HABITS.filter(h => checked[h.id]).length
  const today = new Date().toLocaleDateString('bg-BG', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>HABITS</h1>
        <p className={styles.date}>{today}</p>
      </header>

      <RingProgress completed={completedCount} total={HABITS.length} />

      <div className={styles.list}>
        {HABITS.map((habit, i) => (
          <HabitCheckbox
            key={habit.id}
            habit={habit}
            checked={!!checked[habit.id]}
            onToggle={toggle}
            index={i}
          />
        ))}
      </div>

      <SOSButton />
      <HabitCalendar />
    </div>
  )
}
