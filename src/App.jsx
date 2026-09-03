import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import ResetPasswordPage from './pages/ResetPasswordPage'
import BottomNav from './components/BottomNav/BottomNav'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import NavDrawer from './components/NavDrawer/NavDrawer'
import NutritionCards from './components/NutritionCards/NutritionCards'
import Compliance from './components/Compliance/Compliance'
import Training from './components/Training/Training'
import Profile from './components/Profile/Profile'
import AuthScreen from './components/Auth/AuthScreen'
import Splash from './components/Splash/Splash'
import ChatPage from './components/Chat/ChatPage'
import RegistrationSuccess from './components/RegistrationSuccess/RegistrationSuccess'
import PlanSelector from './components/PlanSelector/PlanSelector'
import WelcomeOverlay from './components/Auth/WelcomeOverlay'
import TodayDashboard from './components/TodayDashboard/TodayDashboard'
import FeedPage from './components/Feed/FeedPage'
import NotificationPrompt from './components/Notifications/NotificationPrompt'
import UpdateBanner from './components/UpdateBanner/UpdateBanner'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useHideOnScroll } from './hooks/useHideOnScroll'
import { useKeyboardInset } from './hooks/useKeyboardInset'
import SwipePager from './components/SwipePager/SwipePager'
import { useSupplementsToday } from './hooks/useSupplementsToday'
import SupplementBanner from './components/Supplements/SupplementBanner'
import { trackPage } from './lib/analytics'
import { tr } from './utils/locale'
import styles from './App.module.css'

/* Разделянето по маршрути.
 *
 * Всичко тук се внасяше отгоре, наведнъж: 1,48 MB в един файл, който всеки
 * клиент тегли, преди да види първия екран. Вътре имаше треньорския панел
 * (близо две хиляди реда, за един човек от тринайсет), помощната страница,
 * лендингът — който човек с инсталирано приложение не вижда никога — и
 * онбордингът, който се минава веднъж в живота на акаунта.
 *
 * Разделите от долната лента НЕ са тук и това е нарочно: пейджърът строи
 * съседната страница в началото на хода и я пуска да пътува веднага. Страница,
 * която в този момент тръгне да се тегли, би пътувала празна.
 */
const HelpPage = lazy(() => import('./pages/HelpPage'))
const LandingPage = lazy(() => import('./components/LandingPage/LandingPage'))
const Onboarding = lazy(() => import('./components/Onboarding/Onboarding'))
const CoachPanel = lazy(() => import('./components/Coach/CoachPanel'))
const CoachMyDay = lazy(() => import('./components/Coach/CoachMyDay'))
const OrdersPanel = lazy(() => import('./components/Coach/OrdersPanel'))
const Budget = lazy(() => import('./components/Budget/Budget'))
const ShopPage = lazy(() => import('./components/Shop/ShopPage'))
const CalorieCalculator = lazy(() => import('./components/CalorieCalculator/CalorieCalculator'))
const LearnPage = lazy(() => import('./components/Learn/LearnPage'))
const PrepProtocol = lazy(() => import('./components/PrepProtocol/PrepProtocol'))
const PosingPage = lazy(() => import('./components/Posing/PosingPage'))
const TrainingCalendar = lazy(() => import('./components/TrainingCalendar/TrainingCalendar'))
const ExerciseLibrary = lazy(() => import('./components/Training/ExerciseLibrary'))
const RewardsPage = lazy(() => import('./components/Rewards/RewardsPage'))
const CheckinPage = lazy(() => import('./components/Checkin/CheckinPage'))
const SupplementsPage = lazy(() => import('./components/Supplements/SupplementsPage'))
const Explore = lazy(() => import('./components/Explore/Explore'))
const Recovery = lazy(() => import('./pages/Recovery'))
const Tasks = lazy(() => import('./components/Tasks/Tasks'))


/* Фийдът зае мястото, което таблото освободи, когато се прибра в Профил.
   Редът е същият, само първият адрес е друг. */
