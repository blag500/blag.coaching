import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import HelpPage from './pages/HelpPage'
import BottomNav from './components/BottomNav/BottomNav'
import NavDrawer from './components/NavDrawer/NavDrawer'
import NutritionCards from './components/NutritionCards/NutritionCards'
import Compliance from './components/Compliance/Compliance'
import Training from './components/Training/Training'
import Profile from './components/Profile/Profile'
import CoachPanel from './components/Coach/CoachPanel'
import AuthScreen from './components/Auth/AuthScreen'
import Splash from './components/Splash/Splash'
import ChatButton from './components/Compliance/SOSButton'
import Explore from './components/Explore/Explore'
import PendingApproval from './components/Auth/PendingApproval'
import PlanSelector from './components/Auth/PlanSelector'
import ContactForm from './components/Auth/ContactForm'
import WelcomeOverlay from './components/Auth/WelcomeOverlay'
import SetupProfile from './components/Auth/SetupProfile'
import TrainingCalendar from './components/TrainingCalendar/TrainingCalendar'
import Recovery from './pages/Recovery'
import NotificationPrompt from './components/Notifications/NotificationPrompt'
import { usePushNotifications } from './hooks/usePushNotifications'
import styles from './App.module.css'

function AppShell() {
  const { session, profile, loading } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('nutrition')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('blag_welcome_seen'))
  const [showSetup,   setShowSetup]   = useState(() => !localStorage.getItem('blag_setup_done'))
  const hiddenAtRef = useRef(null)

  usePushNotifications()

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

  if (!isCoach && !profile.plan) return <PlanSelector />

  if (!isCoach && profile.plan && !profile.intake_done) return <ContactForm />

  if (!isCoach && profile.plan_pending) return <PendingApproval />

  const pages = {
    nutrition:  <NutritionCards />,
    compliance: <Compliance />,
    training:   <Training />,
    recovery:   <Recovery />,
    profile:    <Profile />,
    clients:    <CoachPanel />,
    explore:    <Explore />,
    calendar:   <TrainingCalendar />,
  }

  function dismissWelcome() {
    localStorage.setItem('blag_welcome_seen', '1')
    setShowWelcome(false)
  }

  function dismissSetup() {
    localStorage.setItem('blag_setup_done', '1')
    setShowSetup(false)
  }

  return (
    <div className={styles.shell}>
      {!isCoach && showWelcome && <WelcomeOverlay onDone={dismissWelcome} />}
      {!isCoach && !showWelcome && showSetup && <SetupProfile onDone={dismissSetup} />}
      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCoach={isCoach}
      />

      <NotificationPrompt />
      <main className={styles.content}>
        <div key={activeTab} className={styles.page}>
          {pages[activeTab] ?? null}
        </div>
      </main>
      <ChatButton />
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
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
