import { useState } from 'react'
import styles from './Welcome.module.css'

const FEATURES = [
  { icon: '⚡', text: 'Персонализиран хранителен план' },
  { icon: '✓',  text: 'Дневно проследяване на навиците' },
  { icon: '💪', text: 'Upper / Lower тренировъчен сплит' },
]

export default function Welcome({ onEnter }) {
  const [leaving, setLeaving] = useState(false)

  function handleEnter() {
    setLeaving(true)
    setTimeout(onEnter, 400)
  }

  return (
    <div className={`${styles.screen} ${leaving ? styles.leaving : ''}`}>
      <div className={styles.inner}>
        <div className={styles.logoWrap}>
          <span className={styles.logo}>BLAG</span>
          <span className={styles.logoSub}>COACHING</span>
        </div>

        <p className={styles.tagline}>Твоят персонален фитнес коуч</p>

        <ul className={styles.features} aria-label="Функции">
          {FEATURES.map(f => (
            <li key={f.text} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <button className={styles.cta} onClick={handleEnter}>
          ВЛЕЗ В ПРИЛОЖЕНИЕТО →
        </button>

        <p className={styles.hint}>Инсталирай като app: Сподели → Добави към началния екран</p>
      </div>
    </div>
  )
}
