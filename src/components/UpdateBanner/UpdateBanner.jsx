import { useState, useEffect } from 'react'
import { useAppUpdate } from '../../hooks/useAppUpdate'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './UpdateBanner.module.css'

export default function UpdateBanner() {
  const { updateAvailable, reload } = useAppUpdate()
  const { profile } = useAuth()
  const [coachNotice, setCoachNotice] = useState(false)
  const [dismissed,   setDismissed]   = useState(false)

  useEffect(() => {
    if (profile?.role === 'coach') return
    supabase
      .from('profiles')
      .select('update_notice')
      .eq('role', 'coach')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data?.update_notice) setCoachNotice(true) })
  }, [profile?.id])

  if (dismissed) return null
  if (!updateAvailable && !coachNotice) return null

  return (
    <div className={styles.banner}>
      <span className={styles.text}>Налична е нова версия на приложението</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className={styles.btn} onClick={reload} type="button">ОБНОВИ</button>
        {coachNotice && !updateAvailable && (
          <button className={styles.dismissBtn} onClick={() => setDismissed(true)} type="button">✕</button>
        )}
      </div>
    </div>
  )
}
