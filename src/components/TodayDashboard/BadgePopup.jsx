import { useEffect, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './BadgePopup.module.css'

const EMOJIS = { calories: '🥗', habits: '✅', training: '💪', perfect: '⭐' }

export default function BadgePopup({ badge, onDone }) {
  const { t } = useSettings()
  const [phase, setPhase] = useState('in')
  const def = badge ? {
    emoji: EMOJIS[badge],
    label: t(`badge.${badge}.label`),
    sub:   t(`badge.${badge}.sub`),
  } : null

  useEffect(() => {
    const hide = setTimeout(() => setPhase('out'), 2600)
    const done = setTimeout(onDone, 3000)
    return () => { clearTimeout(hide); clearTimeout(done) }
  }, [])

  if (!def) return null
  return (
    <div className={`${styles.wrap} ${phase === 'out' ? styles.out : styles.in}`}>
      <div className={styles.popup}>
        <span className={styles.emoji}>{def.emoji}</span>
        <div className={styles.text}>
          <span className={styles.label}>{def.label}</span>
          <span className={styles.sub}>{def.sub}</span>
        </div>
      </div>
    </div>
  )
}
