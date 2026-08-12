import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calcReadiness } from './useSleepLogs'
import { RECOVERY_H, GROUP_LABELS, GROUP_COLORS, classifyMuscle } from '../utils/recovery'

function dateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

// How far back the personal baseline looks, and how many check-ins it needs
// before it is trusted. Short enough to follow a training block rather than
// average a whole season, long enough not to swing on two bad nights.
const BASELINE_DAYS = 14
const BASELINE_MIN  = 5

/**
 * Which of the five answers pulled the check-in down.
 *
 * "Recovery is below your normal" is a result, not a reason, and a result you
 * cannot act on is just a worse mood. The five inputs are already there — this
 * names the ones that are actually low, so the card can say what happened
 * rather than only that something did.
 */
const RECOVERY_FACTORS = [
  { id: 'quality',  invert: false },
  { id: 'energy',   invert: false },
  { id: 'stress',   invert: true  },  // high stress is bad
  { id: 'soreness', invert: true  },
  { id: 'mood',     invert: false },
]

function weakFactors(log) {
  if (!log) return []
  return RECOVERY_FACTORS
    .map(f => {
      const raw = log[f.id]
      if (!raw) return null
      const v = f.invert ? 6 - raw : raw     // onto the same 1..5 "good" scale
      return { id: f.id, value: v }
    })
    .filter(f => f && f.value <= 2)          // 1 or 2 out of 5 is a real complaint
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map(f => f.id)
}

