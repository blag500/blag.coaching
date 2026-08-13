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
          {/* One wordmark, not two lines that resemble each other. The metal
              runs across the whole block: given to each line separately, each
              gets the full gradient inside its own box and the sheen restarts
              on the second line, which reads as two things stacked. */}
          <h1 className={styles.title}>
            BLAG
            {/* Temporary: back for a recording, to be taken off again after. */}
            <span className={styles.kicker}>coaching</span>
          </h1>
          <div className={styles.divider} aria-hidden="true" />
          {/* Broken deliberately after the comma — the centre column is narrow
              between the two arms, and left to wrap it splits as "BE BLAG, BE". */}
          <p className={styles.tagline}>Be blag,<br />Be better</p>
        </div>
        <div className={styles.armRight} aria-hidden="true" />
      </div>
    </div>
  )
}
