import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './DayCard.module.css'

function labelBg(label) {
  const l = (label || '').toUpperCase()
  if (l.startsWith('UPPER')) return l.endsWith('B') ? '#ff8a65' : '#ffb74d'
  if (l.startsWith('LOWER')) return l.endsWith('B') ? '#81C784' : '#4FC3F7'
  if (l.startsWith('PUSH'))  return '#ffb74d'
  if (l.startsWith('PULL'))  return '#4FC3F7'
  if (l.startsWith('LEG'))   return '#81C784'
  if (l.startsWith('CARDIO') || l.includes('КАРДИО')) return '#CE93D8'
  if (l === 'REST' || l.includes('ПОЧИВК')) return 'transparent'
  return '#3A3A4A'
}

function labelFg(label) {
  const l = (label || '').toUpperCase()
  if (l === 'REST' || l.includes('ПОЧИВК')) return 'var(--muted)'
  return '#0A0A0F'
}

export default function DayCard({ dayData, onLogLift }) {
  const { profile } = useAuth()
  const { label, muscles = [], exercises = [], isRest: isRestFlag } = dayData
  const isRest  = isRestFlag || (label || '').toUpperCase() === 'REST'
  const isCoach = profile?.role === 'coach'
  const [open, setOpen] = useState(true)

  return (
    <div className={styles.card}>
      {/* Header — tap to collapse */}
      <button
        type="button"
        className={styles.cardHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span
          className={styles.blockLabel}
          style={{ background: labelBg(label), color: labelFg(label) }}
        >
          {label}
        </span>
        {muscles.length > 0 && (
          <div className={styles.muscles}>
            {muscles.map(m => <span key={m} className={styles.muscle}>{m}</span>)}
          </div>
        )}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
      </button>

      {/* Body — animated collapse */}
      <div className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
        <div className={styles.bodyInner}>
          {isRest ? (
            <div className={styles.restMsg}>
              <span className={styles.restIcon}>🛌</span>
              <p className={styles.restTitle}>Почивка</p>
              <p className={styles.restSub}>Сън · Хидратация · Мобилити</p>
            </div>
          ) : (
            <ul className={styles.exList}>
              {exercises.map((ex, i) => (
                <li key={i} className={styles.exRow}>
                  <span className={styles.exName}>{ex.name}</span>
                  <div className={styles.exRight}>
                    <span className={styles.exBadge}>{ex.sets} × {ex.reps}</span>
                    {!isCoach && (
                      <button
                        className={styles.logBtn}
                        onClick={e => { e.stopPropagation(); onLogLift?.(ex) }}
                        type="button"
                        aria-label={`Логирай ${ex.name}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
