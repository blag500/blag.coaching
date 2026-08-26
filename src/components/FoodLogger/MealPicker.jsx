import { MEALS } from './meals'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './MealPicker.module.css'

/**
 * The "which meal" row inside an add panel. Sits next to the macros and the add
 * button, so the meal is chosen at the moment of adding rather than set as a
 * mode somewhere above. Controlled: the value lives with whoever logs the food,
 * so a "+" on a section and this picker are the same choice.
 */
export default function MealPicker({ value, onChange }) {
  const { t } = useSettings()
  return (
    <div className={styles.row}>
      <span className={styles.label}>{t('nutr.toggle.log').toUpperCase()}</span>
      <div className={styles.pills}>
        {MEALS.map(m => (
          <button
            key={m.id}
            type="button"
            className={`${styles.pill} ${value === m.id ? styles.pillActive : ''}`}
            onClick={() => onChange(m.id)}
          >
            {t(m.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
