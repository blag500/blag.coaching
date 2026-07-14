import { useAppUpdate } from '../../hooks/useAppUpdate'
import styles from './UpdateBanner.module.css'

export default function UpdateBanner() {
  const { updateAvailable, reload } = useAppUpdate()
  if (!updateAvailable) return null

  return (
    <div className={styles.banner}>
      <span className={styles.text}>Налична е нова версия на приложението</span>
      <button className={styles.btn} onClick={reload} type="button">ОБНОВИ</button>
    </div>
  )
}
