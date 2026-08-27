import styles from './ProgressBar.module.css'
import { useSettings } from '../../contexts/SettingsContext'

export default function ProgressBar({ completed, total }) {
  const { t } = useSettings()
  const pct = total > 0 ? (completed / total) * 100 : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.score}>
          <span className={styles.scoreNum}>{completed}</span>
          <span className={styles.scoreSep}>/</span>
          <span className={styles.scoreTotal}>{total}</span>
        </span>
        <span className={styles.label}>{t('hab.today')}</span>
      </div>
      <div className={styles.track} role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%` }}
        />
      </div>
      {completed === total && total > 0 && (
        <div className={styles.complete}>{t('hab.perfectDay')}</div>
      )}
    </div>
  )
}
