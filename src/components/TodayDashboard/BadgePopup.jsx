import { useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useCountUp } from '../../hooks/useCountUp'
import Confetti from './Confetti'
import Pictogram from '../Pictogram/Pictogram'
import styles from './BadgePopup.module.css'

/* Рисуваният набор, не емоджита: те носят собствена палитра и собствен почерк
   и никога не седят вътре в дизайна, а върху него — това е причината
   Pictogram да съществува. */
const ICONS = { calories: 'kcal', habits: 'check', training: 'training', perfect: 'star', newday: 'flame' }

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
export default function BadgePopup({ badge, streak = 0, onDone }) {
  const { t } = useSettings()

  /* Низът се брои нагоре пред очите.
   *
   * Числото е това, което човекът е събрал, а събраното не бива да го има
   * просто така, отпечатано. Броенето отнема три четвърти от секундата —
   * достатъчно да се види, че расте, и малко, че да не се чака.
   *
   * Хукът мълчи при изключено движение и при нула разлика, значи е безопасно
   * да се вика и за наградите, които нямат число. */
  const shownStreak = useCountUp(badge === 'newday' ? streak : 0, { duration: 750, delay: 260 })
  const counting = badge === 'newday' && streak > 1

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

        {/* Огънчето гори; останалите знаци стоят.
            Горенето е за низа, защото той е единственото, което продължава —
            другите три награди са за днешния ден и свършват с него. */}
        <span className={`${styles.icon} ${badge === 'newday' ? styles.iconFlame : ''}`}>
          <Pictogram name={ICONS[badge]} size={44} />
        </span>

        {counting ? (
          <>
            {/* Числото е заглавието. „Ден 121 подред", казано в изречение, го
                крие между думите — а то е цялата новина. */}
            <span className={styles.bigNum}>{shownStreak}</span>
            <span className={styles.label}>{t('badge.newday.days')}</span>
            <span className={styles.sub}>{t('badge.newday.keep')}</span>
          </>
        ) : (
          <>
            <span className={styles.label}>{t(`badge.${badge}.label`)}</span>
            <span className={styles.sub}>
              {badge === 'newday' ? t('badge.newday.subFirst') : t(`badge.${badge}.sub`)}
            </span>
          </>
        )}

        <span className={styles.hint}>{t('badge.dismiss')}</span>
      </div>
    </div>
  )
}
