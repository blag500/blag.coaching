import { useSettings } from '../../contexts/SettingsContext'
import styles from './LangToggle.module.css'

/**
 * Малък BG / EN превключвател. Използва се на местата, до които посетителят
 * стига преди да е логнат — landing bar-a и auth screen-a. В Profile има свой,
 * по-подробен превключвател, който остава.
 *
 * variant="pill" (по подразбиране) — glass hover chip, за overlay-и на екрана.
 * variant="inline" — минимална версия за навигационни ленти.
 */
export default function LangToggle({ variant = 'pill' }) {
  const { lang, setLang } = useSettings()
  return (
    <div className={`${styles.wrap} ${styles[variant]}`} role="group" aria-label="Language">
      <button
        type="button"
        className={`${styles.opt} ${lang === 'bg' ? styles.active : ''}`}
        onClick={() => setLang('bg')}
        aria-pressed={lang === 'bg'}
      >
        BG
      </button>
      <span className={styles.sep} aria-hidden="true">/</span>
      <button
        type="button"
        className={`${styles.opt} ${lang === 'en' ? styles.active : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  )
}
