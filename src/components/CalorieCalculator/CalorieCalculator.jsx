import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import CoachOffer from '../CoachOffer/CoachOffer'
import AvatarPicker from '../Onboarding/AvatarPicker'
import { GOAL_ICON, TargetIcon } from '../Onboarding/StepIcons'
import calcStyles from './CalorieCalculator.module.css'
import stepStyles from '../Onboarding/Onboarding.module.css'

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Заседнал',         desc: 'Офис работа, без спорт',           mult: 1.2   },
  { id: 'light',       label: 'Леко активен',      desc: '1–2 тренировки на седмица',         mult: 1.375 },
  { id: 'moderate',    label: 'Умерено активен',   desc: '3–5 тренировки на седмица',         mult: 1.55  },
  { id: 'active',      label: 'Много активен',     desc: '6–7 тренировки на седмица',         mult: 1.725 },
  { id: 'very_active', label: 'Изключително акт.', desc: 'Физически труд + ежедневен спорт',  mult: 1.9   },
]

const GOAL_OPTIONS = [
  { id: 'cut',      label: 'ИЗГАРЯНЕ',   desc: 'Намаляване на мастна тъкан', kcalDelta: -400 },
  { id: 'maintain', label: 'ПОДДЪРЖАНЕ', desc: 'Запазване на теглото',        kcalDelta: 0    },
  { id: 'bulk',     label: 'ПОКАЧВАНЕ',  desc: 'Изграждане на мускулна маса', kcalDelta: 300  },
]

// One kilogram of body mass is worth roughly 7700 kcal. The weekly change a plan
// implies is the daily gap from maintenance, spread over seven days.
const KCAL_PER_KG = 7700

const GOAL_PRESETS = [
  { id: 'extreme_cut', label: 'Екст. загуба', delta: -1000, kgPerWeek: -1,    color: '#ef5350', goal: 'cut'      },
  { id: 'cut',         label: 'Сваляне',      delta: -500,  kgPerWeek: -0.5,  color: '#FF7043', goal: 'cut'      },
  { id: 'mild_cut',    label: 'Леко сваляне', delta: -250,  kgPerWeek: -0.25, color: '#FFA726', goal: 'cut'      },
  { id: 'maintain',    label: 'Поддържане',   delta: 0,     kgPerWeek: 0,     color: '#66BB6A', goal: 'maintain' },
  { id: 'mild_bulk',   label: 'Леко качване', delta: 250,   kgPerWeek: 0.25,  color: '#42A5F5', goal: 'bulk'     },
  { id: 'bulk',        label: 'Качване',      delta: 500,   kgPerWeek: 0.5,   color: '#7E57C2', goal: 'bulk'     },
  { id: 'fast_bulk',   label: 'Бързо качване',delta: 1000,  kgPerWeek: 1,     color: '#AB47BC', goal: 'bulk'     },
]

const BMI_CATEGORIES = [
  { max: 18.5,     label: 'Слабо тегло',     color: '#42A5F5' },
  { max: 25,       label: 'Нормално тегло',   color: '#66BB6A' },
  { max: 30,       label: 'Наднормено',       color: '#FFA726' },
  { max: 35,       label: 'Затлъстяване I',   color: '#FF7043' },
  { max: 40,       label: 'Затлъстяване II',  color: '#ef5350' },
  { max: Infinity, label: 'Затлъстяване III', color: '#b71c1c' },
]

const PROTEIN_COEFFS = [
  { value: 2.0, label: '2.0', desc: 'Стандарт' },
  { value: 2.5, label: '2.5', desc: 'Атлет'    },
  { value: 3.0, label: '3.0', desc: 'Prep'      },
]

function calcBMR(gender, age, height, weight) {
  if (gender === 'male') return 10 * weight + 6.25 * height - 5 * age + 5
  return 10 * weight + 6.25 * height - 5 * age - 161
}

function calcBMI(weight, height) {
  const h = height / 100
  return weight / (h * h)
}

