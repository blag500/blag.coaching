import FlipCard from './FlipCard'
import { NUTRITION_CARDS } from '../../data/appData'
import styles from './NutritionCards.module.css'

export default function NutritionCards() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>NUTRITION</h1>
        <p className={styles.subtitle}>Натисни карта за детайли</p>
      </header>

      <div className={styles.grid}>
        {NUTRITION_CARDS.map(card => (
          <FlipCard key={card.id} card={card} />
        ))}
      </div>

      <div className={styles.note}>
        <span className={styles.noteIcon}>ℹ</span>
        Стойностите са персонализирани от треньора
      </div>
    </div>
  )
}
