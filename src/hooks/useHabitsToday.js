import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { HABITS as DEFAULT_HABITS } from '../data/appData'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useHabitsToday() {
  const { user, profile } = useAuth()
  const [checked, setChecked] = useState({})

  // Use coach-assigned habits if set, otherwise fall back to defaults
  const habits = (profile?.habits && profile.habits.length > 0)
    ? profile.habits
    : DEFAULT_HABITS

  useEffect(() => {
    if (!user) return
    supabase
      .from('habit_completions')
      .select('habit_id, completed')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(r => { map[r.habit_id] = r.completed })
          setChecked(map)
        }
      })
  }, [user?.id])

  async function toggle(id) {
    if (!user) return
    const next = !checked[id]
    setChecked(prev => ({ ...prev, [id]: next }))
    await supabase.from('habit_completions').upsert(
      { user_id: user.id, date: todayStr(), habit_id: id, completed: next },
      { onConflict: 'user_id,date,habit_id' }
    )
  }

  return { habits, checked, toggle }
}
