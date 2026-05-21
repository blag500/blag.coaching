import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './PendingApproval.module.css'

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export default function PendingApproval() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refreshProfile()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refreshProfile])

  async function handleCheck() {
    setChecking(true)
    await refreshProfile()
    setChecking(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.iconWrap}>
        <ClockIcon />
      </div>
      <h1 className={styles.title}>ОЧАКВА ОДОБРЕНИЕ</h1>
      <p className={styles.text}>
        Твоят акаунт чака потвърждение от треньора.
        Ще получиш пълен достъп след одобрение.
      </p>
      {profile?.email && (
        <p className={styles.email}>{profile.email}</p>
      )}
      <button
        className={styles.checkBtn}
        onClick={handleCheck}
        disabled={checking}
        type="button"
      >
        {checking ? 'Проверява...' : 'Провери отново'}
      </button>
      <button
        className={styles.signOutBtn}
        onClick={signOut}
        type="button"
      >
        Изход
      </button>
    </div>
  )
}
