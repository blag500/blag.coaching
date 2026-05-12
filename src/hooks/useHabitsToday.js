import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useHabitsToday() {
  const { user } = useAuth()
  const [checked, setChecked] = useState({})

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

  return { checked, toggle }
}
