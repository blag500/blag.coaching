import FlipCard from './FlipCard'
import { NUTRITION_CARDS } from '../../data/appData'
import styles from './NutritionCards.module.css'

function getProfile() {
  try {
    const raw = localStorage.getItem('blag_profile_v1')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function applyProfile(cards) {
  const profile = getProfile()
  if (!profile) return cards
  return cards.map(card => {
    if (card.id === 'protein' && profile.protein) {
      return { ...card, front: { ...card.front, value: `${profile.protein}g` } }
    }
    if (card.id === 'calories' && profile.calories) {
      return { ...card, front: { ...card.front, value: String(profile.calories) } }
    }
    return card
  })
}

export default function NutritionCards() {
  const cards = applyProfile(NUTRITION_CARDS)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>NUTRITION</h1>
        <p className={styles.subtitle}>Натисни карта за детайли</p>
      </header>

      <div className={styles.grid}>
        {cards.map(card => (
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
