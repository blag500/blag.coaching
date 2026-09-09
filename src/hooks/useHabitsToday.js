import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { enqueue } from '../lib/outbox'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useHabitsToday() {
  const { user, profile } = useAuth()
  const [checked, setChecked] = useState({})
  /* Докато отметките не са дошли, „нищо не е отметнато" не е факт. */
  const [loading, setLoading] = useState(true)

  // Habits are personal — a new client sees an empty list and picks their own
  // in Profile. „Everyone's habits" was nobody's, so no default seed.
  const habits = (profile?.habits && profile.habits.length > 0)
    ? profile.habits
    : []

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
        setLoading(false)
      })
  }, [user?.id])

  async function toggle(id) {
    if (!user) return
    const next = !checked[id]
    setChecked(prev => ({ ...prev, [id]: next }))
    const row  = { user_id: user.id, date: todayStr(), habit_id: id, completed: next }
    const opts = { onConflict: 'user_id,date,habit_id' }
    const { error } = await supabase.from('habit_completions').upsert(row, opts)
    if (error) {
      /* Отметката остава сложена и чака. Навик, отметнат в метрото, е
         отметнат — а upsert по ключа е безопасен и на десетия опит. */
      console.warn('habit_completions отложен:', error)
      enqueue({ table: 'habit_completions', op: 'upsert', row, opts })
    }
  }

  return { habits, checked, toggle, loading }
}
