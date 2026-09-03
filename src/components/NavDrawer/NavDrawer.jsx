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
const FeedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17.5" cy="9.5" r="2.2" />
    <path d="M15.6 20c0-2.6 1.7-4.2 3.9-4.2 1 0 1.9.3 2.5.9" />
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
const BudgetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
    <line x1="7" y1="15" x2="9" y2="15"/>
  </svg>
)
const TasksIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)
const MyDayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
    <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
    <path d="M6 3h12v8a6 6 0 0 1-12 0V3z" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
  </svg>
)
const PosingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="4" r="2" />
    <path d="M8 10h8" />
    <path d="M10 10v4l-2 6" />
    <path d="M14 10v4l2 6" />
    <path d="M10 14h4" />
  </svg>
)
const ShopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)
const OrdersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
)
// A medal, not a second trophy: the trophy already means the competition
// protocol, and two cups in one drawer would send people to the wrong page.
const MedalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2l2 6" />
    <path d="M16 2l-2 6" />
    <circle cx="12" cy="15" r="6" />
    <path d="M12 12.4l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" />
  </svg>
)
const SupplementIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 3L3 9a6 6 0 0 0 8.49 8.49L20 9a6 6 0 0 0-8.49-8.49z" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
)

// ── Section definitions ───────────────────────────────────────────
const CLIENT_SECTIONS = [
  {
    labelKey: 'drawer.section.tracking',
    tabs: [
      { id: 'nutrition',  key: 'nav.nutrition',     Icon: NutritionIcon },
      { id: 'compliance', key: 'nav.habits',        Icon: HabitsIcon    },
      { id: 'training',   key: 'nav.training_long', Icon: TrainingIcon  },
      // Заготовките стоят до тренировката, защото се пълнят оттам и се
      // ползват там — не са ресурс, а част от вписването.
      { id: 'library',    key: 'nav.library',      Icon: TrainingIcon  },
      { id: 'recovery',    key: 'nav.recovery',    Icon: RecoveryIcon   },
      { id: 'supplements', key: 'nav.supplements', Icon: SupplementIcon },
      // { id: 'shop', ... } — магазинът е скрит за клиенти до пускането му (само треньор го вижда)
    ],
  },
  {
    labelKey: 'drawer.section.planning',
    tabs: [
      { id: 'calendar', key: 'nav.schedule', Icon: CalendarIcon },
      { id: 'tasks',    key: 'nav.tasks',    Icon: TasksIcon    },
      { id: 'budget',   key: 'nav.budget',   Icon: BudgetIcon   },
    ],
  },
  {
    labelKey: 'drawer.section.resources',
    tabs: [
      { id: 'feed',    key: 'nav.feed',    Icon: FeedIcon    },
      { id: 'chat',    key: 'nav.chat',    Icon: ChatIcon    },
      { id: 'explore', key: 'nav.explore', Icon: ExploreIcon },
      { id: 'learn',   key: 'nav.learn',   Icon: LearnIcon   },
    ],
  },
  {
    labelKey: 'drawer.section.bodybuilding',
    tabs: [
      { id: 'protocol', key: 'nav.protocol', Icon: TrophyIcon },
      { id: 'posing',   key: 'nav.posing',   Icon: PosingIcon },
    ],
  },
  {
    labelKey: 'drawer.section.personal',
    tabs: [
      { id: 'profile', key: 'nav.profile', Icon: ProfileIcon },
      // The only way in since the shortcut tiles left Днес.
      { id: 'rewards', key: 'nav.rewards', Icon: MedalIcon },
    ],
  },
]

