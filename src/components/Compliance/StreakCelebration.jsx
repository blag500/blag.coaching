import { useEffect, useRef } from 'react'
import styles from './StreakCelebration.module.css'

const COLORS = ['#ffb74d', '#ffd54f', '#fff9c4', '#ffe082', '#fff176', '#ffcc02']

function makeConfetti(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    duration: `${1.4 + Math.random() * 1.2}s`,
    color: COLORS[i % COLORS.length],
    size: `${6 + Math.floor(Math.random() * 6)}px`,
    rotate: `${Math.random() * 720 - 360}deg`,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }))
}

const PIECES = makeConfetti(40)

export default function StreakCelebration({ streak, onDone }) {
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDone, 3800)
    return () => clearTimeout(timerRef.current)
  }, [onDone])

  return (
    <div className={styles.overlay} onClick={onDone} role="dialog" aria-modal="true" aria-label="Streak celebration">
      <div className={styles.confettiWrap} aria-hidden="true">
        {PIECES.map(p => (
          <span
            key={p.id}
            className={styles.piece}
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              '--rotate': p.rotate,
            }}
          />
        ))}
      </div>

      <div className={styles.card}>
        <span className={styles.fire}>🔥</span>
        <p className={styles.streakNum}>{streak}</p>
        <p className={styles.streakLabel}>ПОРЕДНИ ДНИ</p>
        <p className={styles.sub}>Всички навици изпълнени!</p>
      </div>
    </div>
  )
}
