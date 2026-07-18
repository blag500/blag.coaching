import { useEffect } from 'react'
import styles from './SupplementBanner.module.css'

export default function SupplementBanner({ count, onNavigate, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon}>💊</span>
      <span className={styles.text}>
        {count === 1
          ? '1 добавка чака да я вземеш'
          : `${count} добавки чакат да ги вземеш`}
      </span>
      <button className={styles.viewBtn} onClick={onNavigate} type="button">
        Виж
      </button>
      <button className={styles.closeBtn} onClick={onDismiss} type="button" aria-label="Затвори">
        ×
      </button>
    </div>
  )
}
