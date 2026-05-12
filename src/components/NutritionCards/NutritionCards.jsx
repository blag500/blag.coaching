import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import NutritionProgress from './NutritionProgress'
import FoodSearch from '../FoodLogger/FoodSearch'
import FoodLog from '../FoodLogger/FoodLog'
import MealCards from '../MealCards/MealCards'
import styles from './NutritionCards.module.css'

export default function NutritionCards() {
  const { profile } = useAuth()
  const { log, totals, addEntry, removeEntry, clearLog } = useFoodLog()
  const [view, setView] = useState('log')

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
        <p className={styles.subtitle}>Дневен прием и рецепти</p>
      </header>

      {/* Internal tab toggle */}
      <div className={styles.toggle}>
        <button
          className={`${styles.toggleBtn} ${view === 'log' ? styles.toggleActive : ''}`}
          onClick={() => setView('log')}
          type="button"
        >
          ПРИЕМ ДНЕС
        </button>
        <button
          className={`${styles.toggleBtn} ${view === 'meals' ? styles.toggleActive : ''}`}
          onClick={() => setView('meals')}
          type="button"
        >
          РЕЦЕПТИ
        </button>
      </div>

      {view === 'log' ? (
        <>
          <NutritionProgress totals={totals} targets={targets} />
          <FoodSearch onAdd={addEntry} />
          <FoodLog log={log} onRemove={removeEntry} onClear={clearLog} />
        </>
      ) : (
        <MealCards />
      )}
    </div>
  )
}
