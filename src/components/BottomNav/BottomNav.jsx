import { useState, useEffect, useRef } from 'react'
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

const HIDDEN_KEY = 'blag_nav_hidden'

export default function BottomNav({ activeTab, onTabChange }) {
  const { t } = useSettings()
  const { add: addWater } = useWaterLog()
  const [open, setOpen] = useState(false)
  const [waterFlash, setWaterFlash] = useState(false)
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN_KEY) === '1')

  useEffect(() => { setOpen(false) }, [activeTab])

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0')
  }, [hidden])

  // Live swipe. The bar follows the finger to the right while the user drags
  // and fades as it goes; released past the halfway mark it docks, otherwise
  // it springs back. Vertical dominance cancels the gesture, so a scroll never
  // steals the nav.
  const navRef = useRef(null)
  const dragRef = useRef({ x: 0, y: 0, dx: 0, active: false, cancelled: false })

  function onTouchStart(e) {
    const t = e.touches[0]
    dragRef.current = { x: t.clientX, y: t.clientY, dx: 0, active: true, cancelled: false }
    if (navRef.current) navRef.current.style.transition = 'none'
  }

  function onTouchMove(e) {
    const d = dragRef.current
    if (!d.active || d.cancelled) return
    const t = e.touches[0]
    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
      d.cancelled = true
      if (navRef.current) {
        navRef.current.style.transition = ''
        navRef.current.style.transform = ''
        navRef.current.style.opacity = ''
      }
      return
    }
    if (dx > 0 && navRef.current) {
      d.dx = dx
      navRef.current.style.transform = `translateX(${dx}px)`
      navRef.current.style.opacity = String(Math.max(0.35, 1 - dx / 260))
    }
  }

  function onTouchEnd() {
    const d = dragRef.current
    if (!d.active) return
    d.active = false
    if (navRef.current) {
      navRef.current.style.transition = ''
      navRef.current.style.transform = ''
      navRef.current.style.opacity = ''
    }
    if (!d.cancelled && d.dx > 90) {
      setOpen(false)
      setHidden(true)
    }
  }

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

      {/* Docked peek — the way back when the bar is hidden */}
      <button
        className={`${styles.peek} ${hidden ? styles.peekOn : ''}`}
        onClick={() => setHidden(false)}
        aria-label="Покажи навигацията"
        type="button"
        tabIndex={hidden ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 6 9 12 15 18" />
        </svg>
      </button>

      {/* ── Main nav pill ── */}
      <nav
        ref={navRef}
        className={`${styles.nav} ${hidden ? styles.navHidden : ''}`}
        role="navigation"
        aria-label="Основна навигация"
        aria-hidden={hidden}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" aria-hidden="true">
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

        {/* Small dock handle — tap or swipe right to hide the bar */}
        <button
          className={styles.dockHandle}
          onClick={() => setHidden(true)}
          type="button"
          aria-label="Скрий навигацията"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </nav>
    </>
  )
}
