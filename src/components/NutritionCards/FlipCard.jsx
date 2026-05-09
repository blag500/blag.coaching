import { useState } from 'react'
import styles from './FlipCard.module.css'

export default function FlipCard({ card }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={styles.scene}
      onClick={() => setFlipped(f => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
      aria-pressed={flipped}
      aria-label={`${card.front.label} — натисни за детайли`}
    >
      <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
        {/* Front */}
        <div className={`${styles.face} ${styles.front}`}>
          <span className={styles.frontLabel}>{card.front.label}</span>
          <span className={styles.frontValue} style={{ color: card.front.color }}>
            {card.front.value}
          </span>
          <span className={styles.frontUnit}>{card.front.unit}</span>
          <span className={styles.flipHint}>TAP ↺</span>
        </div>

        {/* Back */}
        <div className={`${styles.face} ${styles.back}`}>
          <span className={styles.backHeadline}>{card.back.headline}</span>
          <p className={styles.backBody}>{card.back.body}</p>
          <p className={styles.backSources}>{card.back.sources}</p>
          <span className={styles.backTip} style={{ color: card.front.color }}>
            {card.back.tip}
          </span>
        </div>
      </div>
    </div>
  )
}
