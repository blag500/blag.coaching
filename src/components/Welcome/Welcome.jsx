import { useState } from 'react'
import styles from './Welcome.module.css'

const NutritionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const DumbbellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="5" y1="9" x2="5" y2="15" />
    <line x1="19" y1="9" x2="19" y2="15" />
    <line x1="3" y1="10" x2="3" y2="14" />
    <line x1="21" y1="10" x2="21" y2="14" />
    <line x1="3" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
)

const FEATURES = [
  { Icon: NutritionIcon, text: 'Персонализиран хранителен план' },
  { Icon: CheckIcon,     text: 'Дневно проследяване на навиците' },
  { Icon: DumbbellIcon,  text: 'Upper / Lower тренировъчен сплит' },
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
          <div className={styles.logoDivider} aria-hidden="true" />
          <span className={styles.logoSub}>COACHING</span>
        </div>

        <p className={styles.tagline}>Твоят персонален фитнес коуч</p>

        <ul className={styles.features} aria-label="Функции">
          {FEATURES.map((f, i) => (
            <li key={f.text} className={styles.feature} style={{ '--fi': i }}>
              <span className={styles.featureIcon}><f.Icon /></span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <button className={styles.cta} onClick={handleEnter}>
          ВЛЕЗ В ПРИЛОЖЕНИЕТО
        </button>

        <p className={styles.hint}>Инсталирай като app: Сподели → Добави към началния екран</p>
      </div>
    </div>
  )
}
