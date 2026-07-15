import styles from './LandingPage.module.css'

export default function LandingPage({ onContinue }) {
  return (
    <div className={styles.page}>
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={styles.logo}>
        <span className={styles.logoName}>BLAG</span>
        <div className={styles.logoRule} aria-hidden="true" />
        <span className={styles.logoSub}>COACHING</span>
      </div>

      <div className={styles.hero}>
        <h1 className={styles.headline}>ПОСТИГНИ<br />ЦЕЛТА СИ</h1>
        <p className={styles.sub}>Хранене · Тренировки · Прогрес</p>
      </div>

      <div className={styles.bottom}>
        <button className={styles.cta} onClick={onContinue} type="button">
          ЗАПОЧНИ БЕЗПЛАТНО
        </button>
        <p className={styles.note}>Започни сега. Плати после.</p>
      </div>
    </div>
  )
}
