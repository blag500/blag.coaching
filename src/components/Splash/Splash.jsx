import { useEffect, useState } from 'react'
import styles from './Splash.module.css'

/* Ритуалът е веднъж на ден.
   Първото отваряне за деня получава целия сплаш — ръцете, името, лозунга.
   Всяко следващо същия ден е кратко: колкото ръцете да застанат. Човек, който
   влиза пети път да впише обяд, не идва за церемония. Датата е местна, не UTC:
   „днес" е денят на човека, не на сървъра. */
const DAY_KEY = 'blag_splash_day'
const FULL_MS = 3200
const SHORT_MS = 1100

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function firstToday() {
  try {
    if (localStorage.getItem(DAY_KEY) === today()) return false
    localStorage.setItem(DAY_KEY, today())
  } catch { /* частен режим — пълният сплаш е безопасният избор */ }
  return true
}

export default function Splash({ onDone, coaching = false }) {
  const [leaving, setLeaving] = useState(false)
  const [hold] = useState(() => (firstToday() ? FULL_MS : SHORT_MS))

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), hold)
    return () => clearTimeout(out)
  }, [hold])

  useEffect(() => {
    if (!leaving) return
    const done = setTimeout(onDone, 600)
    return () => clearTimeout(done)
  }, [leaving, onDone])

  return (
    /* Докосване го прибира веднага. На `click`, не на `pointerdown`: слоят
       остава да покрива, докато избледнява, и поема удара — иначе пръстът
       минава през него до бутона отдолу. */
    <div
      className={`${styles.splash} ${leaving ? styles.leaving : ''}`}
      onClick={() => setLeaving(true)}
    >
      <div className={styles.armsRow}>
        <div className={styles.armLeft} aria-hidden="true" />
        <div className={styles.brandCenter}>
          <h1 className={styles.title}>BLAG</h1>
          {coaching && <p className={styles.kicker}>COACHING</p>}
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
