import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ActivityCalendar.module.css'

const CATEGORIES = [
  { key: 'training', color: '#FFB74D', label: 'Тренировка', emoji: '💪' },
  { key: 'food',     color: '#66BB6A', label: 'Хранене',    emoji: '🥗' },
  { key: 'habits',   color: '#4FC3F7', label: 'Навици',     emoji: '✅' },
  { key: 'weight',   color: '#F06292', label: 'Тегло',      emoji: '⚖️' },
  { key: 'sleep',    color: '#CE93D8', label: 'Сън',        emoji: '😴' },
]

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function heatColor(count) {
  if (count === 0) return 'transparent'
  if (count === 1) return 'rgba(255,183,77,0.22)'
  if (count === 2) return 'rgba(255,183,77,0.42)'
  if (count === 3) return 'rgba(255,183,77,0.62)'
  if (count === 4) return 'rgba(255,183,77,0.82)'
  return 'var(--accent)'
}

export default function ActivityCalendar() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  const [year,        setYear]        = useState(() => new Date().getFullYear())
  const [month,       setMonth]       = useState(() => new Date().getMonth())
  const [actMap,      setActMap]      = useState(new Map())
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (!user) return
    const mm   = String(month + 1).padStart(2, '0')
    const from = `${year}-${mm}-01`
    const last = new Date(year, month + 1, 0).getDate()
    const to   = `${year}-${mm}-${String(last).padStart(2, '0')}`

    Promise.all([
      supabase.from('food_logs')          .select('date').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('workout_completions').select('completed_date').eq('user_id', user.id).gte('completed_date', from).lte('completed_date', to),
      supabase.from('habit_completions')  .select('date, completed').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('weight_logs')        .select('date').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('form_checkins')      .select('date').eq('user_id', user.id).gte('date', from).lte('date', to).not('weight_kg', 'is', null),
      supabase.from('sleep_logs')         .select('date').eq('user_id', user.id).gte('date', from).lte('date', to).not('duration_hours', 'is', null),
      supabase.from('form_checkins')      .select('date').eq('user_id', user.id).gte('date', from).lte('date', to).not('sleep_hours', 'is', null),
    ]).then(([food, training, habits, weight, checkinWeight, sleepLog, checkinSleep]) => {
      const map = new Map()
      const ensure = d => {
        if (!map.has(d)) map.set(d, { food: false, training: false, habits: false, weight: false, sleep: false })
        return map.get(d)
      }

      food.data?.forEach(({ date })                  => { ensure(date).food     = true })
      training.data?.forEach(({ completed_date: d }) => { ensure(d).training   = true })
      weight.data?.forEach(({ date })                => { ensure(date).weight   = true })
      checkinWeight.data?.forEach(({ date })         => { ensure(date).weight   = true })
      sleepLog.data?.forEach(({ date })              => { ensure(date).sleep    = true })
      checkinSleep.data?.forEach(({ date })          => { ensure(date).sleep    = true })

      const habitCount = {}
      habits.data?.forEach(({ date, completed }) => {
        habitCount[date] = (habitCount[date] || 0) + (completed ? 1 : 0)
      })
      Object.entries(habitCount).forEach(([date, n]) => {
        if (n > 0) ensure(date).habits = true
      })

      setActMap(map)
    })
  }, [user?.id, year, month])

  const { startOffset, daysInMonth } = useMemo(() => {
    const first = new Date(year, month, 1).getDay()
    return {
      startOffset: (first + 6) % 7,
      daysInMonth: new Date(year, month + 1, 0).getDate(),
    }
  }, [year, month])

  const monthStats = useMemo(() => {
    let training = 0, food = 0, habits = 0, activeDays = 0
    actMap.forEach(act => {
      const anyActive = Object.values(act).some(Boolean)
      if (anyActive) activeDays++
      if (act.training) training++
      if (act.food) food++
      if (act.habits) habits++
    })
    return { training, food, habits, activeDays }
  }, [actMap])

  function prevMonth() {
    setSelectedDay(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDay(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const monthName = new Date(year, month, 1).toLocaleString('bg-BG', { month: 'long' })

  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) => {
    if (i < startOffset) return null
    const day     = i - startOffset + 1
    const mm      = String(month + 1).padStart(2, '0')
    const dd      = String(day).padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    const act     = actMap.get(dateStr) || {}
    const count   = Object.values(act).filter(Boolean).length
    return { day, dateStr, act, count, isToday: dateStr === today, isFuture: dateStr > today }
  })

  const selAct = selectedDay ? (actMap.get(selectedDay) || {}) : null

  return (
    <div>
      {/* Monthly stats */}
      <div className={styles.stats}>
        <StatChip emoji="📅" value={monthStats.activeDays} label="активни дни" />
        <StatChip emoji="💪" value={monthStats.training}   label="тренировки" />
        <StatChip emoji="🥗" value={monthStats.food}       label="дни хранене" />
        <StatChip emoji="✅" value={monthStats.habits}     label="дни навици" />
      </div>

      {/* Month navigation */}
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth} type="button">‹</button>
        <span className={styles.monthLabel}>{monthName.toUpperCase()} {year}</span>
        <button className={styles.navBtn} onClick={nextMonth} type="button">›</button>
      </div>

      {/* Weekday labels */}
      <div className={styles.weekdays}>
        {WEEKDAYS.map(d => <span key={d} className={styles.weekday}>{d}</span>)}
      </div>

      {/* Calendar grid */}
      <div className={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />
          const { day, dateStr, count, isToday, isFuture } = cell
          return (
            <button
              key={dateStr}
              type="button"
              className={[
                styles.cell,
                isToday  ? styles.todayCell    : '',
                isFuture ? styles.futureCell   : '',
                selectedDay === dateStr ? styles.selectedCell : '',
              ].join(' ')}
              onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
            >
              <span
                className={styles.heatDot}
                style={{ background: isFuture ? 'transparent' : heatColor(count) }}
              />
              <span className={styles.dayNum}>{day}</span>
            </button>
          )
        })}
      </div>

      {/* Heat legend */}
      <div className={styles.heatLegend}>
        <span className={styles.heatLegendLabel}>Малко</span>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className={styles.heatSwatch} style={{ background: heatColor(n) }} />
        ))}
        <span className={styles.heatLegendLabel}>Много</span>
      </div>

      {/* Day detail panel */}
      {selectedDay && selAct && (
        <div className={styles.detail}>
          <p className={styles.detailDate}>
            {new Date(selectedDay + 'T12:00').toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {Object.values(selAct).every(v => !v) ? (
            <p className={styles.detailEmpty}>Няма записана активност за този ден</p>
          ) : (
            <div className={styles.detailRow}>
              {CATEGORIES.map(({ key, color, label, emoji }) =>
                selAct[key] ? (
                  <span key={key} className={styles.detailBadge} style={{ borderColor: color + '55', color }}>
                    {emoji} {label}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatChip({ emoji, value, label }) {
  return (
    <div className={styles.statChip}>
      <span className={styles.statEmoji}>{emoji}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
