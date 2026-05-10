import { useState } from 'react'
import BottomNav from './components/BottomNav/BottomNav'
import NutritionCards from './components/NutritionCards/NutritionCards'
import FoodLogger from './components/FoodLogger/FoodLogger'
import Compliance from './components/Compliance/Compliance'
import Training from './components/Training/Training'
import Profile from './components/Profile/Profile'
import Welcome from './components/Welcome/Welcome'
import styles from './App.module.css'

function getWelcomed() {
  try { return !!localStorage.getItem('blag_welcomed_v1') } catch { return true }
}

export default function App() {
  const [welcomed, setWelcomed] = useState(getWelcomed)
  const [activeTab, setActiveTab] = useState('nutrition')

  if (!welcomed) {
    return (
      <Welcome onEnter={() => {
        try { localStorage.setItem('blag_welcomed_v1', '1') } catch {}
        setWelcomed(true)
      }} />
    )
  }

  const pages = {
    nutrition:  <NutritionCards />,
    food:       <FoodLogger />,
    compliance: <Compliance />,
    training:   <Training />,
    profile:    <Profile />,
  }

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <div key={activeTab} className={styles.page}>
          {pages[activeTab]}
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
