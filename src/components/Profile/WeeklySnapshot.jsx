import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './WeeklySnapshot.module.css'

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const GYM_COLORS = ['#EF5350', '#FFB74D', '#66BB6A']
const GYM_ICONS  = ['↓', '=', '↑']

function getWeekDays(offset) {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + offset * 7)
  mon.setHours(12, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function barColor(pct) {
  if (pct >= 0.9) return { from: '#66BB6A', to: '#81C784' }
  if (pct >= 0.6) return { from: '#FFB74D', to: '#FFCA28' }
  return { from: '#EF5350', to: '#EF9A9A' }
}

export default function WeeklySnapshot({ kcalTarget = 0 }) {
  const { user }  = useAuth()
  const [offset,   setOffset]   = useState(0)
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [animated, setAnimated] = useState(false)
  const animRef = useRef(null)

  const days  = getWeekDays(offset)
  const from  = days[0]
  const to    = days[6]
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setAnimated(false)
    setData(null)

    Promise.all([
      supabase.from('food_logs')
        .select('date, kcal, protein, carbs, fat')
        .eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('exercise_logs')
        .select('date')
        .eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('habit_completions')
        .select('date, completed')
        .eq('user_id', user.id).gte('date', from).lte('date', to),
      supabase.from('form_checkins')
        .select('date, sleep_hours, gym_performance, training_desire, weekly_win, weekly_improve')
        .eq('user_id', user.id).gte('date', from).lte('date', to),
    ]).then(([food, training, habits, checkins]) => {
      const foodByDay = {}
      food.data?.forEach(e => {
        if (!foodByDay[e.date]) foodByDay[e.date] = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
        foodByDay[e.date].kcal    += e.kcal    || 0
        foodByDay[e.date].protein += e.protein || 0
        foodByDay[e.date].carbs   += e.carbs   || 0
        foodByDay[e.date].fat     += e.fat     || 0
      })

      const trainDays = new Set(training.data?.map(e => e.date) || [])

      const habitsByDay = {}
      habits.data?.forEach(({ date, completed }) => {
        if (!habitsByDay[date]) habitsByDay[date] = { completed: 0, total: 0 }
        habitsByDay[date].total++
        if (completed) habitsByDay[date].completed++
      })

      const checkinByDay = {}
      checkins.data?.forEach(c => { checkinByDay[c.date] = c })

      setData({ foodByDay, trainDays, habitsByDay, checkinByDay })
      setLoading(false)

      // Double RAF — ensures DOM has painted before animating bars in
      animRef.current = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimated(true))
      )
    })

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [user?.id, from, to])

  // ─── Derived stats ────────────────────────────────────────────────────────
  const { foodByDay = {}, trainDays = new Set(), habitsByDay = {}, checkinByDay = {} } = data || {}

  const foodDaysArr  = days.filter(d => foodByDay[d])
  const avgKcal      = foodDaysArr.length
    ? Math.round(foodDaysArr.reduce((s, d) => s + foodByDay[d].kcal, 0) / foodDaysArr.length)
    : null

  const trainCount   = days.filter(d => trainDays.has(d)).length

  const habitDaysArr = days.filter(d => habitsByDay[d]?.total > 0)
  const habitPct     = habitDaysArr.length
    ? Math.round(
        habitDaysArr.reduce((s, d) => s + habitsByDay[d].completed, 0) /
        habitDaysArr.reduce((s, d) => s + habitsByDay[d].total,     0) * 100
      )
    : null

  const sleepDays    = days.filter(d => checkinByDay[d]?.sleep_hours    != null)
  const desireDays   = days.filter(d => checkinByDay[d]?.training_desire != null)
  const avgSleep     = sleepDays.length
    ? (sleepDays.reduce((s, d)  => s + checkinByDay[d].sleep_hours,     0) / sleepDays.length).toFixed(1)
    : null
  const avgDesire    = desireDays.length
    ? (desireDays.reduce((s, d) => s + checkinByDay[d].training_desire, 0) / desireDays.length).toFixed(1)
    : null

  const gymCounts = [0, 0, 0]
  days.forEach(d => {
    const g = checkinByDay[d]?.gym_performance
    if (g != null) gymCounts[g]++
  })
  const hasGym = gymCounts.some(n => n > 0)

  const latestWin     = [...days].reverse().find(d => checkinByDay[d]?.weekly_win)
  const latestImprove = [...days].reverse().find(d => checkinByDay[d]?.weekly_improve)

  const weekLabel = offset === 0
    ? 'ТАЗИ СЕДМИЦА'
    : offset === -1
      ? 'МИНАЛАТА СЕДМИЦА'
      : `${new Date(from + 'T12:00').toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit' })} – ${new Date(to + 'T12:00').toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit' })}`

  const hasAnyData = foodDaysArr.length > 0 || trainCount > 0 || habitDaysArr.length > 0 || sleepDays.length > 0

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>

      {/* Week navigation */}
      <div className={styles.weekNav}>
        <button
          className={styles.navBtn}
          type="button"
          onClick={() => setOffset(o => o - 1)}
          aria-label="Предишна седмица"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.weekLabel}>{weekLabel}</span>
        <button
          className={styles.navBtn}
          type="button"
          onClick={() => setOffset(o => o + 1)}
          disabled={offset === 0}
          aria-label="Следваща седмица"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className={styles.skeletonWrap}>
          <div className={styles.skeletonLabel} />
          <div className={styles.skeletonBars}>
            {[60, 85, 40, 75, 90, 30, 55].map((h, i) => (
              <div key={i} className={styles.skeletonBarCol}>
                <div className={styles.skeletonBar} style={{ height: h }} />
                <div className={styles.skeletonBarLabel} />
              </div>
            ))}
          </div>
          <div className={styles.skeletonStatsRow}>
            {[1, 2, 3].map(i => <div key={i} className={styles.skeletonStatBox} />)}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !hasAnyData && (
        <p className={styles.empty}>Няма данни за тази седмица</p>
      )}

      {!loading && hasAnyData && (
        <div className={`${styles.content} ${animated ? styles.contentVisible : ''}`}>

          {/* ── Nutrition bars ── */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>ХРАНЕНЕ</p>
            <div className={styles.barsRow}>
              {days.map((d, i) => {
                const food    = foodByDay[d]
                const isFuture = d > today
                const pct     = food && kcalTarget > 0 ? Math.min(1, food.kcal / kcalTarget) : 0
                const { from: c1, to: c2 } = food ? barColor(pct) : { from: '', to: '' }
                const heightPct = animated && food && !isFuture ? Math.max(3, Math.round(pct * 100)) : 0

                return (
                  <div key={d} className={styles.barCol}>
                    <div className={styles.barTrack}>
                      {!isFuture && (
                        <div
                          className={styles.barFill}
                          style={{
                            height: `${heightPct}%`,
                            background: food
                              ? `linear-gradient(to top, ${c1}, ${c2})`
                              : 'transparent',
                          }}
                        />
                      )}
                    </div>
                    <span className={`${styles.barLabel} ${d === today ? styles.barLabelToday : ''}`}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className={styles.subLine}>
              {avgKcal !== null
                ? <>Ср. <strong>{avgKcal}</strong> ккал{kcalTarget > 0 ? ` · цел ${kcalTarget}` : ''}</>
                : 'Няма записи'}
            </p>
          </div>

          {/* ── Training dots ── */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>ТРЕНИРОВКА</p>
            <div className={styles.dotsRow}>
              {days.map((d, i) => {
                const done     = trainDays.has(d)
                const isFuture = d > today
                return (
                  <div key={d} className={styles.dotCol}>
                    <div className={[
                      styles.trainDot,
                      done      ? styles.trainDotOn     : '',
                      isFuture  ? styles.trainDotFuture : '',
                    ].join(' ')}>
                      {done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`${styles.barLabel} ${d === today ? styles.barLabelToday : ''}`}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className={styles.subLine}>
              <strong>{trainCount}</strong> {trainCount === 1 ? 'тренировка' : 'тренировки'}
            </p>
          </div>

          {/* ── Stats row ── */}
          {(habitPct !== null || avgSleep !== null || avgDesire !== null || hasGym) && (
            <div className={styles.statsRow}>
              {habitPct !== null && (
                <div className={styles.statBox}>
                  <span className={styles.statVal}>{habitPct}%</span>
                  <span className={styles.statLabel}>навици</span>
                </div>
              )}
              {avgSleep !== null && (
                <div className={styles.statBox}>
                  <span className={styles.statVal}>{avgSleep}<span className={styles.statUnit}>ч</span></span>
                  <span className={styles.statLabel}>ср. сън</span>
                </div>
              )}
              {avgDesire !== null && (
                <div className={styles.statBox}>
                  <span className={styles.statVal}>{avgDesire}<span className={styles.statUnit}>/5</span></span>
                  <span className={styles.statLabel}>желание</span>
                </div>
              )}
              {hasGym && (
                <div className={styles.statBox}>
                  <span className={styles.statVal}>
                    {gymCounts.map((n, i) => n > 0
                      ? <span key={i} style={{ color: GYM_COLORS[i] }}>{GYM_ICONS[i]}{n}</span>
                      : null
                    )}
                  </span>
                  <span className={styles.statLabel}>зала</span>
                </div>
              )}
            </div>
          )}

          {/* ── Weekly win / improvement ── */}
          {(latestWin || latestImprove) && (
            <div className={styles.weeklyTexts}>
              {latestWin && (
                <div className={styles.weeklyRow}>
                  <div className={styles.weeklyAccent} style={{ background: '#66BB6A' }} />
                  <div className={styles.weeklyBody}>
                    <span className={styles.weeklyTag}>ПОБЕДА</span>
                    <span className={styles.weeklyVal}>{checkinByDay[latestWin].weekly_win}</span>
                  </div>
                </div>
              )}
              {latestImprove && (
                <div className={styles.weeklyRow}>
                  <div className={styles.weeklyAccent} style={{ background: '#FFB74D' }} />
                  <div className={styles.weeklyBody}>
                    <span className={styles.weeklyTag}>ПОДОБРЕНИЕ</span>
                    <span className={styles.weeklyVal}>{checkinByDay[latestImprove].weekly_improve}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
