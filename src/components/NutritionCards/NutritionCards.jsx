import { useFoodLog } from '../../hooks/useFoodLog'
import NutritionProgress from './NutritionProgress'
import FoodSearch from '../FoodLogger/FoodSearch'
import FoodLog from '../FoodLogger/FoodLog'
import styles from './NutritionCards.module.css'

function getTargets() {
  try {
    const p = JSON.parse(localStorage.getItem('blag_profile_v1') || '{}')
    return {
      calories: p.calories || 2450,
      protein:  p.protein  || 180,
      carbs:    250,
      fat:      70,
    }
  } catch {
    return { calories: 2450, protein: 180, carbs: 250, fat: 70 }
  }
}

export default function NutritionCards() {
  const { log, totals, addEntry, removeEntry, clearLog } = useFoodLog()
  const targets = getTargets()

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
        totals={totals}
        onRemove={removeEntry}
        onClear={clearLog}
      />
    </div>
  )
}
