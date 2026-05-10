import { useEffect, useState } from 'react'
import styles from './Splash.module.css'

export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), 2700)
    return () => clearTimeout(out)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const done = setTimeout(onDone, 600)
    return () => clearTimeout(done)
  }, [leaving, onDone])

  return (
    <div className={`${styles.splash} ${leaving ? styles.leaving : ''}`}>
      <div className={styles.inner}>
        <img
          src="/apple-touch-icon.png"
          className={styles.logo}
          alt="Blag Coaching"
          draggable={false}
        />
        <div className={styles.textBlock}>
          <h1 className={styles.title}>BLAG COACHING</h1>
          <p className={styles.tagline}>Be blag, Be better</p>
        </div>
      </div>
    </div>
  )
}
