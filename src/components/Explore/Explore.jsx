import { useState } from 'react'
import EfficientProducts from './EfficientProducts'
import ShoppingList from '../ShoppingList/ShoppingList'
import ShowcasePage from './ShowcasePage'
import CalorieCalculator from '../CalorieCalculator/CalorieCalculator'
import PWAInstallPage from '../PWAInstall/PWAInstallPage'
import styles from './Explore.module.css'

const SECTIONS = [
  {
    id: 'calculator',
    title: 'КАЛОРИЕН КАЛКУЛАТОР',
    desc: 'TDEE · BMR · ИТМ · Макроси — изчисли дневните си нужди',
    accent: '#FFB74D',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="10" y2="10" />
        <line x1="13" y1="10" x2="15" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" />
        <line x1="13" y1="14" x2="15" y2="14" />
        <line x1="8" y1="18" x2="15" y2="18" />
      </svg>
    ),
  },
  {
    id: 'install',
    title: 'СТАТУС',
    desc: 'Версия на приложението и известия за актуализации',
    accent: '#C9A227',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
        <path d="M12 2v13" />
        <path d="M8 11l4 4 4-4" />
        <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
  },
  {
    id: 'showcase',
    title: 'ВДЪХНОВЕНИЕ',
    desc: 'Тренировъчни програми и хранене от треньора',
    accent: '#FFB74D',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    id: 'products',
    title: 'ЕФЕКТИВНИ ПРОДУКТИ',
    desc: 'Най-добрите източници на протеин — цена, магазин, находки от общността',
    accent: '#C9A227',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: 'shopping',
    title: 'СПИСЪК ЗА ПАЗАРУВАНЕ',
    desc: 'Текущ списък с отметки и история на пазаруванията',
    accent: '#C9A227',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
]

const COMING_SOON = [
  { title: 'ПРЕДИЗВИКАТЕЛСТВА', desc: '30-дневни предизвикателства и програми' },
  { title: 'ВИДЕО ТЕХНИКИ', desc: 'Правилна техника за основните упражнения' },
]

export default function Explore() {
  const [page, setPage] = useState(null)

  if (page === 'calculator') return <CalorieCalculator onBack={() => setPage(null)} />
  if (page === 'install')    return <PWAInstallPage    onBack={() => setPage(null)} />
  if (page === 'showcase')   return <ShowcasePage      onBack={() => setPage(null)} />
  if (page === 'products')   return <EfficientProducts onBack={() => setPage(null)} />
  if (page === 'shopping')   return <ShoppingList      onBack={() => setPage(null)} />

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
