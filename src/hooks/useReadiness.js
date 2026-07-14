import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calcReadiness } from './useSleepLogs'

function dateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export function useReadiness() {
  const { user, profile } = useAuth()
  const [state, setState] = useState({ score: null, components: [], loading: true })

  useEffect(() => {
    if (!user?.id) return
    const today     = dateStr(0)
    const yesterday = dateStr(1)
    const weekAgo   = dateStr(6)

    Promise.all([
      // Recovery: today's sleep log
      supabase.from('sleep_logs').select('quality,energy,stress,soreness,mood')
        .eq('user_id', user.id).eq('date', today).maybeSingle(),
      // Nutrition: yesterday's food (fueling for today)
      supabase.from('food_logs').select('kcal,protein')
        .eq('user_id', user.id).eq('date', yesterday),
      // Habits: today's completions
      supabase.from('habit_completions').select('habit_id,completed')
        .eq('user_id', user.id).eq('date', today),
      // Hydration: today's water
      supabase.from('water_logs').select('glasses')
        .eq('user_id', user.id).eq('log_date', today).maybeSingle(),
      // Training: distinct workout days in last 7 days
      Promise.all([
        supabase.from('exercise_logs').select('completed_date')
          .eq('user_id', user.id).gte('completed_date', weekAgo),
        supabase.from('workout_completions').select('completed_date')
          .eq('user_id', user.id).gte('completed_date', weekAgo),
      ]),
    ]).then(([sleepRes, foodRes, habitsRes, waterRes, [exRes, woRes]]) => {
      const sleepLog = sleepRes.data
      const foods    = foodRes.data  || []
      const habits   = habitsRes.data || []
      const water    = waterRes.data?.glasses ?? 0
      const workoutDays = new Set([
        ...(exRes.data  || []).map(r => r.completed_date),
        ...(woRes.data  || []).map(r => r.completed_date),
      ]).size

      // ── Recovery (35%) ─────────────────────────────────────────
      const recoveryScore = calcReadiness(sleepLog) // null if not logged

      // ── Nutrition (25%) — yesterday's fueling vs targets ───────
      const kcalTarget    = profile?.calories ?? 0
      const proteinTarget = profile?.protein  ?? 0
      let nutritionScore  = null
      if (kcalTarget > 0 || proteinTarget > 0) {
        const totalKcal    = foods.reduce((s, f) => s + (f.kcal    || 0), 0)
        const totalProtein = foods.reduce((s, f) => s + (f.protein || 0), 0)
        const parts = []
        if (kcalTarget    > 0) parts.push(Math.min(1, totalKcal    / kcalTarget))
        if (proteinTarget > 0) parts.push(Math.min(1, totalProtein / proteinTarget))
        nutritionScore = Math.round(parts.reduce((s, v) => s + v, 0) / parts.length * 100)
      }

      // ── Habits (20%) — today's progress ────────────────────────
      const totalHabits = habits.length
      const doneHabits  = habits.filter(h => h.completed).length
      const habitsScore = totalHabits > 0 ? Math.round(doneHabits / totalHabits * 100) : null

      // ── Hydration (15%) — today vs 8-glass target ──────────────
      const hydrationScore = Math.round(Math.min(1, water / 8) * 100)

      // ── Training (5%) — consistency: target 4 days/week ────────
      const trainingScore = Math.min(100, Math.round((workoutDays / 4) * 100))

      const components = [
        { id: 'recovery',  label: 'ВЪЗСТАНОВЯВАНЕ', score: recoveryScore,  weight: 0.35, color: '#81C784' },
        { id: 'nutrition', label: 'ХРАНЕНЕ (ВЧЕРА)', score: nutritionScore, weight: 0.25, color: '#ffb74d' },
        { id: 'habits',    label: 'НАВИЦИ',           score: habitsScore,    weight: 0.20, color: '#AB47BC' },
        { id: 'hydration', label: 'ХИДРАТАЦИЯ',       score: hydrationScore, weight: 0.15, color: '#42A5F5' },
        { id: 'training',  label: 'ТРЕНИРОВКИ (7д)',  score: trainingScore,  weight: 0.05, color: '#66BB6A' },
      ]

      // Weighted average — null scores are excluded, weights renormalized
      const available   = components.filter(c => c.score !== null)
      const totalWeight = available.reduce((s, c) => s + c.weight, 0)
      const score       = available.length
        ? Math.round(available.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight)
        : null

      setState({ score, components, loading: false })
    })
  }, [user?.id, profile?.calories, profile?.protein])

  return state
}
