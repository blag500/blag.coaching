import { useAuth } from '../../contexts/AuthContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import NutritionProgress from './NutritionProgress'
import FoodSearch from '../FoodLogger/FoodSearch'
import FoodLog from '../FoodLogger/FoodLog'
import styles from './NutritionCards.module.css'

export default function NutritionCards() {
  const { profile } = useAuth()
  const { log, totals, addEntry, removeEntry, clearLog } = useFoodLog()

  const targets = {
    kcal:    profile?.calories ?? 2450,
    protein: profile?.protein  ?? 180,
    carbs:   profile?.carbs    ?? 250,
    fat:     profile?.fat      ?? 70,
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>NUTRITION</h1>
        <p className={styles.subtitle}>Дневен прием и хранителен лог</p>
      </header>

      <NutritionProgress totals={totals} targets={targets} />

      <FoodSearch onAdd={addEntry} />

      <FoodLog
        log={log}
        onRemove={removeEntry}
        onClear={clearLog}
      />
    </div>
  )
}
