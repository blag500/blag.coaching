import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { todayStr, tdeeFor } from './usePrepProtocol'
import { buildPeakWeek, dayFor, suggestCarbPerKg, ADJUST } from '../utils/peakWeek'

/**
 * Пиковата седмица: записът, мерените през деня, и планът над тях.
 *
 * Планът не се пази в базата. Той е чиста сметка от шепа настройки и от
 * текущото тегло, а текущото тегло се мени всяка сутрин — записан план би
 * остарял до обяд. Пазим настройките и мереното; сметката се прави наново.
 */

const empty = []

export function usePeakWeek(clientId = null) {
  const { user, profile } = useAuth()
  const uid = clientId ?? user?.id

  const [week,    setWeek]    = useState(null)
  const [logs,    setLogs]    = useState(empty)
  const [lastKg,  setLastKg]  = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)

    const { data: row } = await supabase
      .from('peak_weeks')
      .select('*')
      .eq('user_id', uid)
      .eq('active', true)
      .order('show_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    setWeek(row ?? null)

    /* Последното сутрешно тегло. Ползва се, когато седмицата още не е
       започнала и няма собствени мерения — иначе формулярът отказва да тръгне
       с „няма записано тегло", без да предлага къде да се въведе. */
    const { data: wl } = await supabase
      .from('weight_logs')
      .select('kg')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLastKg(wl?.kg ?? null)

    if (row) {
      const { data: ls } = await supabase
        .from('peak_week_logs')
        .select('*')
        .eq('peak_week_id', row.id)
        .order('logged_at')
      setLogs(ls ?? empty)
    } else {
      setLogs(empty)
    }

    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  /* Теглото, на което се смятат макросите.
     Последното мерене бие полето в профила: то е попълнено веднъж преди месеци,
     а на пикова седмица разликата от три килограма мести зареждането с 150
     грама въглехидрати. */
  const latestKg = [...logs].reverse().find(l => l.kg != null)?.kg
    ?? lastKg
    ?? profile?.weight_kg
    ?? null

  const plan = week
    ? buildPeakWeek({
        showDate:        week.show_date,
        weightKg:        latestKg,
        tdee:            week.tdee ?? tdeeFor(profile),
        carbPerKg:       week.carb_per_kg,
        loadDays:        week.load_days,
        cardioMinPerDay: week.cardio_min,
        adjust:          week.adjust_choice ?? ADJUST.hold,
      })
    : null

  const today   = todayStr()
  const dayIdx  = plan ? plan.days.findIndex(d => d.date === today) : -1
  const current = plan ? dayFor(plan, today) : null
  /* Преди началото и след шоуто страницата пак трябва да показва нещо смислено,
     затова държим и „накъде сме" отделно от „днешния ден". */
  const state = !plan ? null
    : today < plan.startDate ? 'before'
    : today > plan.showDate  ? 'after'
    : 'during'

  const logsByDate = {}
  for (const l of logs) (logsByDate[l.date] ??= []).push(l)

  const todayLogs = logsByDate[today] ?? empty
  const morning   = todayLogs.find(l => l.kg != null) ?? null

  /* Целта за деня на шоуто: теглото, при което човекът се е харесал.
     Ако е отмятал няколко пъти, взимаме последното — то е най-информираното. */
  const lookLogs   = logs.filter(l => l.is_look && l.kg != null)
  const lookWeight = week?.look_weight ?? lookLogs.at(-1)?.kg ?? null

  function doneFor(date) {
    return week?.day_state?.[date]?.done ?? empty
  }

  // ── мутации ────────────────────────────────────────────────────────

  async function createWeek(values, initialKg = null) {
    if (!user) return { error: new Error('not logged in') }
    const { data, error } = await supabase
      .from('peak_weeks')
      .insert({ user_id: user.id, ...values })
      .select().single()
    if (error || !data) return { error }

    setWeek(data)
    setLogs(empty)

    /* Теглото от формуляра става първото мерене на седмицата, а през
       weight_logs влиза и в кривата на подготовката. Иначе човек го въвежда
       веднъж, вижда го да изчезва, и го въвежда пак. */
    if (initialKg) {
      const { data: log } = await supabase
        .from('peak_week_logs')
        .insert({ peak_week_id: data.id, user_id: user.id, date: today, kg: initialKg })
        .select().single()
      if (log) setLogs([log])
      await supabase.from('weight_logs')
        .upsert({ user_id: user.id, date: today, kg: initialKg }, { onConflict: 'user_id,date' })
      setLastKg(initialKg)
    }
    return { error: null }
  }

  async function updateWeek(updates) {
    if (!week) return { error: new Error('no peak week') }
    const { data, error } = await supabase
      .from('peak_weeks').update(updates).eq('id', week.id).select().single()
    if (!error && data) setWeek(data)
    return { error }
  }

  async function endWeek() {
    if (!week) return
    await supabase.from('peak_weeks').update({ active: false }).eq('id', week.id)
    setWeek(null); setLogs(empty)
  }

  /**
   * Едно мерене. Няколко на ден е нормалното, не изключението.
   *
   * Първото за деня е сутрешното и се препраща и в `weight_logs`, за да не
   * изчезне седмицата от кривата на подготовката и от чекина. Upsert по
   * (user_id, date) — второто мерене за деня не го пипа.
   */
  async function addLog({ kg = null, isLook = false, photoUrl = null, note = null, date = today }) {
    if (!week || !user) return { error: new Error('no peak week') }
    const isFirstOfDay = !(logsByDate[date] ?? empty).some(l => l.kg != null)

    const { data, error } = await supabase
      .from('peak_week_logs')
      .insert({
        peak_week_id: week.id,
        user_id:      user.id,
        date,
        kg,
        is_look:      isLook,
        photo_url:    photoUrl,
        note,
      })
      .select().single()

    if (error) return { error }
    setLogs(prev => [...prev, data].sort((a, b) => a.logged_at.localeCompare(b.logged_at)))

    if (kg != null && isFirstOfDay) {
      await supabase.from('weight_logs')
        .upsert({ user_id: user.id, date, kg }, { onConflict: 'user_id,date' })
    }
    return { error: null, data }
  }

  async function removeLog(id) {
    await supabase.from('peak_week_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  /** Отмятане „ето този вид" върху вече записано мерене. */
  async function markLook(id, value = true) {
    const { data, error } = await supabase
      .from('peak_week_logs').update({ is_look: value }).eq('id', id).select().single()
    if (!error && data) setLogs(prev => prev.map(l => (l.id === id ? data : l)))
    return { error }
  }

  /** Дневните отмятания живеят в jsonb — шепа чекбокса, не таблица. */
  async function toggleDone(date, item) {
    if (!week) return
    const cur  = week.day_state?.[date]?.done ?? []
    const next = cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item]
    const day_state = { ...(week.day_state ?? {}), [date]: { ...(week.day_state?.[date] ?? {}), done: next } }
    setWeek(w => ({ ...w, day_state }))          // веднага, за да не мига чекбоксът
    await supabase.from('peak_weeks').update({ day_state }).eq('id', week.id)
  }

  return {
    week, plan, logs, logsByDate, loading,
    state, current, dayIdx, today,
    latestKg, morning, todayLogs, lookWeight, doneFor,
    suggestedCarbPerKg: suggestCarbPerKg(latestKg, profile?.carbs),
    createWeek, updateWeek, endWeek,
    addLog, removeLog, markLook, toggleDone,
    reload: load,
  }
}
