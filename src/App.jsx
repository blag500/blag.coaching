import { useState, useEffect, useRef } from 'react'
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
import PaymentWall from './components/PaymentWall/PaymentWall'
import NotificationPrompt from './components/Notifications/NotificationPrompt'
import UpdateBanner from './components/UpdateBanner/UpdateBanner'
import { usePushNotifications } from './hooks/usePushNotifications'
import { trackPage } from './lib/analytics'
import styles from './App.module.css'

function AppShell() {
  const { session, profile, loading, selectPlan, refreshProfile } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('blag_welcome_seen'))
  const [landingSeen, setLandingSeen] = useState(false)
  const [planChosen, setPlanChosen] = useState(() => !!localStorage.getItem('blag_pending_plan'))
  const [paymentProcessing, setPaymentProcessing] = useState(() => {
    return new URLSearchParams(window.location.search).get('payment') === 'success'
  })
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
    if (!paymentProcessing) return
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    window.history.replaceState({}, '', url.pathname)
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

  usePushNotifications()

  useEffect(() => { trackPage(activeTab) }, [activeTab])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current) {
        if (Date.now() - hiddenAtRef.current > 30000) {
          setSplash(true)
        }
        hiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  if (splash) return <Splash onDone={() => setSplash(false)} />

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingDot} />
      </div>
    )
  }

  if (!session) {
    if (!landingSeen && !planChosen) {
      return (
        <LandingPage
          onContinue={() => setLandingSeen(true)}
          onLogin={() => { setLandingSeen(true); setPlanChosen(true) }}
        />
      )
    }
    if (!planChosen) {
      return (
        <PlanSelector
          onSelect={planId => {
            localStorage.setItem('blag_pending_plan', planId)
            setPlanChosen(true)
          }}
        />
      )
    }
    return (
      <AuthScreen
        onBack={() => {
          localStorage.removeItem('blag_pending_plan')
          setPlanChosen(false)
        }}
      />
    )
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
    return profile.plan === 'coaching'
      ? <Onboarding isCoachingIntake />
      : <CalorieCalculator isOnboarding />
  }

  // Paid plan chosen but payment not yet confirmed by Stripe webhook
  const needsPayment = !isCoach && profile.plan !== 'free' && !profile.stripe_subscription_id

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

  if (needsPayment) {
    return <PaymentWall onDowngrade={() => {}} />
  }

  const pages = {
    today:      <TodayDashboard onNavigate={setActiveTab} />,
    nutrition:  <NutritionCards onNavigate={setActiveTab} />,
    compliance: <Compliance />,
    training:   <Training />,
    recovery:   <Recovery />,
    profile:    <Profile />,
    clients:    <CoachPanel />,
    coachday:   <CoachMyDay />,
    explore:    <Explore />,
    calendar:   <TrainingCalendar />,
    learn:      <LearnPage />,
    chat:       <ChatPage />,
    rewards:    <RewardsPage onBack={() => setActiveTab('today')} />,
    budget:     <Budget />,
    tasks:      <Tasks />,
    protocol:   <PrepProtocol />,
    posing:       <PosingPage />,
    supplements:  <SupplementsPage />,
  }

  function dismissWelcome() {
    localStorage.setItem('blag_welcome_seen', '1')
    setShowWelcome(false)
  }

  return (
    <div className={styles.shell}>
      {!isCoach && showWelcome && <WelcomeOverlay onDone={dismissWelcome} />}
      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCoach={isCoach}
      />

      <UpdateBanner />
      <NotificationPrompt />
      <main className={styles.content}>
        <div key={activeTab} className={styles.page}>
          {pages[activeTab] ?? null}
        </div>
      </main>
<BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMenuOpen={() => setDrawerOpen(true)}
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
