import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { defaultHabits } from '../data/appData'
import { useSettings } from '../contexts/SettingsContext'

/**
 * Всичко, което наградите броят — сметнато веднъж, от цялото минало.
 *
 * Тегли се само по едно поле от всяка таблица: датите и калориите. Цяла
 * година вписване са няколко хиляди реда по едно число, а страницата се
 * отваря рядко — по-скъпо би било да се пази отделна таблица с награди,
 * която да се разминава с истината при първата промяна на целта.
 */
export function useAwardStats() {
  const { user, profile } = useAuth()
  const { t } = useSettings()
  const uid = user?.id
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  const target = profile?.calories || 0
  const habitCount = (profile?.habits?.length > 0 ? profile.habits : defaultHabits(t)).length

  useEffect(() => {
    if (!uid) return
    let alive = true
    setLoading(true)

    Promise.all([
      supabase.from('food_logs').select('date, kcal').eq('user_id', uid),
      supabase.from('habit_completions').select('date, completed').eq('user_id', uid),
      supabase.from('workout_completions').select('completed_date').eq('user_id', uid),
      supabase.from('exercise_logs').select('completed_date').eq('user_id', uid),
    ]).then(([food, hab, wo, ex]) => {
      if (!alive) return

      const kcalByDay = {}
      for (const r of food.data || []) kcalByDay[r.date] = (kcalByDay[r.date] || 0) + (r.kcal || 0)

      const habByDay = {}
      for (const r of hab.data || []) if (r.completed) habByDay[r.date] = (habByDay[r.date] || 0) + 1

      const trained = new Set()
      for (const r of [...(wo.data || []), ...(ex.data || [])]) {
        if (r.completed_date) trained.add(r.completed_date)
      }

      /* Ден се брои за активен, ако в него има вписано каквото и да е. Това е
         и денят, който държи низа — виж RewardsContext, където важи същото. */
      const active = new Set([
        ...Object.keys(kcalByDay),
        ...Object.keys(habByDay),
        ...trained,
      ])

      const calorieDays = Object.entries(kcalByDay)
        .filter(([, k]) => target > 0 && k / target >= 0.8).length
      const habitDays = Object.values(habByDay)
        .filter(n => habitCount > 0 && n >= habitCount).length

      let perfectDays = 0
      for (const d of active) {
        const cal = target > 0 && (kcalByDay[d] || 0) / target >= 0.8
        const hb  = habitCount > 0 && (habByDay[d] || 0) >= habitCount
        if (cal && hb && trained.has(d)) perfectDays++
      }

      setStats({
        activeDays:    active.size,
        longestStreak: longestRun(active),
        trainingDays:  trained.size,
        calorieDays,
        habitDays,
        perfectDays,
        firstDate:     [...active].sort()[0] || null,
      })
      setLoading(false)
    })

    return () => { alive = false }
  }, [uid, target, habitCount])

  return { stats, loading }
}

/**
 * Най-дългата непрекъсната редица дни в множеството.
 *
 * Сортира и брои разстоянията, вместо да пита за всеки ден назад: при триста
 * дни разликата е между един обход и триста търсения, а отговорът е същият.
 */
function longestRun(days) {
  const sorted = [...days].sort()
  let best = 0, run = 0, prev = null
  for (const d of sorted) {
    const cur = Date.parse(d + 'T12:00:00')
    run = prev !== null && Math.round((cur - prev) / 86400000) === 1 ? run + 1 : 1
    prev = cur
    if (run > best) best = run
  }
  return best
}
