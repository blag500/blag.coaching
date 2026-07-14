import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTaskSuggestions() {
  const { user, profile } = useAuth()
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!user?.id) return
    generate()
  }, [user?.id])

  async function generate() {
    const today     = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const ago3days  = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)

    const [exerciseRes, workoutRes, foodRes, waterRes] = await Promise.all([
      supabase.from('exercise_logs').select('completed_date')
        .eq('user_id', user.id).gte('completed_date', ago3days).limit(1),
      supabase.from('workout_completions').select('completed_date')
        .eq('user_id', user.id).gte('completed_date', ago3days).limit(1),
      supabase.from('food_logs').select('kcal')
        .eq('user_id', user.id).eq('date', yesterday),
      supabase.from('water_logs').select('glasses')
        .eq('user_id', user.id).eq('log_date', today).maybeSingle(),
    ])

    const result = []

    const hasTraining = exerciseRes.data?.length > 0 || workoutRes.data?.length > 0
    if (!hasTraining) {
      result.push({
        id:       'train',
        text:     'Не си тренирал последните 3 дни',
        icon:     '🏋️',
        priority: 2,
        due_date: today,
      })
    }

    const kcalYesterday = (foodRes.data ?? []).reduce((s, r) => s + (r.kcal || 0), 0)
    const kcalTarget    = profile?.calories ?? 2000
    if (kcalYesterday < kcalTarget * 0.75) {
      result.push({
        id:       'nutrition',
        text:     'Калориите вчера бяха под 75% от целта',
        icon:     '🥗',
        priority: 1,
        due_date: today,
      })
    }

    const glasses = waterRes.data?.glasses ?? 0
    if (glasses < 6) {
      result.push({
        id:       'water',
        text:     `Изпил си само ${glasses} от 8 чаши вода`,
        icon:     '💧',
        priority: 1,
        due_date: today,
      })
    }

    setSuggestions(result)
  }

  function dismiss(id) {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  return { suggestions, dismiss }
}
