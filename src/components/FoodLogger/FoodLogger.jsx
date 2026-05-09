import { useFoodLog } from '../../hooks/useFoodLog'
import FoodSearch from './FoodSearch'
import FoodLog from './FoodLog'
import styles from './FoodLogger.module.css'

export default function FoodLogger() {
  const { log, totals, addEntry, removeEntry, clearLog } = useFoodLog()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>FOOD LOG</h1>
        <p className={styles.subtitle}>Търси с Open Food Facts</p>
      </header>

      <FoodSearch onAdd={addEntry} />
      <FoodLog
        log={log}
        totals={totals}
        onRemove={removeEntry}
        onClear={clearLog}
      />
    </div>
  )
}
