import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import BottomNav from './components/BottomNav/BottomNav'
import NutritionCards from './components/NutritionCards/NutritionCards'
import Compliance from './components/Compliance/Compliance'
import Training from './components/Training/Training'
import Profile from './components/Profile/Profile'
import CoachPanel from './components/Coach/CoachPanel'
import AuthScreen from './components/Auth/AuthScreen'
import Splash from './components/Splash/Splash'
import styles from './App.module.css'

function AppShell() {
  const { session, profile, loading } = useAuth()
  const [splash, setSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('nutrition')

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
  }

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <div key={activeTab} className={styles.page}>
          {pages[activeTab] ?? null}
        </div>
      </main>
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
