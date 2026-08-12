import { useMemo } from 'react'
import styles from './Confetti.module.css'

// The app's own palette — the accent plus the three macro colours. Generic
// party colours would look like they came from somewhere else.
const COLORS = ['var(--accent)', '#42A5F5', '#66BB6A', '#CE93D8', '#F2E8CF']
const PIECES = 22

/**
 * A one-shot burst. No library and no canvas: a couple of dozen small elements
 * moving on transform and opacity, which the compositor handles on its own
 * without touching layout.
 *
 * `burst` is a changing key — each new value builds a fresh set of angles, so
 * two celebrations never scatter identically.
 */
export default function Confetti({ burst }) {
  const pieces = useMemo(() => Array.from({ length: PIECES }, (_, i) => {
    // Spread around a circle with a little jitter, so it reads as a burst
    // rather than as a wheel with evenly spaced spokes.
    const angle = (i / PIECES) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const dist  = 64 + Math.random() * 86
    return {
      id: `${burst}-${i}`,
      dx:    `${Math.cos(angle) * dist}px`,
      // Biased downward at the end so the pieces fall rather than hang.
      dy:    `${Math.sin(angle) * dist * 0.7 + 46}px`,
      rot:   `${(Math.random() - 0.5) * 540}deg`,
      delay: `${Math.random() * 90}ms`,
      color: COLORS[i % COLORS.length],
      size:  2.5 + Math.random() * 2.5,
    }
  }), [burst])

  return (
    <div className={styles.burst} aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className={styles.piece}
          style={{
            '--dx': p.dx,
            '--dy': p.dy,
            '--rot': p.rot,
            animationDelay: p.delay,
            background: p.color,
            width: `${p.size * 2.4}px`,
            height: `${p.size}px`,
          }}
        />
      ))}
    </div>
  )
}