const NAV_ORDER = ['feed', 'nutrition', 'training', 'profile']


/* Чакането, докато една отложена страница пристига. Същата точка, която стои
   и докато сесията се чете — за човека това е едно и също събитие. */
function PageLoader({ children }) {
  return (
    <Suspense fallback={<div className={styles.loadingScreen}><span className={styles.loadingDot} /></div>}>
      {children}
    </Suspense>
  )
}

// Goal ids → the word the success chip shows after the calorie target.
const GOAL_KEY = { cut: 'goal.cut', maintain: 'goal.maintain', bulk: 'goal.bulk' }

function AppShell() {
  const { session, profile, loading, selectPlan, refreshProfile } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('feed')
  const [slideDir, setSlideDir] = useState('up')
  const pagerRef = useRef(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showSupplementBanner, setShowSupplementBanner] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('blag_welcome_seen'))
  // How far the side navigation has been pulled out by a finger, or null when
  // no drag is in progress and the stylesheet is in charge of its position.
  const [drawerDrag, setDrawerDrag] = useState(null)
  // Skip the landing pitch for anyone who already installed the PWA — that
  // page is a shopfront for people arriving at the website, not for someone
  // who tapped the app icon on their home screen. Both the standalone media
  // query and iOS's legacy navigator.standalone are checked because Safari
  // still uses the older flag inside home-screen PWAs.
  const [landingSeen, setLandingSeen] = useState(() => {
    if (typeof window === 'undefined') return false
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    return !!standalone
  })
  // Set to the client's name (armed) the instant the self-serve flow finishes,
  // so the success screen stands in front of the tabs for one deliberate beat.
  // null = not finishing; '' = finishing but nameless.
  const [onboardName, setOnboardName] = useState(null)
  const [authMode, setAuthMode] = useState('register')
  const [authEmail, setAuthEmail] = useState('')
  const [paymentProcessing, setPaymentProcessing] = useState(() => {
    return new URLSearchParams(window.location.search).get('payment') === 'success'
  })
  const [orderSuccessId] = useState(() =>
    new URLSearchParams(window.location.search).get('order_success') ?? null
  )
  const hiddenAtRef = useRef(null)

  // Once session + profile arrive, apply any plan chosen before registration
  useEffect(() => {
    const pending = localStorage.getItem('blag_pending_plan')
    if (pending && profile && !profile.plan) {
      selectPlan(pending).then(() => localStorage.removeItem('blag_pending_plan'))
    }
  }, [profile?.id])

  // Stripe redirect: clean URL then poll until webhook confirms subscription
  useEffect(() => {
    if (!paymentProcessing && !orderSuccessId) return
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    url.searchParams.delete('order_success')
    window.history.replaceState({}, '', url.pathname)
    if (orderSuccessId) setActiveTab('shop')
  }, [])

  useEffect(() => {
    if (!paymentProcessing || !session) return
    const timer = setInterval(async () => {
      await refreshProfile()
    }, 3000)
    return () => clearInterval(timer)
  }, [paymentProcessing, session?.user?.id])

  useEffect(() => {
    if (paymentProcessing && profile?.stripe_subscription_id) {
      setPaymentProcessing(false)
    }
  }, [profile?.stripe_subscription_id])

  /* Кой разговор да отвори чатът. Носи се през navigate, защото пътят е
     „профил във фийда → ПИШИ → чат", а табът няма как да отгатне човека. */
  const [chatPeer, setChatPeer] = useState(null)

  function navigate(newTab, { instant = false, peer = null } = {}) {
    if (newTab === 'chat') setChatPeer(peer)
    // A swipe has already carried the page across, so replaying the entrance
    // animation would show the same move twice.
    if (instant) { setSlideDir('none'); setActiveTab(newTab); return }

    const prevIdx = NAV_ORDER.indexOf(activeTab)
    const newIdx  = NAV_ORDER.indexOf(newTab)
    if (prevIdx !== -1 && newIdx !== -1 && prevIdx !== newIdx) {
      /* И двете са в лентата — значи страницата може да пропътува разстоянието
         вместо да изплува на място. Същият ход като при суайп, само че бутнат
         от бутон. Ако пейджърът не го поеме (отворено чекмедже, изключени
         анимации), остава изплуването. */
      if (!drawerOpen && pagerRef.current?.glideTo(newTab)) return
      setSlideDir(newIdx > prevIdx ? 'right' : 'left')
    } else {
      setSlideDir('up')
    }
    setActiveTab(newTab)
  }

  usePushNotifications()
  useHideOnScroll(!drawerOpen)
  useKeyboardInset()

  const { pendingCount: supplementPending } = useSupplementsToday()

  useEffect(() => { trackPage(activeTab) }, [activeTab])

  // A new tab starts at its top. During a swipe the incoming page is shown from
  // the top, so landing halfway down it after the finger lifts would contradict
  // what was on screen a moment earlier. Layout effect, so the jump happens
  // before the frame is painted rather than as a visible flick.
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [activeTab])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current) {
        const away = Date.now() - hiddenAtRef.current
        hiddenAtRef.current = null
        if (away > 30000) {
          setSplash(true)
        } else if (away > 5000 && supplementPending > 0) {
          setShowSupplementBanner(true)
        }
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [supplementPending])

  /* A visitor with no session is on their way to the landing page, and that
     page sells coaching — so the mark they see first is the full one. Someone
     already signed in is on their way into the app, which is BLAG. */
  if (splash) return (
    <Splash coaching={!session} onDone={() => {
      setSplash(false)
      if (supplementPending > 0) {
        setTimeout(() => setShowSupplementBanner(true), 1500)
      }
    }} />
  )

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingDot} />
      </div>
    )
  }

  // Nobody is asked to pick a plan before they have seen the product — the
  // choice happens after signup, where the free tier is the obvious default.
  if (!session) {
    if (!landingSeen) {
      return (
        <PageLoader>
          <LandingPage
            onContinue={typed => {
              if (typeof typed === 'string') setAuthEmail(typed)
              setAuthMode('register'); setLandingSeen(true)
            }}
            onLogin={() => { setAuthMode('login'); setLandingSeen(true) }}
          />
        </PageLoader>
      )
    }
    return <AuthScreen initialMode={authMode} initialEmail={authEmail} onBack={() => setLandingSeen(false)} />
  }

  // Session known but profile not yet fetched — keep showing the loader
  if (!profile) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingDot} />
      </div>
    )
  }

  const isCoach = profile.role === 'coach'

  // Checked before the onboarding gate and the tabs both: once the self-serve
  // flow arms this, the success screen owns the view until the client taps in —
  // even while the save is still settling and onboarding_done flips underneath.
  if (onboardName !== null && !isCoach) {
    return (
      <RegistrationSuccess
        name={onboardName}
        calories={profile.calories}
        goal={GOAL_KEY[profile.goal] ? tr(GOAL_KEY[profile.goal]) : undefined}
        ready={profile.onboarding_done}
        onEnter={() => setOnboardName(null)}
      />
    )
  }

  if (!isCoach && !profile.onboarding_done) {
    // PRO is the coached tier — set by the coach directly in the DB.
    // Everyone else goes through the self-serve flow which ends with the coach upsell.
    const coached = profile.plan === 'pro' || profile.plan === 'coaching'
    return (
      <PageLoader>
        <Onboarding
          isCoachingIntake={coached}
          onComplete={name => setOnboardName(name || '')}
          onError={() => setOnboardName(null)}
        />
      </PageLoader>
    )
  }

  // Nothing is sold by card here. PRO is arranged with the coach, who approves
  // the application himself — so no payment wall stands in anybody's way.

  if (paymentProcessing) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingDot} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--muted)', marginTop: 16 }}>
          {tr('payment.confirming')}
        </p>
      </div>
    )
  }

  const openMenu = () => setDrawerOpen(true)

  const pages = {
    feed:       <FeedPage onNavigate={navigate} onMenuOpen={openMenu} />,
    /* Таблото вече живее като раздел ДНЕС вътре в Профил. Адресът остава
       заради треньора, чийто профил е друга страница, и заради всяка връзка,
       която още сочи насам. */
    today:      <TodayDashboard onNavigate={navigate} onMenuOpen={openMenu} />,
    nutrition:  <NutritionCards onNavigate={navigate} onMenuOpen={openMenu} />,
    compliance: <Compliance />,
    training:   <Training onMenuOpen={openMenu} />,
    recovery:   <Recovery />,
    profile:    <Profile onMenuOpen={openMenu} onNavigate={navigate} />,
    clients:    <CoachPanel />,
    coachday:   <CoachMyDay />,
    explore:    <Explore onMenuOpen={openMenu} />,
    calendar:   <TrainingCalendar />,
    /* Заготовките за заместване на упражнение в дневника. */
    library:    <ExerciseLibrary onMenuOpen={openMenu} />,
    learn:      <LearnPage />,
    chat:       <ChatPage peerId={chatPeer} key={chatPeer || 'list'} />,
    rewards:    <RewardsPage onBack={() => setActiveTab('profile')} />,
    budget:     <Budget />,
    tasks:      <Tasks />,
    protocol:   <PrepProtocol />,
    /* Чекинът е седмичен, не всекидневен — затова не е таб, а страница, до
       която се стига от Профил и от лентата, когато се дължи. */
    checkin:    <CheckinPage onBack={() => setActiveTab('profile')} />,
    posing:       <PosingPage />,
    supplements:  <SupplementsPage />,
    shop:         isCoach ? <ShopPage initialOrderSuccess={!!orderSuccessId} /> : null,
    orders:       <OrdersPanel />,
  }

  function dismissWelcome() {
    localStorage.setItem('blag_welcome_seen', '1')
    setShowWelcome(false)
  }

  return (
    <div className={styles.shell}>
      {!isCoach && showSupplementBanner && supplementPending > 0 && (
        <SupplementBanner
          count={supplementPending}
          onNavigate={() => { setActiveTab('supplements'); setShowSupplementBanner(false) }}
          onDismiss={() => setShowSupplementBanner(false)}
        />
      )}
      <NavDrawer
        open={drawerOpen}
        dragPx={drawerDrag}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={navigate}
        isCoach={isCoach}
        supplementPending={!isCoach ? supplementPending : 0}
      />

      <UpdateBanner />
      <NotificationPrompt />
      <main className={styles.content}>
        <SwipePager
          ref={pagerRef}
          order={NAV_ORDER}
          active={activeTab}
          onChange={navigate}
          enabled={!drawerOpen && NAV_ORDER.includes(activeTab)}
          onEdgePull={setDrawerDrag}
          onEdgeEnd={shouldOpen => { setDrawerDrag(null); setDrawerOpen(shouldOpen) }}
          /* Предпазителят е около една страница, не около приложението:
             гръмнал екран не бива да отнася навигацията със себе си —
             останалите табове работят и човекът има къде да отиде. */
          render={tab => (
            <div key={tab} className={styles.page} data-dir={tab === activeTab ? slideDir : 'none'}>
              <ErrorBoundary key={tab}>
                <PageLoader>{pages[tab] ?? null}</PageLoader>
              </ErrorBoundary>
            </div>
          )}
        />
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={navigate}
      />
    </div>
  )
}

export default function App() {
  if (window.location.pathname === '/help') return <PageLoader><HelpPage /></PageLoader>
  /* Password recovery — линкът от 'забравена парола' писмото носи session
     token в URL fragment-а и трябва да падне на дедициран екран за нова
     парола, не на onboarding gate-а на AppShell. Стои вътре в providers
     защото ползва t() и supabase-js. */
  if (window.location.pathname === '/reset-password') {
    return (
      <SettingsProvider>
        <ResetPasswordPage />
      </SettingsProvider>
    )
  }
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SettingsProvider>
  )
}
