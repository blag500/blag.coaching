import { useState, useEffect } from 'react'
import { useWaterLog } from '../../hooks/useWaterLog'
import styles from './FAB.module.css'

export default function FAB({ onNavigate, activeTab }) {
  const [open, setOpen] = useState(false)
  const { add: addWater } = useWaterLog()
  const [waterFlash, setWaterFlash] = useState(false)

  useEffect(() => { setOpen(false) }, [activeTab])

  if (activeTab === 'nutrition') return null

  function handleFood() {
    setOpen(false)
    onNavigate('nutrition')
  }

  function handleWater() {
    addWater(1)
    setWaterFlash(true)
    setTimeout(() => setWaterFlash(false), 900)
    setOpen(false)
  }

  function handlePhoto() {
    setOpen(false)
    onNavigate('nutrition')
  }

  return (
    <>
      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <div className={styles.wrap}>
        {open && (
          <div className={styles.dial}>
            <button className={styles.action} onClick={handlePhoto} type="button" aria-label="Снимай ядене">
              <CameraIcon />
              <span className={styles.actionLabel}>Снимай</span>
            </button>
            <button className={styles.action} onClick={handleWater} type="button" aria-label="Добави вода">
              <WaterIcon />
              <span className={styles.actionLabel}>Вода +1</span>
            </button>
            <button className={styles.action} onClick={handleFood} type="button" aria-label="Логни ядене">
              <FoodIcon />
              <span className={styles.actionLabel}>Храна</span>
            </button>
          </div>
        )}

        <button
          className={`${styles.fab} ${open ? styles.fabOpen : ''} ${waterFlash ? styles.fabFlash : ''}`}
          onClick={() => setOpen(o => !o)}
          type="button"
          aria-label={open ? 'Затвори' : 'Бързо действие'}
        >
          <PlusIcon />
        </button>
      </div>
    </>
  )
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="24" height="24" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const FoodIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const WaterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
)

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
