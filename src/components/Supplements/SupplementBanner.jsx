import { useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './SupplementBanner.module.css'

export default function SupplementBanner({ count, onNavigate, onDismiss }) {
  const { t } = useSettings()
  useEffect(() => {
    const to = setTimeout(onDismiss, 5000)
    return () => clearTimeout(to)
  }, [onDismiss])

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon}>💊</span>
      <span className={styles.text}>
        {count === 1 ? t('sb.one') : t('sb.many', { n: count })}
      </span>
      <button className={styles.viewBtn} onClick={onNavigate} type="button">
        {t('sb.view')}
      </button>
      <button className={styles.closeBtn} onClick={onDismiss} type="button" aria-label={t('sb.close')}>
        ×
      </button>
    </div>
  )
}
