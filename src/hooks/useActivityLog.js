import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { tr } from '../utils/locale'
import { useAuth } from '../contexts/AuthContext'

export const MET_ACTIVITIES = [
  { id: 'run',      labelKey: 'activity.run',            met: 8.0 },
  { id: 'walk',     labelKey: 'activity.walk',             met: 3.5 },
  { id: 'bike',     labelKey: 'activity.bike',         met: 6.0 },
  { id: 'swim',     labelKey: 'activity.swim',            met: 7.0 },
  { id: 'weights',  labelKey: 'activity.weights',    met: 4.0 },
  { id: 'hiit',     labelKey: 'activity.hiit',               met: 8.5 },
  { id: 'jump',     labelKey: 'activity.jump',       met: 10.0 },
  { id: 'yoga',     labelKey: 'activity.yoga',               met: 3.0 },
  { id: 'stretch',  labelKey: 'activity.stretch',          met: 2.5 },
  { id: 'cardio',   labelKey: 'activity.cardio',      met: 5.0 },
  { id: 'elliptic', labelKey: 'activity.elliptic',           met: 5.5 },
  { id: 'rowing',   labelKey: 'activity.rowing',      met: 7.0 },
  { id: 'soccer',   labelKey: 'activity.soccer',             met: 7.0 },
  { id: 'bball',    labelKey: 'activity.bball',          met: 6.5 },
  { id: 'tennis',   labelKey: 'activity.tennis',              met: 7.0 },
  { id: 'dance',    labelKey: 'activity.dance',              met: 5.0 },
  { id: 'martial',  labelKey: 'activity.martial',     met: 6.0 },
  { id: 'stairs',   labelKey: 'activity.stairs',             met: 4.0 },
  { id: 'hike',     labelKey: 'activity.hike',   met: 5.5 },
  { id: 'skating',  labelKey: 'activity.skating',     met: 7.0 },
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
    if (!act || !session) return { error: new Error(tr('al.errNoActivity')) }
    const weightKg = profile?.weight_kg ?? 75
    const kcalBurned = calcKcal(act.met, weightKg, durationMin)
    const { data, error } = await supabase
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
    if (error) console.error('activity_logs insert:', error)
    if (data) setActivities(prev => [...prev, data])
    return { error }
  }

  async function removeActivity(id) {
    await supabase.from('activity_logs').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  return { activities, totalKcalBurned, addActivity, removeActivity }
}
