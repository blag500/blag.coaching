import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import styles from './TodayDashboard.module.css'

const DAYS_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function dateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

function daysAgoLabel(date) {
  const today = dateStr(0)
  const yesterday = dateStr(1)
  if (date === today)     return 'днес'
  if (date === yesterday) return 'вчера'
  const diff = Math.round((new Date(today) - new Date(date)) / 86400000)
  return `преди ${diff} дни`
}

export default function TodayDashboard({ onNavigate }) {
  const { profile, user } = useAuth()
  const { log, totals } = useFoodLog()
  const [workouts, setWorkouts] = useState([])

  const targets = {
    kcal:    profile?.calories ?? 0,
    protein: profile?.protein  ?? 0,
    carbs:   profile?.carbs    ?? 0,
    fat:     profile?.fat      ?? 0,
  }

  const kcalLeft   = Math.max(0, targets.kcal - (totals.kcal || 0))
  const recentFood = [...(log || [])].reverse().slice(0, 3)
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'ДОБРО УТРО' : hour < 18 ? 'ДОБЪР ДЕН' : 'ДОБЪР ВЕЧЕР'

  useEffect(() => {
    if (!user?.id) return
    const since = dateStr(13)
    supabase
      .from('exercise_logs')
      .select('block_label, completed_date')
      .eq('user_id', user.id)
      .gte('completed_date', since)
      .order('completed_date', { ascending: false })
      .then(({ data }) => { if (data) setWorkouts(data) })
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

  const lastWorkout  = workouts[0] ?? null
  const todayWorkouts = workouts.filter(w => w.completed_date === dateStr(0))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.greeting}>{greeting}</p>
        <h1 className={styles.name}>{profile?.name?.split(' ')[0]?.toUpperCase() ?? 'BLAG'}</h1>
      </header>

      {/* ── Calories card ── */}
      <div className={styles.card}>
        <span className={styles.cardLabel}>КАЛОРИИ ДНЕС</span>
        <div className={styles.pieRow}>
          <MacroPie totals={totals} targets={targets} />
          <div className={styles.legend}>
            <LegendItem color="#42A5F5" label="ПРОТЕИН"      value={Math.round(totals.protein || 0)} target={targets.protein} />
            <LegendItem color="#66BB6A" label="ВЪГЛЕХИДРАТИ" value={Math.round(totals.carbs   || 0)} target={targets.carbs}   />
            <LegendItem color="#ffb74d" label="МАЗНИНИ"      value={Math.round(totals.fat     || 0)} target={targets.fat}     />
          </div>
        </div>
        {kcalLeft > 0 && (
          <p className={styles.kcalHint}>Остават {Math.round(kcalLeft)} ккал за деня</p>
        )}
      </div>

      {/* ── Quick log button ── */}
      <button className={styles.logBtn} onClick={() => onNavigate('nutrition')} type="button">
        + ЛОГНИ ХРАНА
      </button>

      {/* ── Recent food ── */}
      {recentFood.length > 0 && (
        <div className={styles.card}>
          <span className={styles.cardLabel}>ПОСЛЕДНО ДОБАВЕНО</span>
          <div className={styles.recentList}>
            {recentFood.map((f, i) => (
              <div key={i} className={styles.recentRow}>
                <span className={styles.recentName}>{f.name}</span>
                <span className={styles.recentKcal}>{f.kcal} ккал</span>
              </div>
            ))}
          </div>
          <button className={styles.seeAll} onClick={() => onNavigate('nutrition')} type="button">
            Виж всичко →
          </button>
        </div>
      )}

      {/* ── Training card ── */}
      <button className={styles.trainingCard} onClick={() => onNavigate('training')} type="button">
        <div className={styles.trainingHeader}>
          <span className={styles.cardLabel}>ТРЕНИНГ</span>
          {streak > 1 && (
            <span className={styles.streak}>🔥 {streak} поред</span>
          )}
        </div>

        <div className={styles.dotRow}>
          {last7.map(day => (
            <div key={day.ds}
              className={`${styles.dot} ${day.done ? styles.dotDone : ''} ${day.isToday ? styles.dotToday : ''}`}
            >
              <span className={`${styles.dotLabel} ${day.done ? styles.dotLabelDone : ''} ${day.isToday && !day.done ? styles.dotLabelToday : ''}`}>
                {day.dow}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.trainingFooter}>
          {todayWorkouts.length > 0 ? (
            <span className={styles.trainingDone}>
              ✓ {todayWorkouts.map(w => w.block_label).join(' · ')} · днес
            </span>
          ) : lastWorkout ? (
            <span className={styles.trainingLast}>
              Последно: {lastWorkout.block_label} · {daysAgoLabel(lastWorkout.completed_date)}
            </span>
          ) : (
            <span className={styles.trainingEmpty}>Няма логнати тренировки</span>
          )}
          <span className={styles.trainingArrow}>→</span>
        </div>
      </button>

      {/* ── Check-in shortcut ── */}
      <button className={styles.checkinCard} onClick={() => onNavigate('profile')} type="button">
        <div className={styles.checkinText}>
          <span className={styles.cardLabel}>СЕДМИЧЕН ЧЕК-ИН</span>
          <span className={styles.checkinSub}>Снимки · Сън · Прогрес</span>
        </div>
        <span className={styles.checkinArrow}>→</span>
      </button>
    </div>
  )
}

function MacroPie({ totals, targets }) {
  const r    = 44
  const sw   = 15
  const circ = 2 * Math.PI * r

  const pKcal = (totals.protein || 0) * 4
  const cKcal = (totals.carbs   || 0) * 4
  const fKcal = (totals.fat     || 0) * 9
  const tKcal = Math.max(targets.kcal || 1, 1)

  const pLen = Math.min(pKcal / tKcal, 1) * circ
  const cLen = Math.min(cKcal / tKcal, Math.max(0, 1 - pKcal / tKcal)) * circ
  const fLen = Math.min(fKcal / tKcal, Math.max(0, 1 - (pKcal + cKcal) / tKcal)) * circ

  const over = (totals.kcal || 0) > tKcal

  return (
    <svg width="130" height="130" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth={sw} />
      {fLen > 0.5 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ffb74d" strokeWidth={sw}
          strokeDasharray={`${fLen} ${circ}`} strokeDashoffset={-(pLen + cLen)}
          transform="rotate(-90 60 60)" strokeLinecap="butt" />
      )}
      {cLen > 0.5 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#66BB6A" strokeWidth={sw}
          strokeDasharray={`${cLen} ${circ}`} strokeDashoffset={-pLen}
          transform="rotate(-90 60 60)" strokeLinecap="butt" />
      )}
      {pLen > 0.5 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#42A5F5" strokeWidth={sw}
          strokeDasharray={`${pLen} ${circ}`} strokeDashoffset={0}
          transform="rotate(-90 60 60)" strokeLinecap="butt" />
      )}
      <text x="60" y="53" textAnchor="middle"
        fill={over ? '#ef5350' : 'var(--text)'}
        fontSize="22" fontFamily="'Bebas Neue', sans-serif" letterSpacing="1">
        {Math.round(totals.kcal || 0)}
      </text>
      <text x="60" y="66" textAnchor="middle" fill="var(--muted)"
        fontSize="9" fontFamily="'JetBrains Mono', monospace">ккал</text>
      <text x="60" y="78" textAnchor="middle" fill="var(--muted)"
        fontSize="9" fontFamily="'JetBrains Mono', monospace">/ {targets.kcal}</text>
    </svg>
  )
}

function LegendItem({ color, label, value, target }) {
  const over = target > 0 && value > target
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: color }} />
      <div className={styles.legendText}>
        <span className={styles.legendLabel}>{label}</span>
        <span className={`${styles.legendVal} ${over ? styles.legendOver : ''}`}>
          {value}g <span className={styles.legendTarget}>/ {target}g</span>
        </span>
      </div>
    </div>
  )
}
