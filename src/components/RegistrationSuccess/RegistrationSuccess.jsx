import { CheckIcon, TargetIcon } from '../Onboarding/StepIcons'
import styles from './RegistrationSuccess.module.css'

/**
 * The screen that closes registration: a single quiet confirmation that the
 * profile is set and the app is theirs. Shown by App the moment the self-serve
 * flow finishes, before the tabs appear — a beat to land on rather than being
 * dropped straight into the nutrition page.
 *
 * `ready` follows the actual save. The button waits for it so a fast tap can't
 * enter the app a frame before the profile is written.
 */
export default function RegistrationSuccess({ name, calories, goal, ready, onEnter }) {
  const first = (name || '').trim().split(/\s+/)[0]

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.center}>
        <span className={styles.mark}><CheckIcon /></span>

        <h1 className={styles.heading}>
          {first ? `Готов си, ${first}.` : 'Готов си.'}
        </h1>
        <p className={styles.sub}>
          Профилът ти е настроен и целите ти са изчислени. Приложението вече
          работи за теб.
        </p>

        {ready && calories > 0 && (
          <span className={styles.chip}>
            <span className={styles.chipIcon}><TargetIcon /></span>
            {calories} ккал дневно{goal ? ` · ${goal}` : ''}
          </span>
        )}
      </div>

      <div className={styles.foot}>
        <button
          className={styles.cta}
          onClick={onEnter}
          disabled={!ready}
          type="button"
        >
          {ready ? 'КЪМ ПРИЛОЖЕНИЕТО' : 'НАСТРОЙВАМЕ...'}
        </button>
      </div>
    </div>
  )
}
