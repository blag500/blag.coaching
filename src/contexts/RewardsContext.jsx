import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { haptic } from '../lib/haptics'
import { useAuth } from './AuthContext'
import BadgePopup from '../components/TodayDashboard/BadgePopup'

/**
 * Наградите на деня — на едно място.
 *
 * Дотук откриването и показването живееха вътре в таблото. Значи наградата
 * се появяваше само ако човекът гледа таблото, а той не го гледа: калориите
 * се достигат в ХРАНЕНЕ, тренировката се отчита в ТРЕНИРОВКА. Награда, която
 * се показва някъде другаде, а не там, където е спечелена, е награда, която
 * никой не вижда.
 *
 * Затова тук стои какво значи „заслужена" и как изглежда, а екраните само
 * казват какво знаят: report('calories', вярно ли е). Всеки от тях вече държи
 * тази истина — храненето знае калориите, навиците знаят себе си — и никой не
 * прави заявка втори път само за да я каже.
 */

const Ctx = createContext(null)

/** Кой ден е — наградата е дневна и се дава веднъж на ден. */
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function shiftIso(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const STREAK_WINDOW = 180        // докъде назад се брои
const STREAK_CACHE  = 'blag_streak'

/**
 * Колко дни подред.
 *
 * Брои дните, в които има вписано нещо — храна, навик или тренировка — а не
 * голото отваряне на приложението. Две причини: отваряне без нищо вписано не
 * е ден, с който човек би се гордял, и по-важното — така низът важи от днес
 * за всички, вместо всеки да започва от нула в деня, в който сме го добавили.
 * Отварянията не са записвани никъде, значи няма и минало, което да се брои.
 *
 * Днешният ден не къса низа, докато още не си вписал нищо: денят не е свършил.
 * Иначе всяка сутрин низът щеше да пада на нула и да се връща следобед.
 *
 * Сметката е веднъж на ден на устройство. Числото не се мени по средата на
 * деня освен с първото вписване, а три заявки при всяко отваряне заради една
 * значка в лентата не си струват.
 */
function useStreak() {
  const { user } = useAuth()
  const uid = user?.id
  const [streak, setStreak] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(STREAK_CACHE) || 'null')
      return c && c.date === todayKey() ? c.value : 0
    } catch { return 0 }
  })

  useEffect(() => {
    if (!uid) return
    try {
      const c = JSON.parse(localStorage.getItem(STREAK_CACHE) || 'null')
      if (c && c.date === todayKey() && c.uid === uid) { setStreak(c.value); return }
    } catch { /* сметката пак ще се направи */ }

    let alive = true
    const from = shiftIso(STREAK_WINDOW)

    Promise.all([
      supabase.from('food_logs').select('date').eq('user_id', uid).gte('date', from),
      supabase.from('habit_completions').select('date').eq('user_id', uid).eq('completed', true).gte('date', from),
      supabase.from('workout_completions').select('completed_date').eq('user_id', uid).gte('completed_date', from),
    ]).then(([food, hab, wo]) => {
      if (!alive) return
      const active = new Set()
      for (const r of food.data || []) active.add(r.date)
      for (const r of hab.data  || []) active.add(r.date)
      for (const r of wo.data   || []) active.add(r.completed_date)

      let n = 0
      // Започва от вчера, ако днес е още празен: денят не е свършил и не е
      // редно недовършеното да брои за скъсано.
      let i = active.has(shiftIso(0)) ? 0 : 1
      while (i < STREAK_WINDOW && active.has(shiftIso(i))) { n++; i++ }

      setStreak(n)
      try {
        localStorage.setItem(STREAK_CACHE, JSON.stringify({ date: todayKey(), uid, value: n }))
      } catch { /* частен режим */ }
    })

    return () => { alive = false }
  }, [uid])

  return streak
}

export function RewardsProvider({ children }) {
  const [queue, setQueue] = useState([])
  // Последното, което всеки екран е казал. Оттук се вади и перфектният ден:
  // той не е отделно събитие, а трите заедно.
  const said = useRef({})

  const award = useCallback(type => {
    const k = `blag_badge_${type}_${todayKey()}`
    try {
      if (localStorage.getItem(k)) return
      localStorage.setItem(k, '1')
    } catch { /* частен режим — наградата минава, паметта не */ }
    setQueue(q => [...q, type])
    haptic('celebrate')
  }, [])

  /**
   * Екран съобщава какво знае.
   *
   * Дава се само при преминаване от „не" към „да", видяно в тази сесия.
   * Първото съобщаване само запомня: човек, който отваря приложението върху
   * вече изпълнен ден, не е постигнал нищо в този момент, а празненство при
   * всяко отваряне спира да значи каквото и да е било още на третия път.
   */
  const report = useCallback((key, done, ready = true) => {
    /* Незнанието не се записва. Мрежата отговаря след първото рисуване, значи
       „нула калории" в началото не е факт, а липса на отговор — а ако се
       запише като факт, зареждането на вече изпълнен ден изглежда като
       постижение и наградата изскача при всяко отваряне. */
    if (!ready) return

    const was = said.current[key]
    said.current[key] = done
    if (was === undefined || !done || was) return

    award(key)
    const s = said.current
    if (s.calories && s.habits && s.training) award('perfect')
  }, [award])

  const streak = useStreak()

  const value = { report, award, streak }

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* През портал към body: вътре в табовете има трансформация за суайпа,
          а position: fixed под трансформиран предшественик се закача за него
          вместо за екрана. */}
      {queue[0] && createPortal(
        <BadgePopup
          badge={queue[0]}
          onDone={() => setQueue(q => q.slice(1))}
        />,
        document.body,
      )}
    </Ctx.Provider>
  )
}

export function useRewards() {
  return useContext(Ctx) ?? { report: () => {}, award: () => {}, streak: 0 }
}
