import { useRef } from 'react'
import styles from './WeightScroller.module.css'

/**
 * A Stronger-style vertical weight picker. Three rows visible — the pick sits
 * in the middle framed by a soft glass pill, the flanking rows show the next
 * step in each direction and are tappable to move by one.
 *
 * Drag is honoured too — a downward swipe decrements (the number above rolls
 * into place), an upward swipe increments. Small threshold, generous clamp,
 * no inertia — the goal is a picker that behaves, not a physics toy.
 */
export default function WeightScroller({ value, onChange, min = 30, max = 200 }) {
  const startY = useRef(null)
  const lastCommit = useRef(value)

  function clamp(v) { return Math.min(max, Math.max(min, v)) }
  function set(v) { onChange(clamp(v)) }

  function onTouchStart(e) {
    startY.current = e.touches[0].clientY
    lastCommit.current = value
  }
  function onTouchMove(e) {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    const stepPx = 44
    const steps = -Math.trunc(dy / stepPx) // finger up → increase
    const target = clamp(lastCommit.current + steps)
    if (target !== value) onChange(target)
  }
  function onTouchEnd() { startY.current = null }

  const prev = clamp(value - 1)
  const next = clamp(value + 1)

  return (
    <div
      className={styles.wrap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.frame} aria-hidden="true" />
      <button
        type="button"
        className={styles.side}
        onClick={() => set(value - 1)}
        aria-label="По-малко"
      >
        {prev} kg
      </button>
      <div className={styles.pick} role="spinbutton" aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}>
        {value} <span className={styles.unit}>kg</span>
      </div>
      <button
        type="button"
        className={styles.side}
        onClick={() => set(value + 1)}
        aria-label="Повече"
      >
        {next} kg
      </button>
    </div>
  )
}
