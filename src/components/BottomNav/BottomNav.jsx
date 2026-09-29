import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './BottomNav.module.css'

const NutritionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const TrainingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="5" y1="9"  x2="5"  y2="15" />
    <line x1="19" y1="9" x2="19" y2="15" />
    <line x1="3" y1="10" x2="3"  y2="14" />
    <line x1="21" y1="10" x2="21" y2="14" />
    <line x1="3" y1="12" x2="5"  y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
)

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

/* Две глави, не календар: мястото вече не е ден, а зала. */
const FeedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17.5" cy="9.5" r="2.2" />
    <path d="M15.6 20c0-2.6 1.7-4.2 3.9-4.2 1 0 1.9.3 2.5.9" />
  </svg>
)

const LEFT_TABS  = [
  { id: 'feed',      key: 'nav.feed',      Icon: FeedIcon      },
  { id: 'nutrition', key: 'nav.nutrition', Icon: NutritionIcon },
]
const RIGHT_TABS = [
  { id: 'training', key: 'nav.training', Icon: TrainingIcon },
  { id: 'profile',  key: 'nav.profile',  Icon: ProfileIcon  },
]


/* Четири точки — за страница, която не е в лентата (чат, награди…): там
   сгънатото кръгче няма чий знак да носи. */
const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="8" r="1.6" /><circle cx="16" cy="8" r="1.6" />
    <circle cx="8" cy="16" r="1.6" /><circle cx="16" cy="16" r="1.6" />
  </svg>
)

const ALL_TABS = [...LEFT_TABS, ...RIGHT_TABS]

/**
 * Долната лента.
 *
 * Докато се чете надолу, тя се сгъва в малко кръгче долу вляво — носи знака
 * на отворения раздел, за да личи къде си. Разгъва се при най-малкото
 * превъртане нагоре или при натискане на кръгчето. Кога е сгъната решава
 * useHideOnScroll (атрибутът `data-nav` на <html>), не състояние тук: иначе
 * всяко превъртане би рисувало лентата наново.
 */
export default function BottomNav({ activeTab, onTabChange }) {
  const { t } = useSettings()
  const current = ALL_TABS.find(tab => tab.id === activeTab)
  const FoldIcon = current?.Icon ?? MoreIcon

  function unfold() {
    haptic('tap')
    delete document.documentElement.dataset.nav
  }

  return (
    <>
      {/* Сгънатата лента */}
      <button
        className={styles.fold}
        onClick={unfold}
        aria-label={t('nav.showNav')}
        type="button"
      >
        <FoldIcon />
      </button>

      {/* ── Main nav pill ── */}
      <nav
        className={styles.nav}
        role="navigation"
        aria-label={t('nav.mainNav')}
      >
        {LEFT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => { haptic('nav'); onTabChange(tab.id) }}
            aria-label={t(tab.key)}
            /* Кой раздел е отворен, казано и с думи. Дотук го казваше само
               овалът отдолу — тоест на човек, който гледа. */
            aria-current={activeTab === tab.id ? 'page' : undefined}
            type="button"
          >
            <span className={styles.iconWrap}><tab.Icon /></span>
            <span className={styles.label}><span>{t(tab.key)}</span></span>
          </button>
        ))}

        {RIGHT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => { haptic('nav'); onTabChange(tab.id) }}
            aria-label={t(tab.key)}
            /* Кой раздел е отворен, казано и с думи. Дотук го казваше само
               овалът отдолу — тоест на човек, който гледа. */
            aria-current={activeTab === tab.id ? 'page' : undefined}
            type="button"
          >
            <span className={styles.iconWrap}><tab.Icon /></span>
            <span className={styles.label}><span>{t(tab.key)}</span></span>
          </button>
        ))}

      </nav>
    </>
  )
}
