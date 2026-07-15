import styles from './LandingPage.module.css'

const FEATURES = [
  {
    icon: '🥗',
    title: 'Хранене',
    desc: 'Проследявай калории и макроси с бърз дневник',
  },
  {
    icon: '💪',
    title: 'Тренировки',
    desc: 'Записвай обеми и следи прогреса си',
  },
  {
    icon: '📊',
    title: 'Анализи',
    desc: 'Виж тенденциите с графики и седмични отчети',
  },
  {
    icon: '🎯',
    title: 'Цели',
    desc: 'Изчисли TDEE и настрой макросите за твоята цел',
  },
]

export default function LandingPage({ onContinue }) {
  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.glow} />
      </div>

      <div className={styles.inner}>
        <header className={styles.brand}>
          <span className={styles.brandName}>BLAG</span>
          <div className={styles.brandRule} aria-hidden="true" />
          <span className={styles.brandSub}>COACHING</span>
        </header>

        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            ЛИЧЕН ТРЕНЬОР<br />В ДЖОБА ТИ
          </h1>
          <p className={styles.heroSub}>
            Хранене · Тренировки · Прогрес — всичко на едно място
          </p>
        </section>

        <ul className={styles.features} role="list">
          {FEATURES.map(f => (
            <li key={f.title} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">{f.icon}</span>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>{f.title}</span>
                <span className={styles.featureDesc}>{f.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.cta}>
          <button className={styles.ctaBtn} onClick={onContinue} type="button">
            ЗАПОЧНИ БЕЗПЛАТНО
          </button>
          <p className={styles.ctaNote}>Без кредитна карта · Отнема 2 минути</p>
        </div>
      </div>
    </div>
  )
}
