import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useWaterLog } from '../../hooks/useWaterLog'
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

const TodayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
    <line x1="8"  y1="15" x2="10" y2="15" />
    <line x1="12" y1="15" x2="14" y2="15" />
    <line x1="8"  y1="18" x2="10" y2="18" />
  </svg>
)

const LEFT_TABS  = [
  { id: 'today',     key: 'nav.today',    Icon: TodayIcon     },
  { id: 'nutrition', key: 'nav.nutrition', Icon: NutritionIcon },
]
const RIGHT_TABS = [
  { id: 'training', key: 'nav.training', Icon: TrainingIcon },
  { id: 'profile',  key: 'nav.profile',  Icon: ProfileIcon  },
]

const ACTIONS = [
  { id: 'food',     emoji: '🍽',  label: 'Ядене',      tab: 'nutrition' },
  { id: 'water',    emoji: '💧',  label: 'Вода +1',    tab: null        },
  { id: 'training', emoji: '💪',  label: 'Тренировка', tab: 'training'  },
]

export default function BottomNav({ activeTab, onTabChange, onMenuOpen }) {
  const { t } = useSettings()
  const { add: addWater } = useWaterLog()
  const [open, setOpen] = useState(false)
  const [waterFlash, setWaterFlash] = useState(false)

  useEffect(() => { setOpen(false) }, [activeTab])

  function handleAction(action) {
    setOpen(false)
    if (action.id === 'water') {
      addWater(1)
      setWaterFlash(true)
      navigator.vibrate?.(10)
      setTimeout(() => setWaterFlash(false), 600)
    } else {
      onTabChange(action.tab)
    }
  }

  return (
    <>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* ── Hamburger capsule — separate from nav pill ── */}
      <button
        className={styles.hamburger}
        onClick={onMenuOpen}
        type="button"
        aria-label="Странично меню"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" aria-hidden="true">
          <line x1="3" y1="6"  x2="21" y2="6"  />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* ── Main nav pill ── */}
      <nav className={styles.nav} role="navigation" aria-label="Основна навигация">
        {LEFT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-label={t(tab.key)}
            type="button"
          >
            <span className={styles.iconWrap}><tab.Icon /></span>
            <span className={styles.label}>{t(tab.key)}</span>
          </button>
        ))}

        {/* Center FAB */}
        <div className={styles.fabSlot}>
          {open && (
            <div className={styles.actionSheet}>
              {ACTIONS.map((action, i) => (
                <button
                  key={action.id}
                  className={`${styles.actionItem} ${action.id === 'water' && waterFlash ? styles.actionItemFlash : ''}`}
                  onClick={() => handleAction(action)}
                  type="button"
                  style={{ animationDelay: `${(ACTIONS.length - 1 - i) * 40}ms` }}
                >
                  <span className={styles.actionEmoji}>{action.emoji}</span>
                  <span className={styles.actionLabel}>{action.label}</span>
                </button>
              ))}
            </div>
          )}
          <button
            className={`${styles.fabCenter} ${open ? styles.fabOpen : ''}`}
            onClick={() => setOpen(o => !o)}
            type="button"
            aria-label="Бързо добави"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5"  y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {RIGHT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-label={t(tab.key)}
            type="button"
          >
            <span className={styles.iconWrap}><tab.Icon /></span>
            <span className={styles.label}>{t(tab.key)}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
