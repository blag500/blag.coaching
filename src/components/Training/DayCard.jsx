import styles from './DayCard.module.css'

const LABEL_COLORS = {
  UPPER:  '#C8F135',
  LOWER:  '#4FC3F7',
  CARDIO: '#FFB74D',
  REST:   '#2A2A3A',
}

const LABEL_TEXT_COLORS = {
  UPPER:  '#0A0A0F',
  LOWER:  '#0A0A0F',
  CARDIO: '#0A0A0F',
  REST:   '#8888AA',
}

export default function DayCard({ dayData }) {
  const { label, muscles, exercises } = dayData
  const isRest = label === 'REST'

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span
          className={styles.label}
          style={{
            background: LABEL_COLORS[label] || '#2A2A3A',
            color: LABEL_TEXT_COLORS[label] || '#8888AA',
          }}
        >
          {label}
        </span>
        {muscles.length > 0 && (
          <div className={styles.muscles}>
            {muscles.map(m => (
              <span key={m} className={styles.muscle}>{m}</span>
            ))}
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
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => (
              <tr key={i} className={styles.row}>
                <td className={styles.exName}>{ex.name}</td>
                <td className={styles.exSets}>{ex.sets}</td>
                <td className={styles.exReps}>{ex.reps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
