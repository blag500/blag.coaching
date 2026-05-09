import { useState } from 'react'
import { COACH_WHATSAPP } from '../../data/appData'
import styles from './SOSButton.module.css'

const MESSAGE = encodeURIComponent('Здравей, нужна ми е помощ от треньора!')

export default function SOSButton() {
  const [triggered, setTriggered] = useState(false)

  function handleSOS() {
    setTriggered(true)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    window.open(`https://wa.me/${COACH_WHATSAPP}?text=${MESSAGE}`, '_blank')
    setTimeout(() => setTriggered(false), 4000)
  }

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${triggered ? styles.triggered : ''}`}
        onClick={handleSOS}
        aria-label="SOS — свържи се с треньора"
      >
        <span className={styles.sosText}>SOS</span>
        <span className={styles.sosSubtext}>Свържи се с треньора</span>
      </button>

      {triggered && (
        <div className={styles.feedback} role="alert" aria-live="assertive">
          Отваряме WhatsApp... Треньорът ще ти отговори! 💪
        </div>
      )}
    </div>
  )
}
