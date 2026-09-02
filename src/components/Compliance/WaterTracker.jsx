import { useWaterLog } from '../../hooks/useWaterLog'
import { haptic } from '../../lib/haptics'
import styles from './WaterTracker.module.css'
import { useSettings } from '../../contexts/SettingsContext'

const GLASS_TARGET = 8

export default function WaterTracker() {
  const { t } = useSettings()
  const { glasses, add } = useWaterLog(GLASS_TARGET)

  const pct = Math.min(glasses / GLASS_TARGET, 1)

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.labelRow}>
          <span className={styles.title}>{t('wt.title')}</span>
          <span className={styles.count}>
            <span className={styles.countVal}>{glasses}</span>
            <span className={styles.countTarget}>{t('wt.target', { n: GLASS_TARGET })}</span>
          </span>
        </div>

        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
        </div>
      </div>

      <div className={styles.glasses}>
        {Array.from({ length: GLASS_TARGET }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.glass} ${i < glasses ? styles.glassFull : ''}`}
            onClick={() => { haptic('toggle'); add(i < glasses ? -(glasses - i) : i + 1 - glasses) }}
            aria-label={t('wt.glassAria', { n: i + 1 })}
          >
            <GlassIcon filled={i < glasses} />
          </button>
        ))}

        {glasses > GLASS_TARGET && (
          <span className={styles.extra}>+{glasses - GLASS_TARGET}</span>
        )}
      </div>

      <div className={styles.btns}>
        <button type="button" className={styles.btn} onClick={() => { haptic('tap'); add(-1) }} disabled={glasses === 0} aria-label={t('wt.less')}>
          −
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnAdd}`} onClick={() => { haptic('toggle'); add(1) }} aria-label={t('wt.moreAria')}>
          {t('wt.more')}
        </button>
      </div>
    </div>
  )
}

function GlassIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M5 3h14l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 3z"
        stroke={filled ? '#42A5F5' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'rgba(66,165,245,0.25)' : 'none'}
      />
      {filled && (
        <path
          d="M6.5 13h11"
          stroke="#42A5F5"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      )}
    </svg>
  )
}
