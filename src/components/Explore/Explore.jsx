import { useState } from 'react'
import EfficientProducts from './EfficientProducts'
import styles from './Explore.module.css'

const SECTIONS = [
  {
    id: 'products',
    title: 'ЕФЕКТИВНИ ПРОДУКТИ',
    desc: 'Най-добрите източници на протеин — цена, макроси, магазин',
    accent: '#C9A227',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
]

const COMING_SOON = [
  { title: 'ПРЕДИЗВИКАТЕЛСТВА', desc: '30-дневни предизвикателства и програми' },
  { title: 'СПИСЪК ЗА ПАЗАРУВАНЕ', desc: 'Седмичен хранителен план + пазарен списък' },
  { title: 'ВИДЕО ТЕХНИКИ', desc: 'Правилна техника за основните упражнения' },
]

export default function Explore() {
  const [page, setPage] = useState(null)

  if (page === 'products') {
    return <EfficientProducts onBack={() => setPage(null)} />
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ОТКРИЙ</h1>
        <p className={styles.subtitle}>Ресурси, продукти и програми</p>
      </header>

      <div className={styles.grid}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={styles.sectionCard}
            onClick={() => setPage(s.id)}
            type="button"
          >
            <div className={styles.cardIcon} style={{ color: s.accent }}>{s.icon}</div>
            <div className={styles.cardText}>
              <span className={styles.cardTitle}>{s.title}</span>
              <span className={styles.cardDesc}>{s.desc}</span>
            </div>
            <span className={styles.cardArrow}>›</span>
          </button>
        ))}

        {COMING_SOON.map(s => (
          <div key={s.title} className={`${styles.sectionCard} ${styles.sectionCardSoon}`}>
            <div className={styles.cardIcon} style={{ color: 'var(--muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={styles.cardText}>
              <span className={styles.cardTitle} style={{ color: 'var(--muted)' }}>{s.title}</span>
              <span className={styles.cardDesc}>{s.desc}</span>
            </div>
            <span className={styles.soonBadge}>скоро</span>
          </div>
        ))}
      </div>
    </div>
  )
}
