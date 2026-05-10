import styles from './RingProgress.module.css'

const R = 50
const CIRCUMFERENCE = 2 * Math.PI * R

export default function RingProgress({ completed, total }) {
  const pct = total > 0 ? completed / total : 0
  const offset = CIRCUMFERENCE - pct * CIRCUMFERENCE
  const perfect = completed === total && total > 0

  return (
    <div className={styles.wrap}>
      <div className={styles.ringWrap} style={perfect ? { filter: 'drop-shadow(0 0 16px rgba(200,241,53,0.35))' } : undefined}>
        <svg
          viewBox="0 0 120 120"
          className={styles.svg}
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${completed} от ${total} навика`}
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
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            className={styles.fill}
          />
          <text x="60" y="56" textAnchor="middle" className={styles.scoreNum}>
            {completed}
          </text>
          <text x="60" y="72" textAnchor="middle" className={styles.scoreTotal}>
            /{total}
          </text>
        </svg>
      </div>

      <p className={styles.label}>НАВИЦИ ДНЕС</p>

      {perfect && (
        <p className={styles.perfect}>🏆 ПЕРФЕКТЕН ДЕН!</p>
      )}
    </div>
  )
}
