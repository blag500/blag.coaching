import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import { useWaterLog } from '../../hooks/useWaterLog'
import BadgePopup from './BadgePopup'
import ReadinessWidget from '../ReadinessWidget/ReadinessWidget'
import styles from './TodayDashboard.module.css'

function dateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export default function TodayDashboard({ onNavigate }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const { log, totals } = useFoodLog()
  const { habits, checked } = useHabitsToday()
  const { glasses, target: waterTarget, add: addWater } = useWaterLog()
  const [workouts, setWorkouts] = useState([])

  const targets = {
    kcal:    profile?.calories ?? 0,
    protein: profile?.protein  ?? 0,
    carbs:   profile?.carbs    ?? 0,
    fat:     profile?.fat      ?? 0,
  }

  const DAYS_SHORT = Array.from({ length: 7 }, (_, i) => t(`days.${i}`))

  function daysAgoLabel(date) {
    const today = dateStr(0)
    const yesterday = dateStr(1)
    if (date === today)     return t('today.ago.today')
    if (date === yesterday) return t('today.ago.yesterday')
    const diff = Math.round((new Date(today) - new Date(date)) / 86400000)
    return t('today.ago.days').replace('{n}', diff)
  }

  const recentFood = [...(log || [])].reverse().slice(0, 3)
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? t('today.greeting.morning') : hour < 18 ? t('today.greeting.afternoon') : t('today.greeting.evening')

  useEffect(() => {
    if (!user?.id) return
    const since = dateStr(13)
    Promise.all([
      supabase.from('exercise_logs').select('block_label, completed_date').eq('user_id', user.id).gte('completed_date', since),
      supabase.from('workout_completions').select('block_label, completed_date').eq('user_id', user.id).gte('completed_date', since),
    ]).then(([ex, wo]) => {
      const merged = [...(ex.data || []), ...(wo.data || [])]
      merged.sort((a, b) => b.completed_date.localeCompare(a.completed_date))
      setWorkouts(merged)
    })
  }, [user?.id])

  // Last 7 days: oldest → newest (left → right)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i
    const ds     = dateStr(offset)
    const done   = workouts.some(w => w.completed_date === ds)
    const labels = [...new Set(workouts.filter(w => w.completed_date === ds).map(w => w.block_label))]
    const d      = new Date(); d.setDate(d.getDate() - offset)
    return { ds, dow: DAYS_SHORT[d.getDay()], done, labels, isToday: offset === 0 }
  })

  // Streak (consecutive days going back from today or yesterday)
  const doneSet = new Set(workouts.map(w => w.completed_date))
  let streak = 0
  let startOffset = doneSet.has(dateStr(0)) ? 0 : 1
  for (let i = startOffset; i <= 13; i++) {
    if (doneSet.has(dateStr(i))) streak++
    else break
  }

  const lastWorkout   = workouts[0] ?? null
  const todayWorkouts = workouts.filter(w => w.completed_date === dateStr(0))

  const completedHabits = habits.filter(h => checked[h.id]).length
  const totalHabits     = habits.length || 1
  const trainedToday    = todayWorkouts.length > 0

  // ── Badge detection ──
  const [badgeQueue, setBadgeQueue] = useState([])
  const prevCal   = useRef(false)
  const prevHabs  = useRef(false)
  const prevTrain = useRef(false)

  const kcalPct = Math.min((totals.kcal || 0) / Math.max(targets.kcal || 1, 1), 1)
  const calDone  = targets.kcal > 0 && kcalPct >= 0.8
  const habsDone = habits.length > 0 && completedHabits >= habits.length

  useEffect(() => {
    const today    = new Date().toISOString().slice(0, 10)
    const justCal  = calDone     && !prevCal.current
    const justHabs = habsDone    && !prevHabs.current
    const justTrain = trainedToday && !prevTrain.current
    const earned   = []

    function award(type) {
      const k = `blag_badge_${type}_${today}`
      if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); earned.push(type) }
    }

    if (justCal)   award('calories')
    if (justHabs)  award('habits')
    if (justTrain) award('training')
    if ((justCal || justHabs || justTrain) && calDone && habsDone && trainedToday) {
      award('perfect')
    }

    prevCal.current   = calDone
    prevHabs.current  = habsDone
    prevTrain.current = trainedToday

    if (earned.length) setBadgeQueue(q => [...q, ...earned])
  }, [calDone, habsDone, trainedToday])

  return (
    <div className={styles.page}>
      {badgeQueue[0] && (
        <BadgePopup badge={badgeQueue[0]} onDone={() => setBadgeQueue(q => q.slice(1))} />
      )}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.greeting}>{greeting}</p>
            <h1 className={styles.name}>{profile?.name?.split(' ')[0]?.toUpperCase() ?? 'BLAG'}</h1>
          </div>
          <button className={styles.avatarBtn} onClick={() => onNavigate('profile')} type="button" aria-label="Профил">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className={styles.avatarImg} alt="" />
              : <span className={styles.avatarInitial}>{(profile?.name || '?')[0].toUpperCase()}</span>
            }
          </button>
        </div>
      </header>

      {/* ── Readiness widget ── */}
      <ReadinessWidget onNavigate={onNavigate} />

      {/* ── Activity rings card ── */}
      <div className={styles.card}>
        <span className={styles.cardLabel}>{t('today.activity')}</span>
        <div className={styles.ringsRow}>
          <ActivityRings
            kcalPct={kcalPct}
            habitsPct={completedHabits / totalHabits}
            trained={trainedToday}
            kcalVal={Math.round(totals.kcal || 0)}
            kcalUnit={t('today.kcal')}
          />
          <div className={styles.ringsLegend}>
            <div className={styles.ringLegendItem}>
              <span className={styles.ringLegendDot} style={{ background: '#ffb74d' }} />
              <span className={styles.ringLegendLabel}>{t('today.calories')}</span>
              <span className={styles.ringLegendVal}>{Math.round(totals.kcal || 0)} / {targets.kcal}</span>
            </div>
            <div className={styles.ringLegendItem}>
              <span className={styles.ringLegendDot} style={{ background: '#AB47BC' }} />
              <span className={styles.ringLegendLabel}>{t('today.habits')}</span>
              <span className={styles.ringLegendVal}>{completedHabits} / {habits.length}</span>
            </div>
            <div className={styles.ringLegendItem}>
              <span className={styles.ringLegendDot} style={{ background: '#66BB6A' }} />
              <span className={styles.ringLegendLabel}>{t('today.training')}</span>
              <span className={styles.ringLegendVal}>{trainedToday ? '✓' : '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Macro mini grid ── */}
        <div className={styles.macroGrid}>
          <MacroCell label={t('today.protein')} value={Math.round(totals.protein || 0)} target={targets.protein} color="#42A5F5" unit="g" />
          <MacroCell label={t('today.carbs')} value={Math.round(totals.carbs || 0)} target={targets.carbs} color="#66BB6A" unit="g" />
          <MacroCell label={t('today.fats')} value={Math.round(totals.fat || 0)} target={targets.fat} color="#ffb74d" unit="g" />
          <MacroCell label={t('today.remaining')} value={Math.max(0, targets.kcal - Math.round(totals.kcal || 0))} target={targets.kcal} color="var(--muted)" unit={t('today.kcal')} noOver />
        </div>

        {/* ── Water row ── */}
        <div className={styles.waterRow}>
          <span className={styles.waterLabel}>{t('today.water')}</span>
          <div className={styles.waterGlasses}>
            {Array.from({ length: waterTarget }, (_, i) => (
              <span key={i} className={`${styles.waterDrop} ${i < glasses ? styles.waterDropFull : ''}`} />
            ))}
          </div>
          <div className={styles.waterActions}>
            <span className={styles.waterCount}>{glasses}/{waterTarget}</span>
            <button type="button" className={styles.waterBtn} onClick={() => addWater(1)} aria-label="Добави чаша">+</button>
          </div>
        </div>
      </div>

      {/* ── Quick log button ── */}
      <button className={styles.logBtn} onClick={() => onNavigate('nutrition')} type="button">
        {t('today.logFood')}
      </button>

      {/* ── Recent food ── */}
      {recentFood.length > 0 && (
        <div className={styles.card}>
          <span className={styles.cardLabel}>{t('today.recentAdded')}</span>
          <div className={styles.recentList}>
            {recentFood.map((f, i) => (
              <div key={i} className={styles.recentRow}>
                <span className={styles.recentName}>{f.name}</span>
                <span className={styles.recentKcal}>{f.kcal} {t('today.kcal')}</span>
              </div>
            ))}
          </div>
          <button className={styles.seeAll} onClick={() => onNavigate('nutrition')} type="button">
            {t('today.seeAll')}
          </button>
        </div>
      )}

      {/* ── Training card ── */}
      <button className={styles.trainingCard} onClick={() => onNavigate('training')} type="button">
        <div className={styles.trainingHeader}>
          <span className={styles.cardLabel}>{t('today.workoutCard')}</span>
          {streak > 1 && (
            <span className={styles.streak}>🔥 {streak} {t('today.streakUnit')}</span>
          )}
        </div>

        <div className={styles.dotRow}>
          {last7.map(day => (
            <div key={day.ds} className={styles.dotCol}>
              <div className={`${styles.dot} ${day.done ? styles.dotDone : ''} ${day.isToday ? styles.dotToday : ''}`} />
              <span className={`${styles.dotLabel} ${day.isToday ? styles.dotLabelToday : ''}`}>{day.dow}</span>
            </div>
          ))}
        </div>

        {todayWorkouts.length > 0 ? (
          <div className={styles.trainingFooter}>
            <span className={styles.trainingDone}>
              ✓ {todayWorkouts.map(w => w.block_label).join(' · ')}
            </span>
            <span className={styles.trainingArrow}>→</span>
          </div>
        ) : (
          <div className={styles.trainingCta}>
            <div className={styles.trainingCtaText}>
              {lastWorkout ? (
                <span className={styles.trainingLast}>{t('today.lastWorkout')} {lastWorkout.block_label} · {daysAgoLabel(lastWorkout.completed_date)}</span>
              ) : (
                <span className={styles.trainingLast}>{t('today.noWorkouts')}</span>
              )}
            </div>
            <span className={styles.trainingCtaBtn}>{t('today.logBtn')}</span>
          </div>
        )}
      </button>

      {/* ── Check-in shortcut ── */}
      <button className={styles.checkinCard} onClick={() => onNavigate('profile')} type="button">
        <div className={styles.checkinText}>
          <span className={styles.cardLabel}>{t('today.checkin')}</span>
          <span className={styles.checkinSub}>{t('today.checkinSub')}</span>
        </div>
        <span className={styles.checkinArrow}>→</span>
      </button>

      {/* ── Rewards shortcut ── */}
      <button className={styles.rewardsBtn} onClick={() => onNavigate('rewards')} type="button">
        <span className={styles.rewardsBtnInner}>
          <span className={styles.rewardsBtnEmojis}>⭐ 🥗 ✅ 💪</span>
          <span className={styles.rewardsBtnLabel}>{t('today.rewards')}</span>
        </span>
        <span className={styles.checkinArrow}>→</span>
      </button>
    </div>
  )
}

