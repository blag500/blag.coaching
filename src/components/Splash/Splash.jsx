import { useEffect, useState } from 'react'
import styles from './Splash.module.css'

export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), 3200)
    return () => clearTimeout(out)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const done = setTimeout(onDone, 600)
    return () => clearTimeout(done)
  }, [leaving, onDone])

  return (
    <div className={`${styles.splash} ${leaving ? styles.leaving : ''}`}>
      <div className={styles.armsRow}>
        <div className={styles.armLeft} aria-hidden="true" />
        <div className={styles.brandCenter}>
          <h1 className={styles.title}>BLAG COACHING</h1>
          <div className={styles.divider} aria-hidden="true" />
          <p className={styles.tagline}>Be blag, Be better</p>
        </div>
        <div className={styles.armRight} aria-hidden="true" />
      </div>
    </div>
  )
}
