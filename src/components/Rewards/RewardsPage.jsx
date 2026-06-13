import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { HABITS as DEFAULT_HABITS } from '../../data/appData'
import styles from './RewardsPage.module.css'

const DAYS_BG   = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']
const MONTHS_BG = ['Януари','Февруари','Март','Април','Май','Юни',
                   'Юли','Август','Септември','Октомври','Ноември','Декември']

function pad(n) { return String(n).padStart(2, '0') }
function ds(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}` }

export default function RewardsPage({ onBack }) {
  const { profile, user } = useAuth()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [days,  setDays]  = useState({})
  const [loading, setLoading] = useState(true)

  const habits      = profile?.habits?.length > 0 ? profile.habits : DEFAULT_HABITS
  const totalHabits = habits.length
  const calTarget   = profile?.calories || 0

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)

    const start = ds(year, month, 1)
    const end   = ds(year, month, new Date(year, month+1, 0).getDate())

    Promise.all([
      supabase.from('food_logs').select('date, kcal').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('habit_completions').select('date, habit_id, completed').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('exercise_logs').select('completed_date').eq('user_id', user.id).gte('completed_date', start).lte('completed_date', end),
      supabase.from('workout_completions').select('completed_date').eq('user_id', user.id).gte('completed_date', start).lte('completed_date', end),
    ]).then(([food, hab, ex, wo]) => {
      const kcalByDay = {}
      for (const r of (food.data || [])) {
        kcalByDay[r.date] = (kcalByDay[r.date] || 0) + (r.kcal || 0)
      }

      const habByDay = {}
      for (const r of (hab.data || [])) {
        if (r.completed) habByDay[r.date] = (habByDay[r.date] || 0) + 1
      }

      const trained = new Set([
        ...(ex.data || []).map(r => r.completed_date),
        ...(wo.data || []).map(r => r.completed_date),
      ])

      const result = {}
      const count = new Date(year, month+1, 0).getDate()
      for (let d = 1; d <= count; d++) {
        const key = ds(year, month, d)
        const kcal     = kcalByDay[key] || 0
        const habDone  = habByDay[key]  || 0
        const calBadge = calTarget > 0 && kcal >= calTarget
        const habBadge = totalHabits > 0 && habDone >= totalHabits
        const trBadge  = trained.has(key)
        result[key] = { calBadge, habBadge, trBadge, perfect: calBadge && habBadge && trBadge }
      }
      setDays(result)
      setLoading(false)
    })
  }, [year, month, user?.id])

  function prevMonth() {
    if (month === 0) { setYear(y => y-1); setMonth(11) }
    else setMonth(m => m-1)
  }
  function nextMonth() {
    const isNow = year === now.getFullYear() && month === now.getMonth()
    if (isNow) return
    if (month === 11) { setYear(y => y+1); setMonth(0) }
    else setMonth(m => m+1)
  }

  // Calendar grid — Mon-first
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysCount = new Date(year, month+1, 0).getDate()
  const cells = Array(firstDow).fill(null)
  for (let d = 1; d <= daysCount; d++) cells.push(d)

  const todayStr = now.toISOString().slice(0, 10)
  const atNow    = year === now.getFullYear() && month === now.getMonth()

  let perfectN = 0, calN = 0, habN = 0, trN = 0
  for (const v of Object.values(days)) {
    if (v.perfect)  perfectN++
    if (v.calBadge) calN++
    if (v.habBadge) habN++
    if (v.trBadge)  trN++
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">←</button>
        <div>
          <h1 className={styles.title}>НАГРАДИ</h1>
          <p className={styles.subtitle}>Значки за постигнати цели</p>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatChip emoji="⭐" count={perfectN} label="ПЕРФЕКТНИ" accent />
        <StatChip emoji="🥗" count={calN}     label="КАЛОРИИ" />
        <StatChip emoji="✅" count={habN}     label="НАВИЦИ" />
        <StatChip emoji="💪" count={trN}      label="ТРЕН." />
      </div>

      {/* Month nav */}
      <div className={styles.monthNav}>
        <button className={styles.monthBtn} onClick={prevMonth} type="button">‹</button>
        <span className={styles.monthLabel}>{MONTHS_BG[month]} {year}</span>
        <button className={styles.monthBtn} onClick={nextMonth} type="button"
          style={{ opacity: atNow ? 0.25 : 1, pointerEvents: atNow ? 'none' : 'auto' }}>›</button>
      </div>

      {loading ? (
        <p className={styles.empty}>Зарежда...</p>
      ) : (
        <div className={styles.calendar}>
          {DAYS_BG.map(d => (
            <div key={d} className={styles.dayHeader}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} />
            const key     = ds(year, month, day)
            const info    = days[key] || {}
            const isToday = key === todayStr
            const future  = key > todayStr

            return (
              <div key={key} className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${future ? styles.cellFuture : ''}`}>
                <span className={styles.dayNum}>{day}</span>
                {!future && (
                  <div className={styles.badges}>
                    {info.perfect ? (
                      <span className={styles.badge}>⭐</span>
                    ) : (
                      <>
                        {info.calBadge && <span className={styles.badge}>🥗</span>}
                        {info.habBadge && <span className={styles.badge}>✅</span>}
                        {info.trBadge  && <span className={styles.badge}>💪</span>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}><span className={styles.legendEmoji}>⭐</span><span className={styles.legendText}>Перфектен ден — всички три цели</span></div>
        <div className={styles.legendItem}><span className={styles.legendEmoji}>🥗</span><span className={styles.legendText}>Калорийна цел постигната</span></div>
        <div className={styles.legendItem}><span className={styles.legendEmoji}>✅</span><span className={styles.legendText}>Всички навици изпълнени</span></div>
        <div className={styles.legendItem}><span className={styles.legendEmoji}>💪</span><span className={styles.legendText}>Тренировка отчетена</span></div>
      </div>
    </div>
  )
}

function StatChip({ emoji, count, label, accent }) {
  return (
    <div className={`${styles.chip} ${accent ? styles.chipAccent : ''}`}>
      <span className={styles.chipEmoji}>{emoji}</span>
      <span className={styles.chipNum}>{count}</span>
      <span className={styles.chipLabel}>{label}</span>
    </div>
  )
}
