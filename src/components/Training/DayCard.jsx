import { useAuth } from '../../contexts/AuthContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import styles from './DayCard.module.css'

function labelBg(label) {
  const l = (label || '').toUpperCase()
  if (l.startsWith('UPPER')) return l.endsWith('B') ? '#ff8a65' : 'var(--accent)'
  if (l.startsWith('LOWER')) return l.endsWith('B') ? '#81C784' : '#4FC3F7'
  if (l.startsWith('PUSH'))  return 'var(--accent)'
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

/** "преди 5 дни", or the date once it stops being recent enough to count in days. */
function agoLabel(dateStr) {
  const days = Math.round((Date.now() - new Date(dateStr + 'T12:00:00')) / 86400000)
  if (days <= 0)  return 'днес'
  if (days === 1) return 'вчера'
  if (days < 14)  return `преди ${days} дни`
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
}

export default function DayCard({ dayData, onLogLift, lifts = {} }) {
  const { profile } = useAuth()
  const { label, muscles = [], exercises = [], isRest: isRestFlag } = dayData
  const isRest  = isRestFlag || (label || '').toUpperCase() === 'REST'
  const isCoach = profile?.role === 'coach'
  // Persist collapsed/expanded state across navigation & remounts
  const [open, setOpen] = useLocalStorage('blag_exlist_open', true)

  return (
    <div className={styles.card}>
      {/* Header — tap to collapse */}
      <button
        type="button"
        className={styles.cardHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {/* The block's name is on the selected pill directly above this, in the
            same colour. Printing it twice in two different shapes was half the
            reason the screen read as a form. */}
        <span className={styles.blockDot} style={{ background: labelBg(label) }} />
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
              {exercises.map((ex, i) => {
                const rec   = lifts[ex.name] ?? {}
                const done  = rec.today
                const last  = rec.last
                return (
                  <li key={i} className={`${styles.exRow} ${done ? styles.exRowDone : ''}`}>
                    <div className={styles.exMain}>
                      <span className={styles.exName}>{ex.name}</span>
                      {/* What you actually moved, which is the line a lifter
                          reads. The prescription is the quiet one. */}
                      {done ? (
                        <span className={styles.exDone}>
                          ✓ {done.weight}кг × {done.reps}
                          {done.sets ? ` × ${done.sets}` : ''}
                        </span>
                      ) : last ? (
                        <span className={styles.exLast}>
                          {last.weight}кг × {last.reps} · {agoLabel(last.date)}
                        </span>
                      ) : (
                        <span className={styles.exNever}>първи път</span>
                      )}
                    </div>
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
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
