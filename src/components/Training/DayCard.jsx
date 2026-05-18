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
  if (l === 'REST' || l.includes('ПОЧИВК')) return '#2A2A3A'
  return '#3A3A4A'
}

function labelFg(label) {
  const l = (label || '').toUpperCase()
  if (l === 'REST' || l.includes('ПОЧИВК')) return '#8888AA'
  return '#0A0A0F'
}

export default function DayCard({ dayData, onLogLift }) {
  const { profile } = useAuth()
  const { label, muscles = [], exercises = [], isRest: isRestFlag } = dayData
  const isRest = isRestFlag || (label || '').toUpperCase() === 'REST'
  const isCoach = profile?.role === 'coach'

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span
          className={styles.label}
          style={{ background: labelBg(label), color: labelFg(label) }}
        >
          {label}
        </span>
        {muscles.length > 0 && (
          <div className={styles.muscles}>
            {muscles.map(m => <span key={m} className={styles.muscle}>{m}</span>)}
          </div>
        )}
      </div>

      {isRest ? (
        <div className={styles.restMsg}>
          <span className={styles.restIcon}>🛌</span>
          <p>Почивка & Възстановяване</p>
          <p className={styles.restSub}>Сън, хидратация, мобилити</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thName}>Упражнение</th>
              <th className={styles.thSets}>Серии</th>
              <th className={styles.thReps}>Повторения</th>
              {!isCoach && <th className={styles.thAction}>—</th>}
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => (
              <tr key={i} className={styles.row}>
                <td className={styles.exName}>{ex.name}</td>
                <td className={styles.exSets}>{ex.sets}</td>
                <td className={styles.exReps}>{ex.reps}</td>
                {!isCoach && (
                  <td className={styles.exAction}>
                    <button
                      className={styles.logBtn}
                      onClick={() => onLogLift?.(ex)}
                      type="button"
                      title="Логирай тежест"
                    >
                      ⊕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
