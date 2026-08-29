import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const KCAL_PER_KG = 7700

/* Датите се смятат в местно време, не през UTC.
   `new Date().toISOString().slice(0,10)` дава вчерашния ден за всеки, който е
   източно от Гринуич, до към 3 сутринта — а сутрешното тегло се мери точно
   тогава. Същият капан вече е описан в recovery.js; тук просто не е избегнат. */
export function todayStr() {
  return isoOf(new Date())
}

export function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ден от YYYY-MM-DD в местно време. `new Date('2026-08-29')` е UTC полунощ. */
export function dayFromIso(s) {
  if (!s) return null
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso, n) {
  const d = dayFromIso(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

function avgArr(arr) {
  if (!arr.length) return null
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10
}

/**
 * Базовият обмен по Mifflin–St Jeor, и дневният разход над него.
 *
 * Живее тук, защото два екрана го смятат: формулярът предлага TDEE при
 * започване, а протоколът го ползва като под на калориите. Две копия на една
 * формула се разминават до месец.
 */
export function bmrFor(profile) {
  const { gender, age, height_cm, weight_kg } = profile ?? {}
  if (!gender || !age || !height_cm || !weight_kg) return null
  return Math.round(gender === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161)
}

const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }

export function tdeeFor(profile) {
  const bmr = bmrFor(profile)
  return bmr ? Math.round(bmr * (ACTIVITY[profile?.activity_level] ?? 1.55)) : null
}

// Build week-by-week targets from a given start point to competition
function buildWeeks(startDate, compDate, startWeight, targetWeight) {
  const start = dayFromIso(startDate)
  const comp  = dayFromIso(compDate)
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
      weekStart:    isoOf(ws),
      weekEnd:      isoOf(we),
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
          // Колоната е `date`. Дотук пишеше `completed_date`, което в тази
          // таблица я няма — заявката гърмеше тихо, `data` идваше празно, и
          // тренировките се броеха само от отбелязаните дни. Вдигнати сети
          // без тикване „готово" изчезваха от седмицата.
          supabase.from('exercise_logs').select('date').eq('user_id', user.id)
            .gte('date', cw.weekStart).lte('date', cw.weekEnd),
          supabase.from('workout_completions').select('completed_date').eq('user_id', user.id)
            .gte('completed_date', cw.weekStart).lte('completed_date', cw.weekEnd),
          supabase.from('habit_completions').select('completed').eq('user_id', user.id)
            .gte('date', cw.weekStart).lte('date', cw.weekEnd),
        ])

        /* Дни в целта, а не процент от целта.
           Дотук стоеше средният прием, разделен на целта: 130% значеше
           „преял си с една трета", но изглеждаше по-добре от 96%. Число, при
           което и двете посоки от стоте са грешка, не бива да се показва като
           постижение — на подготовка най-малко. Броим дните, в които приемът е
           паднал в ±8% от целта, и казваме от колко записани дни. */
        const kcalTarget = profile?.calories ?? 0
        const byDay = {}
        for (const f of foodRes.data ?? []) {
          byDay[f.date] = (byDay[f.date] ?? 0) + (f.kcal ?? 0)
        }
        const loggedDays = Object.keys(byDay).length
        const onTargetDays = kcalTarget > 0
          ? Object.values(byDay).filter(k => Math.abs(k - kcalTarget) <= kcalTarget * 0.08).length
          : null

        const trainDays = new Set([
          ...(exRes.data ?? []).map(r => r.date),
          ...(woRes.data ?? []).map(r => r.completed_date),
        ]).size

        const habits   = habRes.data ?? []
        const habitPct = habits.length > 0
          ? Math.round(habits.filter(h => h.completed).length / habits.length * 100)
          : null

        setWeekStats({ onTargetDays, loggedDays, trainDays, habitPct })
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

    /* Темпото: какво иска пътят оттук нататък.
       Дотук това се казваше „преизчисляване" и беше бутон, който пренаписваше
       start_weight и start_date. Тоест единственият начин да си кажеш „изоставам"
       беше да изтриеш плана, спрямо който изоставаш — кривата се начертаваше
       наново от днес, миналите седмици изчезваха, и въпросът „бях ли в графика
       в трета седмица" оставаше без отговор завинаги.
       Планът е запис и не се пипа. Темпото е сметка и се мени всеки ден: от
       последното мерене до целта, за дните, които остават. Двете стоят едно до
       друго, вместо едното да яде другото. */
    const latest = weightLogs.at(-1)
    if (latest) {
      plan.latestWeight = latest.kg
      const daysLeft = Math.max(1, Math.round((dayFromIso(prep.competition_date) - dayFromIso(today)) / 86400000))
      const kgLeft   = latest.kg - prep.target_weight
      plan.pace = {
        daysLeft,
        kgLeft:    Math.round(kgLeft * 10) / 10,
        kgPerWeek: Math.round((kgLeft / (daysLeft / 7)) * 100) / 100,
        dailyKcal: prep.tdee
          ? Math.round(prep.tdee - (kgLeft * KCAL_PER_KG) / daysLeft)
          : null,
      }

      // Изоставане спрямо кривата: последната завършена седмица със записи.
      const lastFull = [...plan.weeks].reverse().find(w => w.weekEnd < today && w.avgWeight !== null)
      if (lastFull) {
        const diff = lastFull.avgWeight - lastFull.targetWeight  // положително = изоставаш при сваляне
        if (Math.abs(diff) > 0.2) plan.offBy = Math.round(diff * 10) / 10
      }
    }

    /* Подът. Числото, което формулата дава, е аритметика — тя не знае, че под
       базовия обмен не се живее. Свален е дотам и се казва, че е свален:
       план, който мълчаливо иска 900 калории, е по-опасен от план, който
       признава, че срокът не излиза. */
    const floor = bmrFor({ ...profile, weight_kg: plan.latestWeight ?? profile?.weight_kg })
    if (floor) {
      if (plan.dailyKcal != null && plan.dailyKcal < floor) {
        plan.dailyKcalRaw = plan.dailyKcal
        plan.dailyKcal    = floor
        plan.kcalFloored  = floor
      }
      if (plan.pace?.dailyKcal != null && plan.pace.dailyKcal < floor) {
        plan.pace.dailyKcalRaw = plan.pace.dailyKcal
        plan.pace.dailyKcal    = floor
        plan.kcalFloored       = floor
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

  return {
    prep, plan, weightLogs, weekStats, loading,
    createPrep, updatePrep, endPrep, logMorningWeight,
  }
}
