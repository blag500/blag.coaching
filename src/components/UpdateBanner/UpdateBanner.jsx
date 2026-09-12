import { useState, useEffect } from 'react'
import { useAppUpdate } from '../../hooks/useAppUpdate'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './UpdateBanner.module.css'

export default function UpdateBanner() {
  const { updateAvailable, reload } = useAppUpdate()
  const { profile } = useAuth()
  const { t } = useSettings()
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
      <span className={styles.text}>{t('ub.newVersion')}</span>
      <div className={styles.actions}>
        {/* Знак, не дума. Лентата вече казва, че има нова версия — „ОБНОВИ"
            до нея е второто изречение на същата мисъл, а мястото отгоре е
            толкова, че надписът изяжда половината ред на тесен телефон.
            Кръгчето със стрелката значи същото навсякъде другаде. */}
        <button
          className={styles.btn}
          onClick={reload}
          type="button"
          aria-label={t('ub.refresh')}
          title={t('ub.refresh')}
        >
          <Pictogram name="refresh" size={18} />
        </button>
        {coachNotice && !updateAvailable && (
          <button
            className={styles.dismissBtn}
            onClick={() => setDismissed(true)}
            type="button"
            aria-label={t('ub.dismiss')}
          >
            <Pictogram name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
