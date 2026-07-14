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
import Onboarding from './components/Onboarding/Onboarding'
import PlanSelector from './components/PlanSelector/PlanSelector'
import WelcomeOverlay from './components/Auth/WelcomeOverlay'
import TrainingCalendar from './components/TrainingCalendar/TrainingCalendar'
import LearnPage from './components/Learn/LearnPage'
import Recovery from './pages/Recovery'
import TodayDashboard from './components/TodayDashboard/TodayDashboard'
import RewardsPage from './components/Rewards/RewardsPage'
import Budget from './components/Budget/Budget'
import Tasks from './components/Tasks/Tasks'
import NotificationPrompt from './components/Notifications/NotificationPrompt'
import UpdateBanner from './components/UpdateBanner/UpdateBanner'
import { usePushNotifications } from './hooks/usePushNotifications'
import { trackPage } from './lib/analytics'
import styles from './App.module.css'

function AppShell() {
  const { session, profile, loading } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('blag_welcome_seen'))
  const hiddenAtRef = useRef(null)

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

  if (!session) return <AuthScreen />

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
  if (!isCoach && !profile.onboarding_done) return <Onboarding />

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
