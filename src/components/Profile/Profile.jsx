import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useHabitHistory } from '../../hooks/useHabitHistory'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { supabase } from '../../lib/supabase'
import { HABITS } from '../../data/appData'
import WeightChart from './WeightChart'
import NotificationSettings from './NotificationSettings'
import TrainingEditor from '../Coach/TrainingEditor'
import NutritionProgress from '../NutritionCards/NutritionProgress'
import ActivityCalendar from './ActivityCalendar'
import FormCheckin from './FormCheckin'
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
  const { weights, todayEntry, trend, addWeight, removeWeight } = useWeightLog()
  const history = useHabitHistory()
  const [targetWeight, setTargetWeight] = useLocalStorage('blag_target_weight_v1', '')

  const [name, setName]           = useState(profile?.name ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState(null)

  const [weightInput, setWeightInput] = useState(todayEntry ? String(todayEntry.kg) : '')
  const [weightSaved, setWeightSaved] = useState(false)
  const [targetInput, setTargetInput] = useState(String(targetWeight ?? ''))

  const [weeklyKcal, setWeeklyKcal] = useState(null)
  const [todayTotals, setTodayTotals] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const [savingCoachPlan, setSavingCoachPlan] = useState(false)
  const [weightRange, setWeightRange] = useState('1M')
  const isCoach = profile?.role === 'coach'

  // Editable macro targets (coach sets their own; clients read-only via profile)
  const [macros, setMacros] = useState({
    calories: profile?.calories ?? 2450,
    protein:  profile?.protein  ?? 180,
    carbs:    profile?.carbs    ?? 250,
    fat:      profile?.fat      ?? 70,
  })
  const [macrosSaving, setMacrosSaving] = useState(false)
  const [macrosSaved,  setMacrosSaved]  = useState(false)

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

  // Fetch today's macro totals for the nutrition progress ring
  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    supabase
      .from('food_logs')
      .select('kcal, protein, carbs, fat')
      .eq('user_id', user.id)
      .eq('date', today)
      .then(({ data }) => {
        if (!data?.length) return
        setTodayTotals(data.reduce(
          (acc, e) => ({
            kcal:    Math.round(acc.kcal    + (e.kcal    || 0)),
            protein: Math.round((acc.protein + (e.protein || 0)) * 10) / 10,
            carbs:   Math.round((acc.carbs   + (e.carbs   || 0)) * 10) / 10,
            fat:     Math.round((acc.fat     + (e.fat     || 0)) * 10) / 10,
          }),
          { kcal: 0, protein: 0, carbs: 0, fat: 0 }
        ))
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

  const RANGE_DAYS = { '2W': 14, '1M': 30, '3M': 90, 'ALL': null }
  const filteredWeights = useMemo(() => {
    const days = RANGE_DAYS[weightRange]
    if (!days) return weights
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    return weights.filter(w => w.date >= cutoff)
  }, [weights, weightRange])

  const weightStats = useMemo(() => {
    if (filteredWeights.length === 0) return null
    const kgs = filteredWeights.map(w => w.kg)
    const change = filteredWeights.length >= 2
      ? Math.round((kgs[kgs.length - 1] - kgs[0]) * 10) / 10
      : null
    return {
      count: filteredWeights.length,
      min:   Math.min(...kgs),
      max:   Math.max(...kgs),
      change,
    }
  }, [filteredWeights])

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

  async function handleMacrosSave() {
    setMacrosSaving(true)
    await updateProfile({
      calories: parseInt(macros.calories) || 0,
      protein:  parseInt(macros.protein)  || 0,
      carbs:    parseInt(macros.carbs)    || 0,
      fat:      parseInt(macros.fat)      || 0,
    })
    setMacrosSaving(false)
    setMacrosSaved(true)
    setTimeout(() => setMacrosSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ПРОФИЛ</h1>
        {profile?.name && <p className={styles.subtitle}>{profile.name}</p>}
      </header>

      {/* Activity calendar */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>АКТИВНОСТ</h2>
        <ActivityCalendar />
      </section>

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

      {/* Macro targets — editable for coach, read-only display for clients */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>
          {isCoach ? 'МОИТЕ МАКРО ЦЕЛИ' : 'ЦЕЛИ (зададени от треньора)'}
        </h2>
        <div className={styles.macroEditGrid}>
          {[
            { key: 'calories', label: 'КАЛОРИИ', unit: 'ккал', color: MACRO_COLORS.calories },
            { key: 'protein',  label: 'ПРОТЕИН',  unit: 'g',    color: MACRO_COLORS.protein  },
            { key: 'carbs',    label: 'ВЪГЛ.',    unit: 'g',    color: MACRO_COLORS.carbs    },
            { key: 'fat',      label: 'МАЗНИНИ',  unit: 'g',    color: MACRO_COLORS.fat      },
          ].map(({ key, label, unit, color }) => (
            <div key={key} className={styles.macroEditField}>
              <span className={styles.macroEditLabel} style={{ color }}>{label}</span>
              {isCoach ? (
                <input
                  className={styles.macroEditInput}
                  type="number"
                  min="0"
                  value={macros[key]}
                  onChange={e => setMacros(prev => ({ ...prev, [key]: e.target.value }))}
                />
              ) : (
                <span className={styles.macroEditValue} style={{ color }}>
                  {profile?.[key === 'calories' ? 'calories' : key] ?? '—'}
                </span>
              )}
              <span className={styles.macroEditUnit}>{unit}</span>
            </div>
          ))}
        </div>
        {isCoach && (
          <button
            className={`${styles.saveSettingsBtn} ${macrosSaved ? styles.saved : ''}`}
            onClick={handleMacrosSave}
            disabled={macrosSaving}
            type="button"
          >
            {macrosSaving ? '...' : macrosSaved ? '✓ Запазено' : 'Запази цели'}
          </button>
        )}
      </section>

      {/* Today's nutrition progress ring */}
      <NutritionProgress
        totals={todayTotals}
        targets={{
          kcal:    parseInt(macros.calories) || 0,
          protein: parseInt(macros.protein)  || 0,
          carbs:   parseInt(macros.carbs)    || 0,
          fat:     parseInt(macros.fat)      || 0,
        }}
      />

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
          <>
            <div className={styles.sparklineWrap}>
              <WeightChart
                weights={weights}
                targetWeight={targetW}
                gradId="wcProfile"
                range={weightRange}
                onRange={setWeightRange}
              />
            </div>

            {weightStats && (
              <div className={styles.weightStatsRow}>
                <div className={styles.weightStat}>
                  <span className={styles.weightStatVal}>{weightStats.count}</span>
                  <span className={styles.weightStatLabel}>записа</span>
                </div>
                <div className={styles.weightStat}>
                  <span className={styles.weightStatVal}>{weightStats.min}</span>
                  <span className={styles.weightStatLabel}>мин. kg</span>
                </div>
                <div className={styles.weightStat}>
                  <span className={styles.weightStatVal}>{weightStats.max}</span>
                  <span className={styles.weightStatLabel}>макс. kg</span>
                </div>
                {weightStats.change !== null && (
                  <div className={styles.weightStat}>
                    <span className={`${styles.weightStatVal} ${weightStats.change > 0 ? styles.up : weightStats.change < 0 ? styles.down : ''}`}>
                      {weightStats.change > 0 ? `+${weightStats.change}` : weightStats.change}
                    </span>
                    <span className={styles.weightStatLabel}>промяна kg</span>
                  </div>
                )}
              </div>
            )}

            {filteredWeights.length > 0 && (
              <div className={styles.weightTableWrap}>
                <table className={styles.weightTable}>
                  <thead>
                    <tr>
                      <th className={styles.weightTh}>Дата</th>
                      <th className={styles.weightTh}>Тегло</th>
                      <th className={styles.weightTh}>Промяна</th>
                      <th className={styles.weightTh} />
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredWeights].reverse().map((entry, i, arr) => {
                      const prev  = arr[i + 1]
                      const delta = prev ? Math.round((entry.kg - prev.kg) * 10) / 10 : null
                      const isLatest = i === 0
                      return (
                        <tr
                          key={entry.date}
                          className={`${isLatest ? styles.weightTrLatest : styles.weightTr}`}
                        >
                          <td className={styles.weightTd}>
                            {new Date(entry.date).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className={styles.weightTd}>{entry.kg} kg</td>
                          <td className={styles.weightTd}>
                            {delta === null ? '—' : (
                              <span className={delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.deltaNeutral}>
                                {delta > 0 ? `+${delta}` : delta} kg
                              </span>
                            )}
                          </td>
                          <td className={styles.weightTd}>
                            <button
                              className={styles.weightDeleteBtn}
                              onClick={() => removeWeight(entry.date)}
                              type="button"
                              aria-label="Изтрий"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
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

      {/* Form check-in: weight + photo */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>CHECK-IN НА ФОРМА</h2>
        <FormCheckin />
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
