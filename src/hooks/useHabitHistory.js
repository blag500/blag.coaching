import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { HABITS } from '../data/appData'

export function useHabitHistory() {
  const { user } = useAuth()
  const [historyMap, setHistoryMap] = useState(new Map())

  useEffect(() => {
    if (!user) return
    supabase
      .from('habit_completions')
      .select('date, completed')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return
        const map = new Map()
        data.forEach(({ date, completed }) => {
          if (!map.has(date)) map.set(date, { completed: 0, total: HABITS.length })
          if (completed) map.get(date).completed++
        })
        setHistoryMap(map)
      })
  }, [user?.id])

  return historyMap
}