// Pass a `client` object { id, calories, protein } to view a specific user's readiness (coach view).
// Omit it (or pass null) to view the logged-in user's own readiness.
export function useReadiness(client = null) {
  const { user, profile } = useAuth()
  const uid     = client?.id       ?? user?.id
  const calTgt  = client?.calories ?? profile?.calories
  const protTgt = client?.protein  ?? profile?.protein

  const [state, setState] = useState({
    score: null, components: [], muscleGroups: [],
    provisional: true, covered: 0, personalised: false, checkins: 0,
    weakFactors: [], loading: true,
  })

  useEffect(() => {
    if (!uid) return
    const today     = dateStr(0)
    const yesterday = dateStr(1)
    const weekAgo   = dateStr(6)

    Promise.all([
      // Today's check-in plus the fortnight behind it, in one query — the tail
      // is what today gets compared against.
      supabase.from('sleep_logs').select('date,quality,energy,stress,soreness,mood')
        .eq('user_id', uid).gte('date', dateStr(BASELINE_DAYS)).order('date', { ascending: false }),
      supabase.from('food_logs').select('kcal,protein')
        .eq('user_id', uid).eq('date', yesterday),
      // Yesterday, like nutrition and hydration. Measured on today, habits read
      // 0% at breakfast and 100% by bedtime, so the score climbed through the
      // day for reasons that have nothing to do with how ready you are.
      supabase.from('habit_completions').select('habit_id,completed')
        .eq('user_id', uid).eq('date', yesterday),
      supabase.from('water_logs').select('glasses')
        .eq('user_id', uid).eq('log_date', yesterday).maybeSingle(),
      Promise.all([
        supabase.from('exercise_logs').select('block_label,completed_date')
          .eq('user_id', uid).gte('completed_date', weekAgo),
        supabase.from('workout_completions').select('block_label,completed_date')
          .eq('user_id', uid).gte('completed_date', weekAgo),
      ]),
    ]).then(([sleepRes, foodRes, habitsRes, waterRes, [exRes, woRes]]) => {
      const sleepRows = sleepRes.data || []
      const sleepLog  = sleepRows.find(r => r.date === today) ?? null
      const foods    = foodRes.data   || []
      const habits   = habitsRes.data || []
      const water    = waterRes.data?.glasses ?? 0

      const allWorkouts = [
        ...(exRes.data || []),
        ...(woRes.data || []),
      ]
      const workoutDays = new Set(allWorkouts.map(r => r.completed_date)).size

      // ── Muscle group readiness ──────────────────────────────────────
      // Find the most recent training date per muscle group
      const groupLastMs = {}
      allWorkouts.forEach(w => {
        const g  = classifyMuscle(w.block_label)
        if (!g) return
        const ms = new Date(w.completed_date).getTime()
        if (!groupLastMs[g] || ms > groupLastMs[g]) groupLastMs[g] = ms
      })

      const now = Date.now()
      const muscleGroups = Object.keys(GROUP_LABELS)
        .filter(g => groupLastMs[g])
        .map(g => {
          const hours = (now - groupLastMs[g]) / 3_600_000
          const pct   = Math.min(100, Math.round((hours / RECOVERY_H[g]) * 100))
          const color = pct >= 80 ? '#81C784' : pct >= 55 ? 'var(--accent)' : '#ef5350'
          return {
            group: g,
            label: GROUP_LABELS[g],
            accentColor: GROUP_COLORS[g],
            pct,
            hours: Math.round(hours),
            color,
          }
        })

      // ── Recovery (35%) ─────────────────────────────────────────
      const rawToday = calcReadiness(sleepLog)      // null if not logged
      const history  = sleepRows
        .filter(r => r.date !== today)
        .map(calcReadiness)
        .filter(v => v !== null)

      const relative      = relativeToBaseline(rawToday, history)
      const personalised  = relative !== null
      // Until there is enough history the absolute reading stands in, and the
      // widget says which of the two it is rather than quietly switching.
      const recoveryScore = personalised ? relative : rawToday

      // ── Nutrition (25%) — yesterday's fueling vs targets ───────
      const kcalTarget    = calTgt  ?? 0
      const proteinTarget = protTgt ?? 0
      let nutritionScore  = null
      if (kcalTarget > 0 || proteinTarget > 0) {
        const totalKcal    = foods.reduce((s, f) => s + (f.kcal    || 0), 0)
        const totalProtein = foods.reduce((s, f) => s + (f.protein || 0), 0)
        const parts = []
        if (kcalTarget    > 0) parts.push(Math.min(1, totalKcal    / kcalTarget))
        if (proteinTarget > 0) parts.push(Math.min(1, totalProtein / proteinTarget))
        nutritionScore = Math.round(parts.reduce((s, v) => s + v, 0) / parts.length * 100)
      }

      // ── Habits (20%) — yesterday's completion ──────────────────
      const totalHabits = habits.length
      const doneHabits  = habits.filter(h => h.completed).length
      const habitsScore = totalHabits > 0 ? Math.round(doneHabits / totalHabits * 100) : null

      // ── Hydration (15%) — yesterday vs 8-glass target ──────────
      const hydrationScore = Math.round(Math.min(1, water / 8) * 100)

      // ── Training (5%) — consistency: target 4 days/week ────────
      const trainingScore = Math.min(100, Math.round((workoutDays / 4) * 100))

      const components = [
        { id: 'recovery',  label: 'ВЪЗСТАНОВЯВАНЕ',      score: recoveryScore,  weight: 0.35, color: '#81C784' },
        { id: 'nutrition', label: 'ХРАНЕНЕ (ВЧЕРА)',      score: nutritionScore, weight: 0.25, color: 'var(--accent)' },
        { id: 'habits',    label: 'НАВИЦИ',               score: habitsScore,    weight: 0.20, color: '#AB47BC' },
        { id: 'hydration', label: 'ХИДРАТАЦИЯ (ВЧЕРА)',   score: hydrationScore, weight: 0.15, color: '#42A5F5' },
        { id: 'training',  label: 'ТРЕНИРОВКИ (7д)',      score: trainingScore,  weight: 0.05, color: '#66BB6A' },
      ]

      // Weighted average — null scores are excluded, weights renormalized
      const available   = components.filter(c => c.score !== null)
      const totalWeight = available.reduce((s, c) => s + c.weight, 0)
      const score       = available.length
        ? Math.round(available.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight)
        : null

      // Renormalising keeps the arithmetic sound but hides how much of the
      // model is missing. Recovery is the only component that asks how you
      // actually feel — sleep, energy, stress, soreness — and it is 35% of the
      // weight. Without it the rest is a summary of what you logged, not a
      // reading of how ready you are, so the number is reported as provisional
      // rather than dressed up as a verdict.
      const provisional = recoveryScore === null
      const covered     = available.length

      setState({
        score, components, muscleGroups, provisional, covered,
        personalised, checkins: history.length + (rawToday !== null ? 1 : 0),
        weakFactors: weakFactors(sleepLog),
        loading: false,
      })
    })
  }, [uid, calTgt, protTgt])

  return state
}
