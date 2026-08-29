import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Седмичният чекин.
 *
 * Две неща живеят тук: ритуалът (кой ден, дължи ли се, подаден ли е) и
 * снимката на седмицата — онова, което приложението вече знае и няма причина
 * да пита.
 *
 * Принципът, който подрежда целия екран: питаме само каквото не можем да
 * знаем. Теглото е в weight_logs всяка сутрин, тренировките в exercise_logs,
 * храненето в food_logs, сънят в sleep_logs, навиците в habit_completions, а
 * седмиците до състезанието ги смята протоколът. Клиент, който в събота
 * преписва теглото си в поле, върши работа, която приложението е свършило
 * вместо него — и я върши по-зле: едно самоотчетено число се нагласява,
 * средната от седем мерения не се нагласява.
 */

function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function dayFromIso(s) {
  if (!s) return null
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function addDays(iso, n) {
  const d = dayFromIso(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}
export function todayStr() { return isoOf(new Date()) }

/** Понеделникът на седмицата, в която пада денят. */
export function weekStartOf(iso) {
  const d = dayFromIso(iso)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return isoOf(d)
}

/** Денят по подразбиране е неделя: седмицата се затваря, преди да почне нова. */
export const DEFAULT_CHECKIN_DAY = 6

function avg(arr) {
  if (!arr.length) return null
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10
}

export function useCheckin(clientId = null, { withAuto = true } = {}) {
  const { user, profile } = useAuth()
  const uid = clientId ?? user?.id
  const readOnly = !!clientId

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [auto,    setAuto]    = useState(null)   // за текущата седмица

  const checkinDay = profile?.checkin_day ?? DEFAULT_CHECKIN_DAY

  /* Кой е чекинът на тази седмица и дължи ли се.
     Датата на чекина е денят от текущата седмица, а не „днес": подаден във
     вторник със закъснение, той пак принадлежи на миналата неделя, иначе две
     съседни седмици се сливат в един ред и сравнението изгубва стъпката си. */
  const today     = todayStr()
  const thisWeek  = weekStartOf(today)
  const dueDate   = addDays(thisWeek, checkinDay)
  // Преди деня на чекина текущият чекин е онзи от миналата седмица.
  const activeDate = today >= dueDate ? dueDate : addDays(dueDate, -7)
  const current    = rows.find(r => r.date === activeDate) ?? null
  const previous   = rows.find(r => r.date < activeDate) ?? null
  const due        = today >= activeDate && !current

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const { data } = await supabase
      .from('form_checkins')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(52)
    setRows(data ?? [])
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  /**
   * Каквото приложението знае за седмицата на един чекин.
   *
   * Смята се за текущия, за да го вижда човекът, докато попълва — и се записва
   * в реда при подаване, за да не се преправя после. Лог, редактиран със задна
   * дата, не бива да мени какво е показвал чекинът в деня, в който е подаден.
   */
  const buildAuto = useCallback(async (forDate) => {
    if (!uid) return {}
    const end   = forDate
    const start = addDays(forDate, -6)

    const [wRes, exRes, woRes, foodRes, slRes, habRes, prepRes] = await Promise.all([
      supabase.from('weight_logs').select('date, kg').eq('user_id', uid).gte('date', start).lte('date', end),
      supabase.from('exercise_logs').select('date').eq('user_id', uid).gte('date', start).lte('date', end),
      supabase.from('workout_completions').select('completed_date').eq('user_id', uid).gte('completed_date', start).lte('completed_date', end),
      supabase.from('food_logs').select('date, kcal').eq('user_id', uid).gte('date', start).lte('date', end),
      supabase.from('sleep_logs').select('date, duration_hours, quality').eq('user_id', uid).gte('date', start).lte('date', end),
      supabase.from('habit_completions').select('completed').eq('user_id', uid).gte('date', start).lte('date', end),
      supabase.from('prep_protocols').select('competition_date').eq('user_id', uid).eq('active', true).limit(1).maybeSingle(),
    ])

    const weights = (wRes.data ?? []).map(r => Number(r.kg)).filter(Number.isFinite)

    const byDay = {}
    for (const f of foodRes.data ?? []) byDay[f.date] = (byDay[f.date] ?? 0) + (f.kcal ?? 0)
    const target = profile?.calories ?? 0
    const loggedDays = Object.keys(byDay).length
    // Дни в целта, не процент от целта: 130% значи преял, но изглежда по-добре
    // от 96%, и това е число, което лъже точно тогава, когато е важно.
    const onTargetDays = target > 0
      ? Object.values(byDay).filter(k => Math.abs(k - target) <= target * 0.08).length
      : null

    const trainings = new Set([
      ...(exRes.data ?? []).map(r => r.date),
      ...(woRes.data ?? []).map(r => r.completed_date),
    ]).size

    const sleeps  = (slRes.data ?? []).map(r => Number(r.duration_hours)).filter(Number.isFinite)
    const quality = (slRes.data ?? []).map(r => Number(r.quality)).filter(Number.isFinite)
    const habits  = habRes.data ?? []

    let weeksOut = null
    if (prepRes.data?.competition_date) {
      const days = Math.round((dayFromIso(prepRes.data.competition_date) - dayFromIso(end)) / 86400000)
      weeksOut = Math.max(0, Math.ceil(days / 7))
    }

    return {
      weightAvg:   avg(weights),
      weightDays:  weights.length,
      trainings,
      loggedDays,
      onTargetDays,
      sleepAvg:    avg(sleeps),
      sleepQuality: avg(quality),
      habitsPct:   habits.length ? Math.round(habits.filter(h => h.completed).length / habits.length * 100) : null,
      weeksOut,
    }
  }, [uid, profile?.calories])

  /* Снимката на седмицата струва седем заявки. Профилът пита само „дължи ли
     се чекин" и няма причина да ги плаща — затова е по избор. */
  useEffect(() => {
    if (!withAuto || readOnly || !uid) return
    let alive = true
    buildAuto(activeDate).then(a => { if (alive) setAuto(a) })
    return () => { alive = false }
  }, [buildAuto, activeDate, readOnly, uid, withAuto])

  async function save(values, photos) {
    if (!uid || readOnly) return { error: new Error('read only') }
    const snapshot = auto ?? await buildAuto(activeDate)
    const entry = {
      user_id: uid,
      date: activeDate,
      submitted_at: new Date().toISOString(),
      auto: snapshot,
      photos: photos ?? {},
      ...values,
    }
    const { data, error } = await supabase
      .from('form_checkins')
      .upsert(entry, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (data) setRows(prev => [data, ...prev.filter(r => r.date !== data.date)])
    return { error }
  }

  async function setCheckinDay(day) {
    if (!user) return
    await supabase.from('profiles').update({ checkin_day: day }).eq('id', user.id)
  }

  return {
    rows, loading, current, previous, due, activeDate, checkinDay, auto,
    save, setCheckinDay, reload: load, buildAuto,
  }
}
