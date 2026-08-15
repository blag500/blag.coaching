import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import HelpPage from './pages/HelpPage'
import BottomNav from './components/BottomNav/BottomNav'
import NavDrawer from './components/NavDrawer/NavDrawer'
import NutritionCards from './components/NutritionCards/NutritionCards'
import Compliance from './components/Compliance/Compliance'
import Training from './components/Training/Training'
import Profile from './components/Profile/Profile'
import CoachPanel from './components/Coach/CoachPanel'
import CoachMyDay from './components/Coach/CoachMyDay'
import AuthScreen from './components/Auth/AuthScreen'
import Splash from './components/Splash/Splash'
import ChatPage from './components/Chat/ChatPage'
import Explore from './components/Explore/Explore'
import CalorieCalculator from './components/CalorieCalculator/CalorieCalculator'
import Onboarding from './components/Onboarding/Onboarding'
import PlanSelector from './components/PlanSelector/PlanSelector'
import LandingPage from './components/LandingPage/LandingPage'
import WelcomeOverlay from './components/Auth/WelcomeOverlay'
import TrainingCalendar from './components/TrainingCalendar/TrainingCalendar'
import LearnPage from './components/Learn/LearnPage'
import Recovery from './pages/Recovery'
import TodayDashboard from './components/TodayDashboard/TodayDashboard'
import RewardsPage from './components/Rewards/RewardsPage'
import Budget from './components/Budget/Budget'
import Tasks from './components/Tasks/Tasks'
import PrepProtocol from './components/PrepProtocol/PrepProtocol'
import PosingPage from './components/Posing/PosingPage'
import SupplementsPage from './components/Supplements/SupplementsPage'
import ShopPage from './components/Shop/ShopPage'
import OrdersPanel from './components/Coach/OrdersPanel'
import NotificationPrompt from './components/Notifications/NotificationPrompt'
import UpdateBanner from './components/UpdateBanner/UpdateBanner'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useHideOnScroll } from './hooks/useHideOnScroll'
import SwipePager from './components/SwipePager/SwipePager'
import { useSupplementsToday } from './hooks/useSupplementsToday'
import SupplementBanner from './components/Supplements/SupplementBanner'
import { trackPage } from './lib/analytics'
import styles from './App.module.css'

const NAV_ORDER = ['today', 'nutrition', 'training', 'profile']

function AppShell() {
  const { session, profile, loading, selectPlan, refreshProfile } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [slideDir, setSlideDir] = useState('up')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showSupplementBanner, setShowSupplementBanner] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('blag_welcome_seen'))
  // How far the side navigation has been pulled out by a finger, or null when
  // no drag is in progress and the stylesheet is in charge of its position.
  const [drawerDrag, setDrawerDrag] = useState(null)
  const [landingSeen, setLandingSeen] = useState(false)
  const [authMode, setAuthMode] = useState('register')
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

  function navigate(newTab, { instant = false } = {}) {
    // A swipe has already carried the page across, so replaying the entrance
    // animation would show the same move twice.
    if (instant) { setSlideDir('none'); setActiveTab(newTab); return }

    const prevIdx = NAV_ORDER.indexOf(activeTab)
    const newIdx  = NAV_ORDER.indexOf(newTab)
    if (prevIdx !== -1 && newIdx !== -1 && prevIdx !== newIdx) {
      setSlideDir(newIdx > prevIdx ? 'right' : 'left')
    } else {
      setSlideDir('up')
    }
    setActiveTab(newTab)
  }

  usePushNotifications()
  useHideOnScroll(!drawerOpen)

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
        <LandingPage
          onContinue={() => { setAuthMode('register'); setLandingSeen(true) }}
          onLogin={() => { setAuthMode('login'); setLandingSeen(true) }}
        />
      )
    }
    return <AuthScreen initialMode={authMode} onBack={() => setLandingSeen(false)} />
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

  if (!isCoach && !profile.plan)            return <PlanSelector />
  if (!isCoach && !profile.onboarding_done) {
    // PRO is the coached tier, so it gets the full intake. 'coaching' is the
    // old id for the same thing — still honoured for clients who chose it then.
    const coached = profile.plan === 'pro' || profile.plan === 'coaching'
    return coached
      ? <Onboarding isCoachingIntake />
      : <CalorieCalculator isOnboarding />
  }

  // Nothing is sold by card here. PRO is arranged with the coach, who approves
  // the application himself — so no payment wall stands in anybody's way.

  if (paymentProcessing) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingDot} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--muted)', marginTop: 16 }}>
          Потвърждаваме плащането...
        </p>
      </div>
    )
  }

  const openMenu = () => setDrawerOpen(true)

  const pages = {
    today:      <TodayDashboard onNavigate={navigate} onMenuOpen={openMenu} />,
    nutrition:  <NutritionCards onNavigate={navigate} onMenuOpen={openMenu} />,
    compliance: <Compliance />,
    training:   <Training onMenuOpen={openMenu} />,
    recovery:   <Recovery />,
    profile:    <Profile onMenuOpen={openMenu} />,
    clients:    <CoachPanel />,
    coachday:   <CoachMyDay />,
    explore:    <Explore onMenuOpen={openMenu} />,
    calendar:   <TrainingCalendar />,
    learn:      <LearnPage />,
    chat:       <ChatPage />,
    rewards:    <RewardsPage onBack={() => setActiveTab('today')} />,
    budget:     <Budget />,
    tasks:      <Tasks />,
    protocol:   <PrepProtocol />,
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
      {!isCoach && showWelcome && <WelcomeOverlay onDone={dismissWelcome} />}
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
          order={NAV_ORDER}
          active={activeTab}
          onChange={navigate}
          enabled={!drawerOpen && NAV_ORDER.includes(activeTab)}
          onEdgePull={setDrawerDrag}
          onEdgeEnd={shouldOpen => { setDrawerDrag(null); setDrawerOpen(shouldOpen) }}
          render={tab => (
            <div key={tab} className={styles.page} data-dir={tab === activeTab ? slideDir : 'none'}>
              {pages[tab] ?? null}
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
  if (window.location.pathname === '/help') return <HelpPage />
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SettingsProvider>
  )
}