const COACH_SECTIONS = [
  {
    labelKey: 'drawer.section.clients',
    tabs: [
      { id: 'clients',  key: 'nav.clients', Icon: ClientsIcon },
      { id: 'orders',   key: 'nav.orders',  Icon: OrdersIcon  },
      { id: 'coachday', key: 'nav.myDay',   Icon: MyDayIcon   },
      { id: 'chat',     key: 'nav.chat',    Icon: ChatIcon    },
    ],
  },
  {
    labelKey: 'drawer.section.myTracking',
    tabs: [
      { id: 'nutrition',  key: 'nav.nutrition',     Icon: NutritionIcon },
      { id: 'compliance', key: 'nav.habits',        Icon: HabitsIcon    },
      { id: 'training',   key: 'nav.training_long', Icon: TrainingIcon  },
      // Треньорът също тренира — заготовките бяха само в клиентското
      // чекмедже, тоест единственият човек, който ги поиска, не ги виждаше.
      { id: 'library',    key: 'nav.library',      Icon: TrainingIcon  },
      { id: 'recovery',    key: 'nav.recovery',    Icon: RecoveryIcon   },
      { id: 'supplements', key: 'nav.supplements', Icon: SupplementIcon },
      { id: 'shop',        key: 'nav.shop',        Icon: ShopIcon       },
    ],
  },
  {
    labelKey: 'drawer.section.planning',
    tabs: [
      { id: 'calendar', key: 'nav.schedule', Icon: CalendarIcon },
      { id: 'tasks',    key: 'nav.tasks',    Icon: TasksIcon    },
      { id: 'budget',   key: 'nav.budget',   Icon: BudgetIcon   },
    ],
  },
  {
    labelKey: 'drawer.section.resources',
    tabs: [
      { id: 'feed',    key: 'nav.feed',    Icon: FeedIcon    },
      { id: 'explore', key: 'nav.explore', Icon: ExploreIcon },
      { id: 'learn',   key: 'nav.learn',   Icon: LearnIcon   },
    ],
  },
  {
    labelKey: 'drawer.section.bodybuilding',
    tabs: [
      { id: 'protocol', key: 'nav.protocol', Icon: TrophyIcon },
      { id: 'posing',   key: 'nav.posing',   Icon: PosingIcon },
    ],
  },
  {
    labelKey: 'drawer.section.personal',
    tabs: [
      { id: 'profile', key: 'nav.profile', Icon: ProfileIcon },
    ],
  },
]

/** Matches the width in the stylesheet — needed to turn a drag into progress. */
function drawerWidth() {
  return Math.min(window.innerWidth * 0.72, 280)
}

export default function NavDrawer({
  open, onClose, activeTab, onTabChange, isCoach, supplementPending = 0,
  dragPx = null,
}) {
  const { profile } = useAuth()
  const { t } = useSettings()
  const sections = isCoach ? COACH_SECTIONS : CLIENT_SECTIONS

  function handleNav(id) {
    onTabChange(id)
    onClose()
  }

  // While a finger is pulling the drawer out, its position is dictated by the
  // drag and the transition is off — a transition here would fight the finger.
  // On release the inline styles fall away and the stylesheet eases it home.
  const dragging = dragPx !== null
  const progress = dragging ? Math.max(0, Math.min(dragPx / drawerWidth(), 1)) : null

  const drawerStyle = dragging
    ? { transform: `translateX(${-drawerWidth() + progress * drawerWidth()}px)`, transition: 'none' }
    : undefined
  const backdropStyle = dragging
    ? { background: `rgba(0, 0, 0, ${0.65 * progress})`, pointerEvents: 'none', transition: 'none' }
    : undefined

  // Build flat list for animation index
  let globalIdx = 0

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`}
        style={backdropStyle}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        style={drawerStyle}
        role="navigation"
        aria-label={t('drawer.aria')}
      >
        <div className={styles.header}>
          <span className={styles.brand}>BLAG</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('drawer.close')} type="button">
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
                {isCoach ? t('drawer.role.coach') : (profile.plan?.toUpperCase() ?? t('drawer.role.client'))}
              </span>
            </div>
            <span className={styles.userArrow}>→</span>
          </button>
        )}

        <div className={styles.nav}>
          {sections.map((section) => (
            <div key={section.labelKey} className={styles.section}>
              <div className={styles.sectionLabel}>{t(section.labelKey)}</div>
              {section.tabs.map((tab) => {
                const idx = globalIdx++
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
                    {tab.id === 'supplements' && supplementPending > 0 && (
                      <span className={styles.badge}>{supplementPending}</span>
                    )}
                    {activeTab === tab.id && tab.id !== 'supplements' && <span className={styles.activeDot} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
