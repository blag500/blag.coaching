import styles from './HabitCheckbox.module.css'

export default function HabitCheckbox({ habit, checked, onToggle, index }) {
  return (
    <button
      className={`${styles.item} ${checked ? styles.checked : ''}`}
      onClick={() => onToggle(habit.id)}
      role="checkbox"
      aria-checked={checked}
      aria-label={habit.label}
      style={{ '--i': index }}
    >
      <span className={styles.emoji} aria-hidden="true">{habit.emoji}</span>
      <span className={styles.label}>{habit.label}</span>
      <span className={`${styles.indicator} ${checked ? styles.indicatorChecked : ''}`} aria-hidden="true" />
    </button>
  )
}
