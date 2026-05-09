import { useState } from 'react'
import BottomNav from './components/BottomNav/BottomNav'
import NutritionCards from './components/NutritionCards/NutritionCards'
import FoodLogger from './components/FoodLogger/FoodLogger'
import Compliance from './components/Compliance/Compliance'
import Training from './components/Training/Training'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('nutrition')

  const pages = {
    nutrition:  <NutritionCards />,
    food:       <FoodLogger />,
    compliance: <Compliance />,
    training:   <Training />,
  }

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        {pages[activeTab]}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
