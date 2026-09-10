import { useSettings } from '../../contexts/SettingsContext'
import styles from './WelcomeOverlay.module.css'
import Pictogram from '../Pictogram/Pictogram'

const STEP_KEYS = [
  { icon: 'kcal', key: 'nutrition'  },
  { icon: 'training', key: 'training'   },
  { icon: 'trend', key: 'progress'   },
  { icon: 'chat', key: 'messages'   },
  { icon: 'camera', key: 'mealphotos' },
  { icon: 'check', key: 'habits'     },
]

export default function WelcomeOverlay({ onDone }) {
  const { t } = useSettings()
  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{t('welcome.eyebrow')}</p>
        <h1 className={styles.logo}>BLAG</h1>
        <p className={styles.sub}>{t('welcome.sub')}</p>
        <ul className={styles.steps}>
          {STEP_KEYS.map(s => (
            <li key={s.key} className={styles.step}>
              <span className={styles.stepIcon}><Pictogram name={s.icon} size={22} /></span>
              <div>
                <p className={styles.stepLabel}>{t(`welcome.step.${s.key}.label`)}</p>
                <p className={styles.stepDesc}>{t(`welcome.step.${s.key}.desc`)}</p>
              </div>
            </li>
          ))}
        </ul>
        <button className={styles.cta} onClick={onDone} type="button">
          {t('welcome.cta')}
        </button>
      </div>
    </div>
  )
}
