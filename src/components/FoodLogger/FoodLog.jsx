import styles from './FoodLog.module.css'

const MACRO_COLORS = {
  kcal:    '#F06292',
  protein: '#C8F135',
  carbs:   '#4FC3F7',
  fat:     '#FFB74D',
}

export default function FoodLog({ log, totals, onRemove, onClear }) {
  if (log.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🍽</span>
        <p>Няма добавени храни днес</p>
        <p className={styles.emptyHint}>Търси и добави храна по-горе</p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.totalsBar}>
        {[
          { key: 'kcal',    label: 'ККАЛ',     value: totals.kcal,    unit: '' },
          { key: 'protein', label: 'ПРОТЕИН',  value: totals.protein, unit: 'g' },
          { key: 'carbs',   label: 'ВЪГЛ',     value: totals.carbs,   unit: 'g' },
          { key: 'fat',     label: 'МАЗН',     value: totals.fat,     unit: 'g' },
        ].map(m => (
          <div key={m.key} className={styles.totalItem}>
            <span className={styles.totalValue} style={{ color: MACRO_COLORS[m.key] }}>
              {m.value}{m.unit}
            </span>
            <span className={styles.totalLabel}>{m.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.listHeader}>
        <span className={styles.listTitle}>Дневен лог ({log.length})</span>
        <button className={styles.clearBtn} onClick={onClear}>Изчисти</button>
      </div>

      <ul className={styles.list}>
        {log.map((entry, i) => (
          <li key={entry.id} className={styles.entry} style={{ '--i': i }}>
            <div className={styles.entryLeft}>
              <span className={styles.entryName}>{entry.name}</span>
              <span className={styles.entryMacros}>
                {entry.kcal} ккал · П{entry.protein}g · В{entry.carbs}g · М{entry.fat}g
              </span>
            </div>
            <div className={styles.entryRight}>
              <span className={styles.entryGrams}>{entry.grams}g</span>
              <button
                className={styles.removeBtn}
                onClick={() => onRemove(entry.id)}
                aria-label={`Премахни ${entry.name}`}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
