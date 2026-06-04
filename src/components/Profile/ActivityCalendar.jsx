import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ActivityCalendar.module.css'

const DOTS = [
  { key: 'food',     color: '#66BB6A', label: 'Хранене'   },
  { key: 'training', color: '#FFB74D', label: 'Тренировка' },
  { key: 'habits',   color: '#4FC3F7', label: 'Навици'    },
  { key: 'weight',   color: '#F06292', label: 'Тегло'     },
  { key: 'sleep',    color: '#CE93D8', label: 'Сън'       },
]

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export default function ActivityCalendar() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  const [year,  setYear]  = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())  // 0-based
  const [actMap, setActMap] = useState(new Map())
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (!user) return
    const mm   = String(month + 1).padStart(2, '0')
    const from = `${year}-${mm}-01`
    const last = new Date(year, month + 1, 0).getDate()
    const to   = `${year}-${mm}-${String(last).padStart(2, '0')}`

    Promise.all([
      supabase.from('food_logs')       .select('date').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('exercise_logs')   .select('date').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('habit_completions').select('date, completed').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('weight_logs')     .select('date').eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('form_checkins').select('date').eq('user_id', user.id).gte('date', from).lte('date', to).not('sleep_hours', 'is', null),
    ]).then(([food, training, habits, weight, sleep]) => {
      const map = new Map()
      const ensure = d => {
        if (!map.has(d)) map.set(d, { food: false, training: false, habits: false, weight: false, sleep: false })
        return map.get(d)
      }

      food.data?.forEach(({ date })     => { ensure(date).food     = true })
      training.data?.forEach(({ date }) => { ensure(date).training = true })
      weight.data?.forEach(({ date })   => { ensure(date).weight   = true })
      sleep.data?.forEach(({ date })    => { ensure(date).sleep    = true })

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
    const first = new Date(year, month, 1).getDay()      // 0=Sun
    return {
      startOffset: (first + 6) % 7,                      // Mon-first
      daysInMonth: new Date(year, month + 1, 0).getDate(),
    }
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const monthName = new Date(year, month, 1).toLocaleString('bg-BG', { month: 'long' })

  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) => {
    if (i < startOffset) return null
    const day     = i - startOffset + 1
    const mm      = String(month + 1).padStart(2, '0')
    const dd      = String(day).padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    const act     = actMap.get(dateStr) || {}
    return {
      day,
      dateStr,
      act,
      isToday:  dateStr === today,
      isFuture: dateStr >  today,
      hasAny:   Object.values(act).some(Boolean),
    }
  })

  const selAct = selectedDay ? (actMap.get(selectedDay) || {}) : null

  return (
    <div>
      {/* Header */}
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
          const { day, dateStr, act, isToday, isFuture, hasAny } = cell
          return (
            <button
              key={dateStr}
              type="button"
              className={[
                styles.cell,
                isToday    ? styles.todayCell    : '',
                isFuture   ? styles.futureCell   : '',
                selectedDay === dateStr ? styles.selectedCell : '',
              ].join(' ')}
              onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
            >
              <span className={styles.dayNum}>{day}</span>
              {hasAny && !isFuture && (
                <div className={styles.dots}>
                  {DOTS.map(({ key, color }) =>
                    act[key] ? <span key={key} className={styles.dot} style={{ background: color }} /> : null
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {DOTS.map(({ key, color, label }) => (
          <span key={key} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className={styles.detail}>
          <p className={styles.detailDate}>
            {new Date(selectedDay + 'T12:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })}
          </p>
          <div className={styles.detailRow}>
            {DOTS.map(({ key, color, label }) => (
              <span
                key={key}
                className={`${styles.detailBadge} ${selAct[key] ? styles.detailBadgeOn : styles.detailBadgeOff}`}
              >
                <span className={styles.dot} style={{ background: selAct[key] ? color : 'var(--border)' }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
