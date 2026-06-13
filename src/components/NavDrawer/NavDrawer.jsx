import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './NavDrawer.module.css'

const NutritionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const HabitsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const TrainingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="5" y1="9" x2="5" y2="15" />
    <line x1="19" y1="9" x2="19" y2="15" />
    <line x1="3" y1="10" x2="3" y2="14" />
    <line x1="21" y1="10" x2="21" y2="14" />
    <line x1="3" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
)
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)
const ClientsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
    <circle cx="17" cy="8" r="2.5" />
    <path d="M15 20c0-2.5 1.8-4 4-4" />
  </svg>
)
const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
)
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
  </svg>
)
const RecoveryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </svg>
)
const LearnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const CLIENT_TAB_DEFS = [
  { id: 'chat',       key: 'nav.chat',         Icon: ChatIcon      },
  { id: 'nutrition',  key: 'nav.nutrition',    Icon: NutritionIcon },
  { id: 'compliance', key: 'nav.habits',       Icon: HabitsIcon    },
  { id: 'training',   key: 'nav.training_long',Icon: TrainingIcon  },
  { id: 'recovery',   key: 'nav.recovery',     Icon: RecoveryIcon  },
  { id: 'calendar',   key: 'nav.schedule',     Icon: CalendarIcon  },
  { id: 'profile',    key: 'nav.profile',      Icon: ProfileIcon   },
  { id: 'explore',    key: 'nav.explore',      Icon: ExploreIcon   },
  { id: 'learn',      key: 'nav.learn',        Icon: LearnIcon     },
]

const MyDayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const COACH_TAB_DEFS = [
  { id: 'chat',       key: 'nav.chat',         Icon: ChatIcon      },
  { id: 'clients',    key: 'nav.clients',      Icon: ClientsIcon   },
  { id: 'coachday',   key: 'nav.myDay',        Icon: MyDayIcon     },
  { id: 'nutrition',  key: 'nav.nutrition',    Icon: NutritionIcon },
  { id: 'compliance', key: 'nav.habits',       Icon: HabitsIcon    },
  { id: 'training',   key: 'nav.training_long',Icon: TrainingIcon  },
  { id: 'recovery',   key: 'nav.recovery',     Icon: RecoveryIcon  },
  { id: 'calendar',   key: 'nav.schedule',     Icon: CalendarIcon  },
  { id: 'profile',    key: 'nav.profile',      Icon: ProfileIcon   },
  { id: 'explore',    key: 'nav.explore',      Icon: ExploreIcon   },
  { id: 'learn',      key: 'nav.learn',        Icon: LearnIcon     },
]

export default function NavDrawer({ open, onClose, activeTab, onTabChange, isCoach }) {
  const { profile } = useAuth()
  const { t } = useSettings()
  const tabDefs = isCoach ? COACH_TAB_DEFS : CLIENT_TAB_DEFS

  function handleNav(id) {
    onTabChange(id)
    onClose()
  }

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="navigation"
        aria-label="Меню"
      >
        <div className={styles.header}>
          <span className={styles.brand}>BLAG COACHING</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Затвори меню" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {profile && (
          <button className={styles.userSection} onClick={() => handleNav('profile')} type="button">
            <div className={styles.avatar}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} className={styles.avatarImg} alt="" />
                : (profile.name || '?')[0].toUpperCase()
              }
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{profile.name || profile.email}</span>
              <span className={styles.userRole}>
                {isCoach ? (t('nav.clients') === 'CLIENTS' ? 'COACH' : 'ТРЕНЬОР') : (profile.plan?.toUpperCase() ?? 'CLIENT')}
              </span>
            </div>
            <span className={styles.userArrow}>→</span>
          </button>
        )}

        <div className={styles.nav}>
          {tabDefs.map((tab, idx) => {
            const label = t(tab.key)
            return (
              <button
                key={tab.id}
                className={`${styles.item} ${activeTab === tab.id ? styles.itemActive : ''}`}
                onClick={() => handleNav(tab.id)}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                style={{ '--i': idx }}
              >
                <span className={styles.iconWrap}>
                  <tab.Icon />
                </span>
                <span className={styles.label}>{label}</span>
                {activeTab === tab.id && <span className={styles.activeDot} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
