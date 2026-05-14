import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useHabitHistory } from '../../hooks/useHabitHistory'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { supabase } from '../../lib/supabase'
import { HABITS } from '../../data/appData'
import WeightSparkline from './WeightSparkline'
import NotificationSettings from './NotificationSettings'
import TrainingEditor from '../Coach/TrainingEditor'
import styles from './Profile.module.css'

  function calcStreak(history) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const e = history.get(iso)
    if (e && e.completed === e.total && e.total > 0) streak++
    else break
  }
  return streak
}

const MACRO_COLORS = {
  calories: '#F06292',
  protein:  '#66BB6A',
  carbs:    '#4FC3F7',
  fat:      '#FFB74D',
}

export default function Profile() {
  const { profile, user, updateProfile, signOut } = useAuth()
  const { weights, todayEntry, trend, addWeight } = useWeightLog()
  const history = useHabitHistory()
  const [targetWeight, setTargetWeight] = useLocalStorage('blag_target_weight_v1', '')

  const [name, setName]           = useState(profile?.name ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState(null)

  const [weightInput, setWeightInput] = useState(todayEntry ? String(todayEntry.kg) : '')
  const [weightSaved, setWeightSaved] = useState(false)
  const [targetInput, setTargetInput] = useState(String(targetWeight ?? ''))

  const [weeklyKcal, setWeeklyKcal] = useState(null)
  const [savingCoachPlan, setSavingCoachPlan] = useState(false)
  const isCoach = profile?.role === 'coach'

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile?.name])

  useEffect(() => {
    if (!user) return
    const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    supabase
      .from('food_logs')
      .select('date, kcal')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const byDate = {}
        data.forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + e.kcal })
        const days = Object.values(byDate)
        setWeeklyKcal(Math.round(days.reduce((s, v) => s + v, 0) / days.length))
      })
  }, [user?.id])

  const weeklyHabitPct = useMemo(() => {
    let completed = 0, days = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const e = history.get(iso)
      if (e) { completed += e.completed; days++ }
    }
    return days > 0 ? Math.round((completed / (days * HABITS.length)) * 100) : null
  }, [history])

  const streak = useMemo(() => calcStreak(history), [history])

  const startWeight  = weights[0]?.kg ?? null
  const latestWeight = weights[weights.length - 1]?.kg ?? null
  const targetW      = targetWeight ? parseFloat(targetWeight) : null

  let weightProgress = null
  if (startWeight && latestWeight && targetW && startWeight !== targetW) {
    if (targetW < startWeight) {
      weightProgress = Math.min(100, Math.max(0, Math.round((startWeight - latestWeight) / (startWeight - targetW) * 100)))
    } else {
      weightProgress = Math.min(100, Math.max(0, Math.round((latestWeight - startWeight) / (targetW - startWeight) * 100)))
    }
  }

  const trendLabel = trend === null ? null
    : trend > 0 ? `+${trend} kg тази седмица ↑`
    : trend < 0 ? `${trend} kg тази седмица ↓`
    : 'Без промяна тази седмица'

  async function handleNameSave(e) {
    e.preventDefault()
    setNameError(null)
    const { error } = await updateProfile({ name })
    if (error) setNameError(error.message)
    else { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000) }
  }

  function handleWeightSave(e) {
    e.preventDefault()
    const kg = parseFloat(weightInput)
    if (!kg || kg < 20 || kg > 300) return
    addWeight(kg)
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  function handleTargetSave() {
    const v = parseFloat(targetInput)
    setTargetWeight(v || '')
  }

  async function handleSaveCoachPlan(days) {
    setSavingCoachPlan(true)
    await updateProfile({ training_plan: days })
    setSavingCoachPlan(false)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ПРОФИЛ</h1>
        {profile?.name && <p className={styles.subtitle}>{profile.name}</p>}
      </header>

      {/* Weekly summary */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>СЕДМИЧНО РЕЗЮМЕ</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryBox}>
            <span className={styles.summaryValue}>
              {weeklyKcal !== null ? weeklyKcal : '—'}
            </span>
            <span className={styles.summaryLabel}>ср. ккал/ден</span>
          </div>
          <div className={styles.summaryBox}>
            <span className={styles.summaryValue}>
              {weeklyHabitPct !== null ? `${weeklyHabitPct}%` : '—'}
            </span>
            <span className={styles.summaryLabel}>навици тази седмица</span>
          </div>
          <div className={styles.summaryBox}>
            <span className={`${styles.summaryValue} ${streak > 0 ? styles.streakValue : ''}`}>
              {streak > 0 ? streak : '—'}
            </span>
            <span className={styles.summaryLabel}>поредни дни</span>
          </div>
        </div>
      </section>

      {/* Coach-set macro targets — read only */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>ЦЕЛИ (зададени от треньора)</h2>
        <div className={styles.macroGrid}>
          {[
            { key: 'calories', label: 'Калории',     unit: 'ккал', value: profile?.calories },
            { key: 'protein',  label: 'Протеин',      unit: 'g',    value: profile?.protein  },
            { key: 'carbs',    label: 'Въглехидрати', unit: 'g',    value: profile?.carbs    },
            { key: 'fat',      label: 'Мазнини',      unit: 'g',    value: profile?.fat      },
          ].map(({ key, label, unit, value }) => (
            <div key={key} className={styles.macroBox} style={{ borderColor: MACRO_COLORS[key] + '55' }}>
              <span className={styles.macroValue} style={{ color: MACRO_COLORS[key] }}>
                {value ?? '—'}
              </span>
              <span className={styles.macroUnit}>{unit}</span>
              <span className={styles.macroLabel}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Weight tracker */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>ТЕГЛО</h2>

        <form onSubmit={handleWeightSave} className={styles.weightForm}>
          <label className={styles.label} htmlFor="weight-input">Днешно тегло</label>
          <div className={styles.weightRow}>
            <input
              id="weight-input"
              className={styles.weightInput}
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="85.0"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <span className={styles.unit}>kg</span>
            <button type="submit" className={styles.saveWeightBtn}>
              {weightSaved ? '✓' : 'Запази'}
            </button>
          </div>
        </form>

        {/* Target weight */}
        <div className={styles.targetRow}>
          <label className={styles.label} htmlFor="target-input">Целево тегло</label>
          <div className={styles.weightRow}>
            <input
              id="target-input"
              className={styles.weightInput}
              type="number"
              step="0.5"
              min="30"
              max="250"
              placeholder="80.0"
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              onBlur={handleTargetSave}
            />
            <span className={styles.unit}>kg</span>
          </div>
        </div>

        {/* Progress bar */}
        {weightProgress !== null && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${weightProgress}%` }} />
            </div>
            <span className={styles.progressLabel}>{weightProgress}% към целта</span>
          </div>
        )}

        {trendLabel && <p className={styles.trend}>{trendLabel}</p>}

        {weights.length >= 2 ? (
          <div className={styles.sparklineWrap}>
            <WeightSparkline weights={weights} />
          </div>
        ) : (
          <p className={styles.emptyHint}>Запиши тегло поне 2 дни, за да видиш графика</p>
        )}
      </section>

      {/* Coach: Edit own training plan */}
      {isCoach && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>МОЙ ПЛАН</h2>
          <TrainingEditor
            initialPlan={profile.training_plan}
            onSave={handleSaveCoachPlan}
            saving={savingCoachPlan}
          />
        </section>
      )}

      {/* Name */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>ИМЕ</h2>
        <form onSubmit={handleNameSave} className={styles.nameForm}>
          <input
            className={styles.textInput}
            type="text"
            placeholder="Твоето име"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          {nameError && <p className={styles.errorMsg}>{nameError}</p>}
          <button type="submit" className={`${styles.saveSettingsBtn} ${nameSaved ? styles.saved : ''}`}>
            {nameSaved ? '✓ Запазено' : 'Запази'}
          </button>
        </form>
      </section>

      <NotificationSettings />

      <section className={styles.card}>
        <button className={styles.signOutBtn} onClick={signOut} type="button">
          Изход от акаунта
        </button>
      </section>
    </div>
  )
}