function ActivityRings({ kcalPct, habitsPct, trained, kcalVal, kcalUnit }) {
  const cx = 60, cy = 60
  const ringDefs = [
    { r: 50, sw: 9, pct: kcalPct,          color: '#ffb74d', bg: 'rgba(255,183,77,0.12)',   delay: '0ms'   },
    { r: 37, sw: 9, pct: habitsPct,         color: '#AB47BC', bg: 'rgba(171,71,188,0.12)',   delay: '80ms'  },
    { r: 24, sw: 9, pct: trained ? 1 : 0,  color: '#66BB6A', bg: 'rgba(102,187,106,0.12)',  delay: '160ms' },
  ]

  // Animate each ring from 0 to its target on mount
  const [animPcts, setAnimPcts] = useState([0, 0, 0])
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      const raf = requestAnimationFrame(() =>
        setAnimPcts([kcalPct, habitsPct, trained ? 1 : 0])
      )
      return () => cancelAnimationFrame(raf)
    }
    setAnimPcts([kcalPct, habitsPct, trained ? 1 : 0])
  }, [kcalPct, habitsPct, trained])

  return (
    <svg width="134" height="134" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      {ringDefs.map((ring, idx) => {
        const circ   = 2 * Math.PI * ring.r
        const offset = circ - animPcts[idx] * circ
        return (
          <g key={idx}>
            <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke={ring.bg} strokeWidth={ring.sw} />
            <circle
              cx={cx} cy={cy} r={ring.r} fill="none"
              stroke={ring.color} strokeWidth={ring.sw}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
              style={{ transition: `stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) ${ring.delay}` }}
            />
          </g>
        )
      })}
      {kcalVal > 0 && (
        <text x={cx} y={cy - 2} textAnchor="middle"
          fill="var(--text)" fontSize="13" fontFamily="'Bebas Neue', sans-serif" letterSpacing="0.5">
          {kcalVal}
        </text>
      )}
      <text x={cx} y={kcalVal > 0 ? cy + 8 : cy + 3} textAnchor="middle"
        fill="var(--muted)" fontSize="7" fontFamily="'JetBrains Mono', monospace">
        {kcalUnit}
      </text>
    </svg>
  )
}

function MacroCell({ label, value, target, color, unit, noOver }) {
  const over = !noOver && target > 0 && value > target
  return (
    <div className={styles.macroCell}>
      <span className={styles.macroCellLabel} style={{ color }}>{label}</span>
      <span className={`${styles.macroCellVal} ${over ? styles.macroCellOver : ''}`}>
        {value}<span className={styles.macroCellUnit}>{unit}</span>
      </span>
      {target > 0 && !noOver && (
        <span className={styles.macroCellTarget}>/ {target}{unit}</span>
      )}
    </div>
  )
}
