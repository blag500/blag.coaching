import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * The last weight moved on each exercise, and whatever was logged on the day
 * being viewed.
 *
 * The training screen listed what you are meant to do and nothing about what
 * you did, so every set started from memory — which is the difference between
 * a spec sheet and a training log. One query for the whole page rather than one
 * per exercise: a block is ten rows and ten round trips on a phone is a stutter.
 */
export function useLastLifts(date) {
  const { user } = useAuth()
  const [byName, setByName] = useState({})

  const load = useCallback(() => {
    if (!user?.id) return
    supabase
      .from('exercise_logs')
      .select('exercise_name, date, weight, reps, sets')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(400)
      .then(({ data }) => {
        const map = {}
        for (const row of data ?? []) {
          const key = row.exercise_name
          if (!map[key]) map[key] = { today: null, last: null }
          if (row.date === date) {
            // Newest first, so the first hit on this date is the latest set.
            if (!map[key].today) map[key].today = row
          } else if (row.date < date && !map[key].last) {
            map[key].last = row
          }
        }
        setByName(map)
      })
  }, [user?.id, date])

  useEffect(() => { load() }, [load])

  return { byName, refresh: load }
}