function getBMICategory(bmi) {
  return BMI_CATEGORIES.find(c => bmi < c.max) || BMI_CATEGORIES.at(-1)
}

function macrosForKcal(kcal, weight, proteinCoeff = 2.0) {
  const protein = Math.round(weight * proteinCoeff)
  const fat     = Math.round((kcal * 0.25) / 9)
  const carbs   = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { protein, fat, carbs }
}

function calcOnboardingMacros({ gender, age, height_cm, weight_kg, goal }) {
  const bmr   = calcBMR(gender, age, height_cm, weight_kg)
  const delta = GOAL_OPTIONS.find(g => g.id === goal)?.kcalDelta ?? 0
  const calories = Math.round(bmr * 1.55 + delta)
  const protein  = Math.round(weight_kg * 2)
  const fat      = Math.round((calories * 0.25) / 9)
  const carbs    = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return { calories, protein, carbs, fat }
}

// isOnboarding=true  → step-by-step first-time setup; saves via completeOnboarding()
// isOnboarding=false → single-screen tool in Explore; saves via updateProfile()
export default function CalorieCalculator({ onBack, isOnboarding = false, onComplete, onError }) {
  const { profile, updateProfile, completeOnboarding, selectPlan, signOut } = useAuth()

  // ── Step-flow state (used when isOnboarding=true) ────────────────────────
  const knownName = (profile?.name ?? '').trim()
  const [step, setStep]           = useState(knownName ? 2 : 1)
  const [stepError, setStepError] = useState('')
  const [stepSaving, setStepSaving] = useState(false)
  const [stepForm, setStepForm]   = useState({
    name:           knownName,
    goal:           'maintain',
    gender:         'male',
    age:            '',
    height_cm:      '',
    weight_kg:      '',
    activity_level: 'moderate',
    calories: '', protein: '', carbs: '', fat: '',
  })

  // ── Single-screen state (used when isOnboarding=false) ───────────────────
  const [form, setForm] = useState({
    gender:   profile?.gender         || 'male',
    age:      profile?.age            || '',
    height:   profile?.height_cm      || '',
    weight:   '',
    activity: profile?.activity_level || 'moderate',
  })
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState('')
  const [results, setResults]     = useState(null)
  const [selectedGoal, setSelectedGoal] = useState('maintain')
  const [proteinCoeff, setProteinCoeff] = useState(2.0)

  // ── Step helpers ─────────────────────────────────────────────────────────
  function setS(field, val) { setStepForm(prev => ({ ...prev, [field]: val })) }

  function setGoal(goal) {
    setStepForm(prev => ({ ...prev, goal }))
  }

  const TOTAL_STEPS = 5

  function stepNext() {
    setStepError('')
    if (step === 1 && !stepForm.name.trim()) { setStepError('Въведи името си'); return }
    if (step === 3) {
      if (!stepForm.age || !stepForm.height_cm || !stepForm.weight_kg) {
        setStepError('Попълни всички полета'); return
      }
      const macros = calcOnboardingMacros({
        gender:    stepForm.gender,
        age:       parseInt(stepForm.age),
        height_cm: parseFloat(stepForm.height_cm),
        weight_kg: parseFloat(stepForm.weight_kg),
        goal:      stepForm.goal,
      })
      setStepForm(prev => ({ ...prev, ...macros }))
    }
    // Step 5 advances to upsell screen (step 6) without saving yet
    setStep(s => s + 1)
  }

  async function handleStepFinish(plan = 'free') {
    setStepSaving(true)
    setStepError('')

    /* Arm the success screen before the save, so the app cuts straight from the
       poster to the seal — no flash of the tabs, and no flash of the coaching
       intake when selectPlan('pro') briefly flips the tier below. App holds the
       success screen in front until the client taps in; if the save fails,
       onError pulls it back down to this flow to retry. */
    onComplete?.(stepForm.name.trim())

    /* Everyone finishes registration as a self-serve client. Writing to the
       coach is an intent, signalled by the push below — it must NOT set the
       tier to 'pro' here: 'pro' is the coach's to grant when he accepts, and
       flipping it now reclassifies the client mid-flow, so App swaps this setup
       for the coaching intake and the registration can never complete. */
    await selectPlan('free')
    const { error } = await completeOnboarding({
      name:           stepForm.name.trim(),
      goal:           stepForm.goal,
      gender:         stepForm.gender,
      age:            parseInt(stepForm.age)         || null,
      height_cm:      parseFloat(stepForm.height_cm) || null,
      weight_kg:      parseFloat(stepForm.weight_kg) || null,
      target_weight:  null,
      activity_level: stepForm.activity_level,
      calories:       parseInt(stepForm.calories),
      protein:        parseInt(stepForm.protein),
      carbs:          parseInt(stepForm.carbs),
      fat:            parseInt(stepForm.fat),
    })
    setStepSaving(false)
    if (error) {
      setStepError(error.message || 'Грешка при запис. Опитай пак.')
      onError?.()
      return
    }

    /* The DM is the real signal, but it is a signal that only exists if the
       client actually sends it. A push means the interest is known even when
       the message never gets written — and plan_pending files them under the
       coach's "ЧАКАЩИ ОДОБРЕНИЕ" list, separated from the self-serve clients,
       so a coaching request is visible even if the message never arrives. */
    if (plan === 'pro') {
      await updateProfile({ plan_pending: true })
      const coachId = profile?.coach_id
      if (coachId) {
        supabase.functions.invoke('send-push', {
          body: {
            toUserId: coachId,
            title: 'Нова заявка за треньор',
            body: `${stepForm.name.trim() || profile?.email || 'Нов клиент'} иска безплатна тренировка`,
          },
        }).catch(() => {})
      }
    }
  }

  // ── Calc helpers ─────────────────────────────────────────────────────────
  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  function calculate() {
    const age    = parseInt(form.age)
    const height = parseFloat(form.height)
    const weight = parseFloat(form.weight)
    if (!age || !height || !weight) return

    const bmr    = calcBMR(form.gender, age, height, weight)
    const mult   = ACTIVITY_OPTIONS.find(a => a.id === form.activity)?.mult ?? 1.55
    const tdee   = Math.round(bmr * mult)
    const bmi    = calcBMI(weight, height)
    const bmiCat = getBMICategory(bmi)

    const goals = GOAL_PRESETS.map(g => {
      const kcal = tdee + g.delta
      return { ...g, kcal, macros: macrosForKcal(kcal, weight, proteinCoeff) }
    })

    setResults({ bmr: Math.round(bmr), tdee, bmi: bmi.toFixed(1), bmiCat, goals, weight })
    setSaved(false)
  }

  function changeCoeff(coeff) {
    setProteinCoeff(coeff)
    if (!results) return
    const goals = GOAL_PRESETS.map(g => {
      const kcal = results.tdee + g.delta
      return { ...g, kcal, macros: macrosForKcal(kcal, results.weight, coeff) }
    })
    setResults(prev => ({ ...prev, goals }))
    setSaved(false)
  }

  async function handleSave() {
    if (!results) return
    const goalPreset = results.goals.find(g => g.id === selectedGoal)
    if (!goalPreset) return

    setSaving(true)
    setSaveError('')

    const payload = {
      calories:       goalPreset.kcal,
      protein:        goalPreset.macros.protein,
      carbs:          goalPreset.macros.carbs,
      fat:            goalPreset.macros.fat,
      gender:         form.gender,
      age:            parseInt(form.age)      || null,
      height_cm:      parseFloat(form.height) || null,
      activity_level: form.activity,
      goal:           goalPreset.goal,
    }

    let error
    try { ;({ error } = await updateProfile(payload)) } catch (e) { error = e }

    setSaving(false)
    if (error) setSaveError(error.message || 'Грешка при запис. Опитай пак.')
    else setSaved(true)
  }

  // ── Onboarding step UI ───────────────────────────────────────────────────
  if (isOnboarding) {
    const s = stepStyles

    /* What the calorie target implies for the scale. Measured against
       maintenance (the same 1.55 the macro calculator uses), not the goal's
       nominal delta, so a client who hand-edits the calories on this screen
       sees the projection follow. */
    const bmrNow = calcBMR(
      stepForm.gender,
      parseInt(stepForm.age) || 0,
      parseFloat(stepForm.height_cm) || 0,
      parseFloat(stepForm.weight_kg) || 0,
    )
    const maintenanceKcal = Math.round(bmrNow * 1.55)
    const currentKcal     = parseInt(stepForm.calories) || maintenanceKcal
    const weeklyKg        = ((currentKcal - maintenanceKcal) * 7) / KCAL_PER_KG
    const weeklyAbs       = Math.abs(weeklyKg)
    const weeklyDir       = weeklyAbs < 0.03 ? 'hold' : weeklyKg > 0 ? 'up' : 'down'

    /* The last step is the poster, whole — its own screen rather than a step
       inside the form. Nothing of the wizard belongs on it: no progress rail
       above a decision that is not part of the count, and no ← НАЗАД, because
       the numbers behind it are already calculated and can be changed from
       inside the app. */
    if (step === 6) return (
      <CoachOffer
        saving={stepSaving}
        error={stepError}
        onWrite={() => handleStepFinish('pro')}
        onSkip={() => handleStepFinish('free')}
      />
    )

    return (
      <div className={s.page}>
        <div className={s.progressBar}>
          {Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => (
            <div
              key={i}
              className={`${s.progressDot} ${i < step ? s.progressDotDone : ''} ${i === step ? s.progressDotActive : ''}`}
            />
          ))}
        </div>

        <div className={s.content}>
          {/* Step 1 — Name */}
          {step === 1 && (
            <div className={s.stepWrap}>
              <h1 className={s.heading}>ДОБРЕ ДОШЪЛ</h1>
              <p className={s.sub}>Нека настроим профила ти за 2 минути.</p>

              {/* The face goes on first, so the profile is already someone's
                  the moment the numbers land. */}
              <AvatarPicker />

              <label className={s.label}>Как се казваш?</label>
              <input
                className={s.input}
                type="text"
                placeholder="Твоето име"
                value={stepForm.name}
                onChange={e => setS('name', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && stepNext()}
                autoFocus
              />
            </div>
          )}

          {/* Step 2 — Goal */}
          {step === 2 && (
            <div className={s.stepWrap}>
              <h1 className={s.heading}>КАКВА Е ЦЕЛТА ТИ?</h1>
              <p className={s.sub}>Това определя твоя калориен баланс.</p>
              <div className={s.goalGrid}>
                {GOAL_OPTIONS.map(g => {
                  const Icon = GOAL_ICON[g.id]
                  return (
                    <button
                      key={g.id}
                      className={`${s.goalCard} ${stepForm.goal === g.id ? s.goalCardActive : ''}`}
                      onClick={() => setGoal(g.id)}
                      type="button"
                    >
                      <span className={s.goalIcon}><Icon /></span>
                      <span className={s.goalText}>
                        <span className={s.goalLabel}>{g.label}</span>
                        <span className={s.goalDesc}>{g.desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3 — Body */}
          {step === 3 && (
            <div className={s.stepWrap}>
              <h1 className={s.heading}>ТЯЛОТО ТИ</h1>
              <p className={s.sub}>Нужно за точно изчисляване на калориите.</p>
              <label className={s.label}>Пол</label>
              <div className={s.toggle}>
                {[{ id: 'male', label: '♂ МЪЖ' }, { id: 'female', label: '♀ ЖЕНА' }].map(g => (
                  <button
                    key={g.id}
                    className={`${s.toggleBtn} ${stepForm.gender === g.id ? s.toggleBtnActive : ''}`}
                    onClick={() => setS('gender', g.id)}
                    type="button"
                  >{g.label}</button>
                ))}
              </div>
              <div className={s.statsRow}>
                <div className={s.statField}>
                  <label className={s.label}>Възраст</label>
                  <input className={s.input} type="number" min="10" max="100"
                    placeholder="" value={stepForm.age} onChange={e => setS('age', e.target.value)} />
                </div>
                <div className={s.statField}>
                  <label className={s.label}>Ръст (cm)</label>
                  <input className={s.input} type="number" min="100" max="250"
                    placeholder="" value={stepForm.height_cm} onChange={e => setS('height_cm', e.target.value)} />
                </div>
              </div>
              <div className={s.statsRow}>
                <div className={s.statField}>
                  <label className={s.label}>Тегло (kg)</label>
                  <input className={s.input} type="number" min="30" max="300"
                    placeholder="" value={stepForm.weight_kg} onChange={e => setS('weight_kg', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Activity */}
          {step === 4 && (
            <div className={s.stepWrap}>
              <h1 className={s.heading}>АКТИВНОСТ</h1>
              <p className={s.sub}>Колко активен си извън тренировките?</p>
              <div className={s.activityList}>
                {ACTIVITY_OPTIONS.map(a => (
                  <button
                    key={a.id}
                    className={`${s.activityRow} ${stepForm.activity_level === a.id ? s.activityRowActive : ''}`}
                    onClick={() => setS('activity_level', a.id)}
                    type="button"
                  >
                    <div className={s.activityLabel}>{a.label}</div>
                    <div className={s.activityDesc}>{a.desc}</div>
                    {stepForm.activity_level === a.id && <div className={s.activityCheck}>✓</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Macros */}
          {step === 5 && (
            <div className={s.stepWrap}>
              <span className={s.stepIcon}><TargetIcon /></span>
              <h1 className={s.heading}>ТВОИТЕ МАКРОСИ</h1>
              <p className={s.sub}>Изчислени по твоите данни. Можеш да ги промениш по-късно.</p>

              {/* What the plan does to the scale, in the client's own words. A
                  deficit reads "надолу", a surplus "нагоре", parity holds. */}
              <div className={s.projection}>
                <span className={s.projectionLabel}>ОЧАКВАНА ПРОМЯНА</span>
                {weeklyDir === 'hold' ? (
                  <span className={s.projectionValue}>Теглото се задържа</span>
                ) : (
                  <span className={s.projectionValue}>
                    ≈ {Number(weeklyAbs.toFixed(2))} кг
                    <span className={s.projectionDir}>
                      {weeklyDir === 'down' ? ' надолу' : ' нагоре'} / седмица
                    </span>
                  </span>
                )}
              </div>

              <div className={s.macroGrid}>
                {[
                  { key: 'calories', label: 'ККАЛ',    color: '#F06292' },
                  { key: 'protein',  label: 'ПРОТЕИН', color: 'var(--macro-protein)' },
                  { key: 'carbs',    label: 'ВЪГЛ',    color: 'var(--macro-carbs)' },
                  { key: 'fat',      label: 'МАЗН',    color: 'var(--accent)' },
                ].map(m => (
                  <div key={m.key} className={s.macroCard} style={{ borderColor: `${m.color}40` }}>
                    <label className={s.macroLabel} style={{ color: m.color }}>{m.label}</label>
                    <input
                      className={s.macroInput}
                      type="number" min="0"
                      value={stepForm[m.key]}
                      onChange={e => setS(m.key, e.target.value)}
                      style={{ color: m.color }}
                    />
                    {m.key !== 'calories' && <span className={s.macroUnit}>g</span>}
                  </div>
                ))}
              </div>
              <p className={s.macroNote}>
                {GOAL_OPTIONS.find(g => g.id === stepForm.goal)?.desc}
                {' · '}
                {ACTIVITY_OPTIONS.find(a => a.id === stepForm.activity_level)?.label}
              </p>
              <p className={s.macroNote} style={{ opacity: 0.65, marginTop: 6 }}>
                Сметнато за {stepForm.age} г. · {stepForm.height_cm} см · {stepForm.weight_kg} кг
                {' · '}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer',
                           color: 'var(--accent)', font: 'inherit', textDecoration: 'underline' }}
                >
                  поправи
                </button>
              </p>
            </div>
          )}

          {stepError && <p className={s.error}>{stepError}</p>}
        </div>

        <div className={s.nav}>
          {step > 1 && (
            <button className={s.backBtn} onClick={() => setStep(s => s - 1)} type="button">
              ← НАЗАД
            </button>
          )}
          <button className={s.nextBtn} onClick={stepNext} disabled={stepSaving} type="button">
            НАПРЕД →
          </button>
        </div>

        <button className={s.signOutLink} onClick={signOut} type="button">Изход</button>
      </div>
    )
  }

  // ── Single-screen calculator (Explore tab) ───────────────────────────────
  const canCalc        = form.age && form.height && form.weight
  const selectedPreset = results?.goals.find(g => g.id === selectedGoal)

  return (
    <div className={calcStyles.page}>
      <header className={calcStyles.header}>
        <button className={calcStyles.backBtn} onClick={onBack} type="button" aria-label="Назад">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <h1 className={calcStyles.title}>КАЛОРИЕН КАЛКУЛАТОР</h1>
        <p className={calcStyles.subtitle}>TDEE · BMR · Макроси · ИТМ</p>
      </header>

      <div className={calcStyles.body}>
        <div className={calcStyles.section}>
          <label className={calcStyles.label}>ПОЛ</label>
          <div className={calcStyles.toggle}>
            {[{ id: 'male', label: '♂ МЪЖ' }, { id: 'female', label: '♀ ЖЕНА' }].map(g => (
              <button
                key={g.id}
                className={`${calcStyles.toggleBtn} ${form.gender === g.id ? calcStyles.toggleBtnActive : ''}`}
                onClick={() => set('gender', g.id)}
                type="button"
              >{g.label}</button>
            ))}
          </div>
        </div>

        <div className={calcStyles.statsGrid}>
          <div className={calcStyles.field}>
            <label className={calcStyles.label}>ВЪЗРАСТ</label>
            <input className={calcStyles.input} type="number" min="10" max="100"
              placeholder="" value={form.age} onChange={e => set('age', e.target.value)} />
          </div>
          <div className={calcStyles.field}>
            <label className={calcStyles.label}>РЪСТ (CM)</label>
            <input className={calcStyles.input} type="number" min="100" max="250"
              placeholder="" value={form.height} onChange={e => set('height', e.target.value)} />
          </div>
          <div className={calcStyles.field}>
            <label className={calcStyles.label}>ТЕГЛО (KG)</label>
            <input className={calcStyles.input} type="number" min="30" max="300"
              placeholder="" value={form.weight} onChange={e => set('weight', e.target.value)} />
          </div>
        </div>

        <div className={calcStyles.section}>
          <label className={calcStyles.label}>АКТИВНОСТ</label>
          <div className={calcStyles.activityList}>
            {ACTIVITY_OPTIONS.map(a => (
              <button
                key={a.id}
                className={`${calcStyles.activityRow} ${form.activity === a.id ? calcStyles.activityRowActive : ''}`}
                onClick={() => set('activity', a.id)}
                type="button"
              >
                <span className={calcStyles.activityLabel}>{a.label}</span>
                <span className={calcStyles.activityDesc}>{a.desc}</span>
                {form.activity === a.id && <span className={calcStyles.check}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={calcStyles.section}>
          <label className={calcStyles.label}>ПРОТЕИН (g/кг)</label>
          <div className={calcStyles.toggle}>
            {PROTEIN_COEFFS.map(c => (
              <button
                key={c.value}
                className={`${calcStyles.toggleBtn} ${proteinCoeff === c.value ? calcStyles.toggleBtnActive : ''}`}
                onClick={() => changeCoeff(c.value)}
                type="button"
              >
                <span>{c.label}</span>
                <span className={calcStyles.coeffDesc}>{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button className={calcStyles.calcBtn} onClick={calculate} disabled={!canCalc} type="button">
          ИЗЧИСЛИ
        </button>

        {results && (
          <>
            <div className={calcStyles.resultCards}>
              <div className={calcStyles.resultCard}>
                <span className={calcStyles.resultLabel}>BMR</span>
                <span className={calcStyles.resultValue}>{results.bmr}</span>
                <span className={calcStyles.resultUnit}>ккал/ден в покой</span>
              </div>
              <div className={calcStyles.resultCard}>
                <span className={calcStyles.resultLabel}>TDEE</span>
                <span className={calcStyles.resultValue} style={{ color: 'var(--accent)' }}>{results.tdee}</span>
                <span className={calcStyles.resultUnit}>ккал/ден с активност</span>
              </div>
            </div>

            <div className={calcStyles.bmiCard} style={{ borderColor: results.bmiCat.color + '60' }}>
              <div className={calcStyles.bmiRow}>
                <span className={calcStyles.bmiLabel}>ИТМ</span>
                <span className={calcStyles.bmiValue} style={{ color: results.bmiCat.color }}>{results.bmi}</span>
              </div>
              <div className={calcStyles.bmiCat} style={{ color: results.bmiCat.color }}>{results.bmiCat.label}</div>
            </div>

            <div className={calcStyles.section}>
              <label className={calcStyles.label}>ИЗБЕРИ ЦЕЛ</label>
              <div className={calcStyles.goalGrid}>
                {results.goals.map(g => (
                  <button
                    key={g.id}
                    className={`${calcStyles.goalCard} ${selectedGoal === g.id ? calcStyles.goalCardActive : ''}`}
                    style={selectedGoal === g.id ? { borderColor: g.color, background: g.color + '15' } : {}}
                    onClick={() => setSelectedGoal(g.id)}
                    type="button"
                  >
                    <span className={calcStyles.goalKcal} style={{ color: g.color }}>{g.kcal}</span>
                    <span className={calcStyles.goalLabel}>{g.label}</span>
                    <span className={calcStyles.goalDelta}>{g.delta > 0 ? '+' : ''}{g.delta} ккал</span>
                    {g.kgPerWeek !== 0 && (
                      <span className={calcStyles.goalKgWeek} style={{ color: g.color }}>
                        {g.kgPerWeek > 0 ? '+' : ''}{g.kgPerWeek} kg/сед
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedPreset && (
              <div className={calcStyles.macroSection}>
                <label className={calcStyles.label}>МАКРОСИ ЗА "{selectedPreset.label.toUpperCase()}"</label>
                <div className={calcStyles.macroGrid}>
                  {[
                    { key: 'kcal',    label: 'ККАЛ',    val: selectedPreset.kcal,           color: '#F06292', unit: ''  },
                    { key: 'protein', label: 'ПРОТЕИН', val: selectedPreset.macros.protein, color: 'var(--macro-protein)', unit: 'g' },
                    { key: 'carbs',   label: 'ВЪГЛ',    val: selectedPreset.macros.carbs,   color: 'var(--macro-carbs)', unit: 'g' },
                    { key: 'fat',     label: 'МАЗН',    val: selectedPreset.macros.fat,     color: 'var(--accent)', unit: 'g' },
                  ].map(m => (
                    <div key={m.key} className={calcStyles.macroCard} style={{ borderColor: m.color + '40' }}>
                      <span className={calcStyles.macroLabel} style={{ color: m.color }}>{m.label}</span>
                      <span className={calcStyles.macroVal} style={{ color: m.color }}>
                        {m.val}<span className={calcStyles.macroUnit}>{m.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {saveError && <p className={calcStyles.saveError}>{saveError}</p>}
                <button
                  className={calcStyles.applyBtn}
                  onClick={handleSave}
                  disabled={saving || saved}
                  type="button"
                >
                  {saved ? '✓ ЗАПИСАНО В ПРОФИЛА' : saving ? 'ЗАПИСВА...' : 'ЗАПАЗИ В ПРОФИЛА'}
                </button>
              </div>
            )}
          </>
        )}

        <div className={calcStyles.disclaimer}>
          Изчислено по формулата Mifflin-St Jeor. Резултатите са приблизителни.
        </div>
      </div>
    </div>
  )
}
