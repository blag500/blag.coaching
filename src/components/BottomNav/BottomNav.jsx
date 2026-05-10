import styles from './BottomNav.module.css'

const TABS = [
  { id: 'nutrition',  label: 'NUTRITION',  icon: '⚡' },
  { id: 'food',       label: 'FOOD LOG',   icon: '🥗' },
  { id: 'compliance', label: 'HABITS',     icon: '✓'  },
  { id: 'training',   label: 'TRAINING',   icon: '💪' },
  { id: 'profile',    label: 'ПРОФИЛ',     icon: '👤' },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className={styles.nav} role="navigation" aria-label="Основна навигация">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          aria-label={tab.label}
        >
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.icon} aria-hidden="true">{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
