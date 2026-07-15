import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const KCAL_PER_KG = 7700

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso, n) {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function avgArr(arr) {
  if (!arr.length) return null
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10
}

// Build week-by-week targets from a given start point to competition
function buildWeeks(startDate, compDate, startWeight, targetWeight) {
  const start = new Date(startDate)
  const comp  = new Date(compDate)
  const totalDays  = Math.round((comp - start) / 86400000)
  if (totalDays <= 0) return { totalWeeks: 0, kgPerWeek: 0, dailyKcalDelta: 0, weeks: [] }

  const totalWeeks    = totalDays / 7
  const kgTotal       = startWeight - targetWeight   // positive = cutting
  const kgPerWeek     = kgTotal / totalWeeks
  const dailyKcalDelta = Math.round((kgPerWeek * KCAL_PER_KG) / 7)  // negative = deficit

  const count = Math.ceil(totalWeeks)
  const weeks = Array.from({ length: count }, (_, i) => {
    const ws = new Date(start)
    ws.setDate(start.getDate() + i * 7)
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    return {
      number:       i + 1,
      weeksOut:     count - i,
      weekStart:    ws.toISOString().slice(0, 10),
      weekEnd:      we.toISOString().slice(0, 10),
      targetWeight: Math.round((startWeight - kgPerWeek * (i + 1)) * 10) / 10,
    }
  })

  return { totalWeeks: count, kgPerWeek, dailyKcalDelta, weeks }
}

export function usePrepProtocol() {
  const { user, profile } = useAuth()
  const [prep,       setPrep]       = useState(null)
  const [weightLogs, setWeightLogs] = useState([])
  const [weekStats,  setWeekStats]  = useState(null)   // current week pull from other tabs
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: row } = await supabase
      .from('prep_protocols')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setPrep(row ?? null)

    if (row) {
      const { data: wl } = await supabase
        .from('weight_logs')
        .select('date, kg')
        .eq('user_id', user.id)
        .gte('date', row.start_date)
        .lte('date', row.competition_date)
        .order('date')
      setWeightLogs(wl ?? [])

      // Current week bounds for cross-tab stats
      const plan = buildWeeks(row.start_date, row.competition_date, row.start_weight, row.target_weight)
      const today = todayStr()
      const cw = plan.weeks.find(w => today >= w.weekStart && today <= w.weekEnd)
      if (cw) {
        const [foodRes, exRes, woRes, habRes] = await Promise.all([
          supabase.from('food_logs').select('date, kcal').eq('user_id', user.id)
            .gte('date', cw.weekStart).lte('date', cw.weekEnd),
          supabase.from('exercise_logs').select('completed_date').eq('user_id', user.id)
            .gte('completed_date', cw.weekStart).lte('completed_date', cw.weekEnd),
          supabase.from('workout_completions').select('completed_date').eq('user_id', user.id)
            .gte('completed_date', cw.weekStart).lte('completed_date', cw.weekEnd),
          supabase.from('habit_completions').select('completed').eq('user_id', user.id)
            .gte('date', cw.weekStart).lte('date', cw.weekEnd),
        ])

        const foods   = foodRes.data ?? []
        const calDays = new Set([...foods.map(f => f.date)]).size   // days with logs
        const kcalTarget = profile?.calories ?? 0
        const nutritionPct = kcalTarget > 0 && calDays > 0
          ? Math.round((foods.reduce((s, f) => s + (f.kcal ?? 0), 0) / calDays / kcalTarget) * 100)
          : null

        const trainDays = new Set([
          ...(exRes.data ?? []).map(r => r.completed_date),
          ...(woRes.data ?? []).map(r => r.completed_date),
        ]).size

        const habits   = habRes.data ?? []
        const habitPct = habits.length > 0
          ? Math.round(habits.filter(h => h.completed).length / habits.length * 100)
          : null

        setWeekStats({ nutritionPct, trainDays, habitPct })
      }
    }

    setLoading(false)
  }, [user?.id, profile?.calories])

  useEffect(() => { load() }, [load])

  // Derived plan with actuals merged in
  let plan = null
  if (prep) {
    plan = buildWeeks(prep.start_date, prep.competition_date, prep.start_weight, prep.target_weight)

    plan.weeks = plan.weeks.map(week => {
      const ww = weightLogs.filter(w => w.date >= week.weekStart && w.date <= week.weekEnd)
      return { ...week, avgWeight: avgArr(ww.map(w => w.kg)), entries: ww.length }
    })

    const today = todayStr()
    plan.currentWeek = plan.weeks.find(w => today >= w.weekStart && today <= w.weekEnd) ?? null
    plan.weeksOut    = plan.currentWeek?.weeksOut ?? null
    plan.dailyKcal   = prep.tdee ? prep.tdee - plan.dailyKcalDelta : null

    // Reforecast from latest logged weight
    const latest = weightLogs.at(-1)
    if (latest) {
      plan.latestWeight = latest.kg
      const rf = buildWeeks(today, prep.competition_date, latest.kg, prep.target_weight)
      plan.reforecastDailyKcal = prep.tdee ? prep.tdee - rf.dailyKcalDelta : null
      plan.reforecastKgPerWeek = rf.kgPerWeek

      // Trigger prompt if last full week was off by >0.2 kg
      const lastFull = [...plan.weeks].reverse().find(w => w.weekEnd < today && w.avgWeight !== null)
      if (lastFull) {
        const diff = lastFull.avgWeight - lastFull.targetWeight  // positive = behind (for cut)
        if (Math.abs(diff) > 0.2) {
          plan.reforecastNeeded = true
          plan.reforecastDiff   = Math.round(diff * 10) / 10
        }
      }
    }
  }

  async function createPrep(values) {
    if (!user) return { error: new Error('not logged in') }
    const { data, error } = await supabase
      .from('prep_protocols').insert({ user_id: user.id, ...values }).select().single()
    if (!error && data) { setPrep(data); setWeightLogs([]) }
    return { error }
  }

  async function updatePrep(updates) {
    if (!prep) return { error: new Error('no prep') }
    const { data, error } = await supabase
      .from('prep_protocols').update(updates).eq('id', prep.id).select().single()
    if (!error && data) setPrep(data)
    return { error }
  }

  async function endPrep() {
    if (!prep) return
    await supabase.from('prep_protocols').update({ active: false }).eq('id', prep.id)
    setPrep(null); setWeightLogs([]); setWeekStats(null)
  }

  async function logMorningWeight(kg) {
    if (!user) return { error: new Error('not logged in') }
    const d = todayStr()
    const { data, error } = await supabase
      .from('weight_logs')
      .upsert({ user_id: user.id, date: d, kg }, { onConflict: 'user_id,date' })
      .select().single()
    if (data) {
      setWeightLogs(prev => {
        const filtered = prev.filter(w => w.date !== d)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
    return { error }
  }

  // Apply reforecast: update start point to today's latest weight
  async function applyReforecast() {
    if (!prep || !plan?.latestWeight) return
    await updatePrep({ start_weight: plan.latestWeight, start_date: todayStr() })
    await load()
  }

  return {
    prep, plan, weightLogs, weekStats, loading,
    createPrep, updatePrep, endPrep, logMorningWeight, applyReforecast,
  }
}
