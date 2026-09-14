import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './BadgeToast.module.css'

/* Рисуваният набор, не емоджита: те носят собствена палитра и собствен почерк
   и никога не седят вътре в дизайна, а върху него. */
const ICONS = { calories: 'kcal', habits: 'check', training: 'training', perfect: 'star', newday: 'flame' }

/* Три секунди. Колкото да се види и прочете, докато ръката прибира телефона —
   и недостатъчно, за да се превърне в нещо, което се чака да свърши. */
const LIFE_MS  = 3000
const LEAVE_MS = 260

/**
 * Спечелената награда, тихо.
 *
 * Преди това беше карта пред целия екран, която потъмняваше приложението и
 * стоеше, докато не бъде натисната. Логиката тогава беше „щом си струва да се
 * празнува, си струва едно натискане" — само че наградите тук са всекидневни:
 * отметнати навици, затворени калории, тренировка. Нещо, което се случва всеки
 * ден, не бива да спира деня, за да бъде отпразнувано, а човекът, който тъкмо
 * е отметнал последния си навик, обикновено натиска следващото нещо — и вместо
 * него натиска картата.
 *
 * Затова: лента отгоре, която сама си отива. Влиза плавно, стои три секунди,
 * излиза. Може да се натисне, за да си отиде веднага, но не иска да бъде
 * натисната.
 *
 * Мястото е горе, а не долу: долният край е зает от лентата с разделите и от
 * балончето на бота, а награда, която се появява върху палеца, се затваря по
 * невнимание.
 */
export default function BadgeToast({ badge, streak = 0, onDone }) {
  const { t } = useSettings()
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])

  useEffect(() => {
    /* Таймерите се чистят при смяна на наградата: две награди една след друга
       иначе си делят изхода и втората изчезва по-рано. */
    timers.current.forEach(clearTimeout)
    setLeaving(false)
    timers.current = [
      setTimeout(() => setLeaving(true), LIFE_MS),
      setTimeout(() => onDone(), LIFE_MS + LEAVE_MS),
    ]
    return () => timers.current.forEach(clearTimeout)
  }, [badge, onDone])

  if (!badge) return null

  /* Низът носи числото си в самия текст: отделен едър брояч искаше внимание,
     каквото лентата нарочно не иска. */
  const title = badge === 'newday' && streak > 1
    ? t('badge.newday.strip', { n: streak })
    : t(`badge.${badge}.label`)

  return (
    <div
      className={`${styles.wrap} ${leaving ? styles.leaving : ''}`}
      onClick={() => { setLeaving(true); timers.current.push(setTimeout(onDone, LEAVE_MS)) }}
      role="status"
      aria-live="polite"
    >
      <span className={`${styles.icon} ${badge === 'newday' ? styles.flame : ''}`}>
        <Pictogram name={ICONS[badge]} size={18} />
      </span>
      <span className={styles.text}>{title}</span>
    </div>
  )
}
