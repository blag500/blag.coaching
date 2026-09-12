import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useRewards } from '../../contexts/RewardsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './PostSheet.module.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }

/**
 * Каквото приложението вече знае за деня ти.
 *
 * Постът „днес изкарах всички навици", написан на ръка, е същият пост — само
 * че с числа, преписани от друг екран, и с риск да са преписани грешно. Тук
 * човек избира кое от вече вписаното да покаже, а картата отсреща се рисува
 * от същата таблица, която рисува и автоматичните постижения: нов вид е ред
 * там плюс два ключа в речника, не четвърто разклонение в PostCard.
 *
 * Показват се само неща, които наистина ги има. Ред „0 от 6 навика" не е
 * новина, която някой би искал да сподели, а списък, пълен с угаснали редове,
 * е списък, който се затваря.
 */
export default function InsightPicker({ onPick, onClose }) {
  const { user } = useAuth()
  const { t } = useSettings()
  const { habits, checked } = useHabitsToday()
  const { todayEntry, trend } = useWeightLog()
  const { streak } = useRewards()

  /* Тренировката от днес.
     Броят е на различните движения, не на редовете: от миграция 079 всеки
     ред е един сет, значи три сета лицеви са три реда и „12 упражнения" би
     било четири. */
  const [workout, setWorkout] = useState(null)
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    supabase
      .from('exercise_logs')
      .select('exercise_name')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .then(({ data }) => {
        if (!alive || !data?.length) return
        const names = new Set(data.map(r => r.exercise_name))
        setWorkout({ exercises: names.size })
      })
    return () => { alive = false }
  }, [user?.id])

  const doneHabits = habits.filter(h => checked[h.id]).length

  const options = []

  if (workout) {
    options.push({
      id: 'training',
      icon: 'training',
      kind: 'training',
      meta: workout,
      labelKey: 'feed.share.training',
      detail: t('feed.ach.exercises', { n: workout.exercises }),
    })
  }

  if (doneHabits > 0) {
    options.push({
      id: 'habits',
      icon: 'check',
      kind: 'habits',
      meta: { done: doneHabits, total: habits.length },
      labelKey: 'feed.share.habits',
      detail: t('feed.ach.habitsOf', { n: doneHabits, m: habits.length }),
    })
  }

  if (streak > 1) {
    options.push({
      id: 'streak',
      icon: 'flame',
      kind: 'streak',
      meta: { days: streak },
      labelKey: 'feed.share.streak',
      detail: t('feed.ach.days', { n: streak }),
    })
  }

  if (todayEntry?.kg) {
    options.push({
      id: 'weight',
      icon: 'weight',
      kind: 'weight',
      meta: { kg: todayEntry.kg, trend },
      labelKey: 'feed.share.weight',
      detail: `${todayEntry.kg} ${t('unit.kg')}`,
    })
  }

  return createPortal(
    <div className={styles.pickScrim} onClick={onClose}>
      <div className={styles.pick} onClick={e => e.stopPropagation()}>
        <span className={styles.pickHead}>{t('feed.composer.fromApp')}</span>

        {options.length === 0 ? (
          <p className={styles.pickEmpty}>{t('feed.share.nothing')}</p>
        ) : options.map(o => (
          <button
            key={o.id}
            type="button"
            className={styles.pickRow}
            onClick={() => onPick(o)}
          >
            <span className={styles.pickIcon}><Pictogram name={o.icon} size={18} /></span>
            <span className={styles.pickText}>
              <span className={styles.pickTitle}>{t(o.labelKey)}</span>
              {o.detail && <span className={styles.pickDetail}>{o.detail}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}
