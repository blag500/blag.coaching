import { useState, useEffect, useRef } from 'react'
import styles from './HabitCheckbox.module.css'

export default function HabitCheckbox({ habit, checked, onToggle, index }) {
  const [justChecked, setJustChecked] = useState(false)
  const prevChecked = useRef(checked)

  useEffect(() => {
    if (checked && !prevChecked.current) {
      navigator.vibrate?.(10)
      setJustChecked(true)
      const t = setTimeout(() => setJustChecked(false), 450)
      return () => clearTimeout(t)
    }
    prevChecked.current = checked
  }, [checked])

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
      <span
        className={[
          styles.indicator,
          checked       ? styles.indicatorChecked : '',
          justChecked   ? styles.indicatorBounce  : '',
        ].join(' ')}
        aria-hidden="true"
      />
    </button>
  )
}
