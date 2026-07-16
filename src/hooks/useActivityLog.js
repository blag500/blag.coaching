import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const MET_ACTIVITIES = [
  { id: 'run',      label: 'Бягане',            met: 8.0 },
  { id: 'walk',     label: 'Ходене',             met: 3.5 },
  { id: 'bike',     label: 'Колоездене',         met: 6.0 },
  { id: 'swim',     label: 'Плуване',            met: 7.0 },
  { id: 'weights',  label: 'Вдигане тежести',    met: 4.0 },
  { id: 'hiit',     label: 'HIIT',               met: 8.5 },
  { id: 'jump',     label: 'Скачане въже',       met: 10.0 },
  { id: 'yoga',     label: 'Йога',               met: 3.0 },
  { id: 'stretch',  label: 'Разтягане',          met: 2.5 },
  { id: 'cardio',   label: 'Кардио (общо)',      met: 5.0 },
  { id: 'elliptic', label: 'Елиптика',           met: 5.5 },
  { id: 'rowing',   label: 'Гребане (уред)',      met: 7.0 },
  { id: 'soccer',   label: 'Футбол',             met: 7.0 },
  { id: 'bball',    label: 'Баскетбол',          met: 6.5 },
  { id: 'tennis',   label: 'Тенис',              met: 7.0 },
  { id: 'dance',    label: 'Танци',              met: 5.0 },
  { id: 'martial',  label: 'Бойни изкуства',     met: 6.0 },
  { id: 'stairs',   label: 'Стълби',             met: 4.0 },
  { id: 'hike',     label: 'Планинско ходене',   met: 5.5 },
  { id: 'skating',  label: 'Ролери / скейт',     met: 7.0 },
]

export function calcKcal(met, weightKg, minutes) {
  return Math.round((met * 3.5 * weightKg * minutes) / 200)
}

function toDateStr(date) {
  if (!date) return new Date().toISOString().slice(0, 10)
  if (typeof date === 'string') return date.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

export function useActivityLog(date) {
  const { session, profile } = useAuth()
  const [activities, setActivities] = useState([])

  const dateStr = toDateStr(date)

  const fetch = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', dateStr)
      .order('created_at')
    setActivities(data ?? [])
  }, [session, dateStr])

  useEffect(() => { fetch() }, [fetch])

  const totalKcalBurned = activities.reduce((s, a) => s + a.kcal_burned, 0)

  async function addActivity(activityId, durationMin) {
    const act = MET_ACTIVITIES.find(a => a.id === activityId)
    if (!act || !session) return
    const weightKg = profile?.weight_kg ?? 75
    const kcalBurned = calcKcal(act.met, weightKg, durationMin)
    const { data } = await supabase
      .from('activity_logs')
      .insert({
        user_id:      session.user.id,
        date:         dateStr,
        activity:     act.label,
        duration_min: durationMin,
        kcal_burned:  kcalBurned,
      })
      .select()
      .single()
    if (data) setActivities(prev => [...prev, data])
  }

  async function removeActivity(id) {
    await supabase.from('activity_logs').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  return { activities, totalKcalBurned, addActivity, removeActivity }
}
