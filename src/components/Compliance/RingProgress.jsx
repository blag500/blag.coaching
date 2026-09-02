import { useState, useEffect, useRef } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
import styles from './RingProgress.module.css'
import { useSettings } from '../../contexts/SettingsContext'

const R = 50
const CIRCUMFERENCE = 2 * Math.PI * R

export default function RingProgress({ completed, total }) {
  const { t } = useSettings()
  const pct = total > 0 ? completed / total : 0
  const offset = CIRCUMFERENCE - pct * CIRCUMFERENCE
  const perfect = completed === total && total > 0

  const [animOffset, setAnimOffset] = useState(CIRCUMFERENCE)
  const mounted = useRef(false)

  /* Пръстенът се затваря за 900ms; числото в средата му вече беше на място.
     Сега тръгват заедно — при шест навика това са шест стъпки, които се
     броят, вместо една цифра, която се е сменила. */
  const shownDone = useCountUp(completed, { duration: 900 })

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      const raf = requestAnimationFrame(() => setAnimOffset(offset))
      return () => cancelAnimationFrame(raf)
    }
    setAnimOffset(offset)
  }, [offset])

  return (
    <div className={styles.wrap}>
      <div className={styles.ringWrap} style={perfect ? { filter: 'drop-shadow(0 0 16px rgba(var(--accent-rgb),0.35))' } : undefined}>
        <svg
          viewBox="0 0 120 120"
          className={styles.svg}
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={t('hab.ringAria', { done: completed, total })}
        >
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animOffset}
            transform="rotate(-90 60 60)"
            className={styles.fill}
          />
          <text x="60" y="56" textAnchor="middle" className={styles.scoreNum}>
            {shownDone}
          </text>
          <text x="60" y="72" textAnchor="middle" className={styles.scoreTotal}>
            /{total}
          </text>
        </svg>
      </div>

      <p className={styles.label}>{t('hab.today')}</p>

      {perfect && (
        <p className={styles.perfect}>{t('hab.perfect')}</p>
      )}
    </div>
  )
}
