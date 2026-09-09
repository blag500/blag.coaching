import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { subscribe, flush, pending } from '../../lib/outbox'
import styles from './OutboxBanner.module.css'

/**
 * Какво още не е стигнало до сървъра.
 *
 * Тиха лента, не тревога: нищо не е загубено, просто чака. Показва се само
 * когато има какво да чака и си отива сама, щом опашката се изпразни.
 *
 * Няма бутон „опитай пак" за всеки ред. Опашката опитва сама при връщане на
 * мрежата и при всяко отваряне; едно натискане върху лентата е за човека,
 * който не иска да чака.
 */
export default function OutboxBanner() {
  const { t } = useSettings()
  const [n, setN] = useState(() => pending())
  const [offline, setOffline] = useState(() => !navigator.onLine)

  useEffect(() => subscribe(setN), [])

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (n === 0) return null

  return (
    <button
      className={styles.banner}
      onClick={() => flush()}
      type="button"
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>
        {offline ? t('ob.offline', { n }) : t('ob.waiting', { n })}
      </span>
      <span className={styles.action}>{t('ob.retry')}</span>
    </button>
  )
}
