import { useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import Confetti from './Confetti'
import Pictogram from '../Pictogram/Pictogram'
import styles from './BadgePopup.module.css'

/* Рисуваният набор, не емоджита: те носят собствена палитра и собствен почерк
   и никога не седят вътре в дизайна, а върху него — това е причината
   Pictogram да съществува. */
const ICONS = { calories: 'kcal', habits: 'check', training: 'training', perfect: 'star' }

/**
 * Спечелената награда, отпред.
 *
 * Дотук беше лентичка долу, която сама си отиваше след две секунди и половина
 * — точно колкото да я подминеш. Ако нещо е достойно да се празнува, то е
 * достойно да поиска едно натискане: екранът потъмнява, наградата стои в
 * средата и си отива, когато човекът каже.
 *
 * Няма таймер нарочно. Наградата е рядка — по една на ден, най-много четири —
 * и не е известие, което да гони вниманието и да се маха учтиво.
 */
export default function BadgePopup({ badge, onDone }) {
  const { t } = useSettings()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  if (!badge) return null

  return (
    <div
      className={styles.scrim}
      onClick={onDone}
      role="dialog"
      aria-modal="true"
      aria-label={t(`badge.${badge}.label`)}
    >
      <div className={styles.popup}>
        <Confetti burst={badge} />
        <span className={styles.icon}><Pictogram name={ICONS[badge]} size={44} /></span>
        <span className={styles.label}>{t(`badge.${badge}.label`)}</span>
        <span className={styles.sub}>{t(`badge.${badge}.sub`)}</span>
        <span className={styles.hint}>{t('badge.dismiss')}</span>
      </div>
    </div>
  )
}
