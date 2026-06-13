import { useEffect, useState } from 'react'
import styles from './BadgePopup.module.css'

const DEFS = {
  calories: { emoji: '🥗', label: 'КАЛОРИИ',       sub: 'Дневната калорийна цел е постигната!' },
  habits:   { emoji: '✅', label: 'НАВИЦИ',         sub: 'Всички навици за днес са изпълнени!' },
  training: { emoji: '💪', label: 'ТРЕНИРОВКА',     sub: 'Тренировката е отчетена за днес!' },
  perfect:  { emoji: '⭐', label: 'ПЕРФЕКТЕН ДЕН',  sub: 'Постигна всички цели за деня!' },
}

export default function BadgePopup({ badge, onDone }) {
  const [phase, setPhase] = useState('in')
  const def = DEFS[badge]

  useEffect(() => {
    const hide = setTimeout(() => setPhase('out'), 2600)
    const done = setTimeout(onDone, 3000)
    return () => { clearTimeout(hide); clearTimeout(done) }
  }, [])

  if (!def) return null
  return (
    <div className={`${styles.wrap} ${phase === 'out' ? styles.out : styles.in}`}>
      <div className={styles.popup}>
        <span className={styles.emoji}>{def.emoji}</span>
        <div className={styles.text}>
          <span className={styles.label}>{def.label}</span>
          <span className={styles.sub}>{def.sub}</span>
        </div>
      </div>
    </div>
  )
}
