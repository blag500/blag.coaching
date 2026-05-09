import styles from './HabitCheckbox.module.css'

export default function HabitCheckbox({ habit, checked, onToggle }) {
  return (
    <button
      className={`${styles.item} ${checked ? styles.checked : ''}`}
      onClick={() => onToggle(habit.id)}
      role="checkbox"
      aria-checked={checked}
      aria-label={habit.label}
    >
      <span className={styles.emoji} aria-hidden="true">{habit.emoji}</span>
      <span className={styles.label}>{habit.label}</span>
      <span className={styles.check} aria-hidden="true">
        {checked ? '✓' : '○'}
      </span>
    </button>
  )
}
