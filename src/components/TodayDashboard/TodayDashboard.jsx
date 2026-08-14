import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import { useWaterLog } from '../../hooks/useWaterLog'
import { useSupplements } from '../../hooks/useSupplements'
import { useShop, recommendProducts } from '../../hooks/useShop'
import { useCart } from '../../hooks/useCart'
import BadgePopup from './BadgePopup'
import Confetti from './Confetti'
import Pictogram from '../Pictogram/Pictogram'
import MacroScale from './MacroScale'
import WeightCard from './WeightCard'
import ReadinessWidget from '../ReadinessWidget/ReadinessWidget'
import AppHeader from '../AppHeader/AppHeader'
import styles from './TodayDashboard.module.css'

// A colour per habit, for when it is done.
//
// Safe to use freely here in a way it was not on the training calendar: every
// chip carries its own name and its own drawing, so the colour is never what
// tells them apart — it only marks the difference between done and not. Chosen
// to fit what each one is rather than to be maximally separated.
const HABIT_COLORS = {
  water:    '#42A5F5',
  protein:  '#EF5350',
  training: 'var(--accent)',
  sleep:    '#AB47BC',
  steps:    '#66BB6A',
  nosugar:  '#FF8A65',
}
function habitColor(id) { return HABIT_COLORS[id] ?? 'var(--accent)' }

function dateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export default function TodayDashboard({ onNavigate, onMenuOpen }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const { log, totals } = useFoodLog()
  const { habits, checked, toggle: toggleHabit } = useHabitsToday()
  const { glasses, target: waterTarget, add: addWater } = useWaterLog()
  const { takenCount: suppTaken, totalCount: suppTotal } = useSupplements()
  const { products: shopProducts } = useShop()
  const cart = useCart()
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

  const recommendations = recommendProducts(shopProducts, targets, totals)

  const completedHabits = habits.filter(h => checked[h.id]).length
  const totalHabits     = habits.length || 1
  const trainedToday    = todayWorkouts.length > 0

  // ── The habits wave ──
  // Fires on the transition into "all done", never on arriving at a day that is
  // already finished — a celebration that replays every time you open the app
  // stops meaning anything by the third time.
  const [habitsCheer, setHabitsCheer] = useState(false)
  const [burst, setBurst] = useState(0)
  const prevAllHabits = useRef(null)

  useEffect(() => {
    const all = habits.length > 0 && completedHabits === habits.length
    const was = prevAllHabits.current
    prevAllHabits.current = all
    if (was === null || !all || was) return

    setHabitsCheer(true)
    setBurst(b => b + 1)
    const timer = setTimeout(() => setHabitsCheer(false), 1000)
    return () => clearTimeout(timer)
  }, [completedHabits, habits.length])

  // ── Water hitting its target ──
  // Same rule as the habits wave: it fires on the transition, not on arriving at
  // an already-finished day.
  const waterFull = waterTarget > 0 && glasses >= waterTarget
  const [waterBurst, setWaterBurst] = useState(0)
  const prevWaterFull = useRef(null)

  useEffect(() => {
    const was = prevWaterFull.current
    prevWaterFull.current = waterFull
    if (was === null || !waterFull || was) return
    setWaterBurst(b => b + 1)
  }, [waterFull])

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
      <AppHeader
        onMenuOpen={onMenuOpen}
        eyebrow={greeting}
        title={profile?.name?.split(' ')[0]?.toUpperCase() ?? 'BLAG'}
        avatarUrl={profile?.avatar_url}
        avatarInitial={(profile?.name || '?')[0].toUpperCase()}
        onAvatarClick={() => onNavigate('profile')}
      />

      {/* ── Readiness widget ── */}
      <ReadinessWidget onNavigate={onNavigate} />

      {/* ── Macros ── */}
      <MacroScale
        label={t('today.macros')}
        macros={[
          { key: 'kcal',       val: Math.round(totals.kcal    || 0), target: targets.kcal,    color: 'var(--accent)' },
          { key: 'protein', val: Math.round(totals.protein || 0), target: targets.protein, color: 'var(--macro-protein)' },
          { key: 'carbs',     val: Math.round(totals.carbs   || 0), target: targets.carbs,   color: 'var(--macro-carbs)' },
          { key: 'fat',         val: Math.round(totals.fat     || 0), target: targets.fat,     color: 'var(--macro-fat)' },
        ]}
      />

      {/* ── Water card ──
          Full is a small win and it gets the same treatment as the other two:
          it fires once when the last glass lands, and stays tappable afterwards
          so the burst can be replayed. A div rather than a button because it
          already contains one, and a button inside a button is invalid. */}
      <div
        className={`${styles.waterCard} ${waterFull ? styles.waterCardDone : ''}`}
        onClick={waterFull ? () => setWaterBurst(b => b + 1) : undefined}
        role={waterFull ? 'button' : undefined}
        tabIndex={waterFull ? 0 : undefined}
        onKeyDown={waterFull ? e => {
          if (e.key === 'Enter' || e.key === ' ') setWaterBurst(b => b + 1)
        } : undefined}
      >
        {waterBurst > 0 && <Confetti burst={`w${waterBurst}`} />}
        <span className={styles.waterLabel}>
          <Pictogram name="water" size={14} />
          {t('today.water')}
        </span>
        <div className={styles.waterGlasses}>
          {Array.from({ length: waterTarget }, (_, i) => (
            <span key={i} className={`${styles.waterDrop} ${i < glasses ? styles.waterDropFull : ''}`} />
          ))}
        </div>
        <div className={styles.waterActions}>
          <span className={styles.waterCount}>{glasses}/{waterTarget}</span>
          <button
            type="button"
            className={styles.waterBtn}
            /* Stops the tap reaching the card, so adding a glass never doubles
               as a celebration. */
            onClick={e => { e.stopPropagation(); addWater(1) }}
            aria-label="Добави чаша"
          >+</button>
        </div>
      </div>

      {/* ── Weight ──
          Directly under water, because both are morning facts and both are
          asked for once a day. Above the habits row rather than below it: the
          habits are six taps someone can do at any hour, and the weigh-in is
          the one that stops being answerable once the day has started. */}
      <WeightCard />

      {/* ── Habits ──
          Ticked here rather than prompted from here. A nudge that sends you to
          another tab to spend four seconds is a nudge most people decline, and
          habits are 20% of the readiness score — the component most often left
          empty precisely because it lived somewhere else. */}
      {habits.length > 0 && (
        <div className={`${styles.habitsCard} ${habitsCheer ? styles.habitsCheer : ''}`}>
          {habitsCheer && <Confetti burst={burst} />}
          <div className={styles.habitsHead}>
            <span className={styles.cardLabel}>{t('today.habits')}</span>
            <span className={styles.habitsCount}>
              {completedHabits}/{habits.length}
            </span>
          </div>
          <div className={styles.habitsGrid}>
            {habits.map((h, i) => (
              <button
                key={h.id}
                type="button"
                className={`${styles.habitChip} ${checked[h.id] ? styles.habitChipOn : ''}`}
                onClick={() => toggleHabit(h.id)}
                aria-pressed={!!checked[h.id]}
                title={h.label}
                style={{
                  // The chip takes its colour only once it is ticked; undone it
                  // stays neutral, so the row reads as progress rather than as
                  // six coloured buttons waiting to be pressed.
                  ...(checked[h.id] ? { '--habit': habitColor(h.id) } : null),
                  // The wave runs left to right rather than firing at once, so
                  // the row reads as a run being completed instead of a flash.
                  ...(habitsCheer ? { animationDelay: `${i * 55}ms` } : null),
                }}
              >
                <Pictogram name={h.id} size={16} className={styles.habitIcon} />
                <span className={styles.habitLabel}>{h.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* ── Quick shortcuts 2×2 grid ── */}
      <div className={styles.shortcutGrid}>
        <button className={styles.shortcutBtn} onClick={() => onNavigate('profile')} type="button">
          <span className={styles.shortcutIcon}>📋</span>
          <span className={styles.shortcutLabel}>{t('today.checkin')}</span>
        </button>
        <button className={styles.shortcutBtn} onClick={() => onNavigate('rewards')} type="button">
          <span className={styles.shortcutIcon}>⭐</span>
          <span className={styles.shortcutLabel}>{t('today.rewards')}</span>
        </button>
        <button className={styles.shortcutBtn} onClick={() => onNavigate('supplements')} type="button">
          <span className={styles.shortcutIcon}>💊</span>
          <span className={styles.shortcutLabel}>
            {suppTotal > 0 ? `${suppTaken}/${suppTotal}` : t('nav.supplements')}
          </span>
        </button>
        <button className={styles.shortcutBtn} onClick={() => onNavigate('shop')} type="button">
          <span className={styles.shortcutIcon}>🛒</span>
          <span className={styles.shortcutLabel}>{t('today.shop')}</span>
        </button>
      </div>

      {/* ── Recommendation widget ── */}
      {recommendations.length > 0 && (
        <div className={styles.recCard}>
          <div className={styles.recHeader}>
            <span className={styles.cardLabel}>{t('today.shopRec')}</span>
            <span className={styles.recDeficit}>
              {t('today.shopRecSub')} {Math.round(Math.max(0, targets.protein - (totals.protein || 0)))}g П
              {targets.kcal > 0 && Math.max(0, targets.kcal - (totals.kcal || 0)) > 100
                ? ` · ${Math.round(Math.max(0, targets.kcal - (totals.kcal || 0)))} kcal`
                : ''}
            </span>
          </div>
          <div className={styles.recList}>
            {recommendations.map(p => {
              const inCart = cart.items.find(i => i.product_id === p.id)
              return (
                <div key={p.id} className={styles.recRow}>
                  <div className={styles.recInfo}>
                    <span className={styles.recName}>{p.name}</span>
                    <span className={styles.recMacros}>{p.protein_per_serving}g П · {p.kcal_per_serving} kcal · {(p.price_stotinki / 100).toFixed(2)} лв.</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.recOrderBtn} ${inCart ? styles.recOrderBtnDone : ''}`}
                    onClick={() => { if (!inCart) { cart.addItem(p); onNavigate('shop') } }}
                  >
                    {inCart ? '✓' : t('today.shopOrder')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


