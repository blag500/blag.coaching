import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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
import { usePushNotifications } from './hooks/usePushNotifications'
import styles from './App.module.css'

function AppShell() {
  const { session, profile, loading } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('nutrition')
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  const isCoach = profile?.role === 'coach'

  const pages = {
    nutrition:  <NutritionCards />,
    compliance: <Compliance />,
    training:   <Training />,
    profile:    <Profile />,
    clients:    <CoachPanel />,
    explore:    <Explore />,
  }

  return (
    <div className={styles.shell}>
      <button
        className={styles.hamburger}
        onClick={() => setDrawerOpen(true)}
        aria-label="Отвори меню"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18" aria-hidden="true">
          <line x1="3" y1="6"  x2="21" y2="6"  />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCoach={isCoach}
      />

      <main className={styles.content}>
        <div key={activeTab} className={styles.page}>
          {pages[activeTab] ?? null}
        </div>
      </main>
      <ChatButton />
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCoach={isCoach}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
