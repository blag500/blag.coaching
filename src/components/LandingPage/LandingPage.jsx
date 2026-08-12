import styles from './LandingPage.module.css'

export default function LandingPage({ onContinue, onLogin }) {
  return (
    <div className={styles.page}>
      {/* The splash arms, held far back and drifting. Your own artwork, so
          there is no borrowed likeness in it — and a real physique behind the
          words does more for an old-school gym than any amount of gradient. */}
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={styles.logo}>
        <span className={styles.logoName}>BLAG</span>
      </div>

      <div className={styles.hero}>
        <h1 className={styles.headline}>ПОСТИГНИ<br />ЦЕЛТА СИ</h1>
        <p className={styles.sub}>Хранене · Тренировки · Прогрес</p>
      </div>

      <div className={styles.bottom}>
        <button className={styles.cta} onClick={onContinue} type="button">
          ВЛЕЗ В ПРИЛОЖЕНИЕТО
        </button>
        <p className={styles.note}>Безплатно завинаги. Без карта.</p>
        <button className={styles.loginLink} onClick={onLogin} type="button">
          Вече ползваш приложението? <span className={styles.loginLinkUnder}>Логни се тук.</span>
        </button>
      </div>
    </div>
  )
}
