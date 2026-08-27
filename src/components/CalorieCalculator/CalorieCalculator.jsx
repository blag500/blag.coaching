import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import CoachOffer from '../CoachOffer/CoachOffer'
import AvatarPicker from '../Onboarding/AvatarPicker'
import { GOAL_ICON, TargetIcon } from '../Onboarding/StepIcons'
import calcStyles from './CalorieCalculator.module.css'
import stepStyles from '../Onboarding/Onboarding.module.css'

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   labelKey: 'cc.act.sedentary',  descKey: 'cc.act.sedentaryDesc',  mult: 1.2   },
  { id: 'light',       labelKey: 'cc.act.light',      descKey: 'cc.act.lightDesc',      mult: 1.375 },
  { id: 'moderate',    labelKey: 'cc.act.moderate',   descKey: 'cc.act.moderateDesc',   mult: 1.55  },
  { id: 'active',      labelKey: 'cc.act.active',     descKey: 'cc.act.activeDesc',     mult: 1.725 },
  { id: 'very_active', labelKey: 'cc.act.veryActive', descKey: 'cc.act.veryActiveDesc', mult: 1.9   },
]

const GOAL_OPTIONS = [
  { id: 'cut',      labelKey: 'cc.goal.cut',      descKey: 'cc.goal.cutDesc',      kcalDelta: -400 },
  { id: 'maintain', labelKey: 'cc.goal.maintain', descKey: 'cc.goal.maintainDesc', kcalDelta: 0    },
  { id: 'bulk',     labelKey: 'cc.goal.bulk',     descKey: 'cc.goal.bulkDesc',     kcalDelta: 300  },
]

// One kilogram of body mass is worth roughly 7700 kcal. The weekly change a plan
// implies is the daily gap from maintenance, spread over seven days.
const KCAL_PER_KG = 7700

const GOAL_PRESETS = [
  { id: 'extreme_cut', labelKey: 'cc.preset.extremeCut', delta: -1000, kgPerWeek: -1,    color: '#ef5350', goal: 'cut'      },
  { id: 'cut',         labelKey: 'cc.preset.cut',        delta: -500,  kgPerWeek: -0.5,  color: '#FF7043', goal: 'cut'      },
  { id: 'mild_cut',    labelKey: 'cc.preset.mildCut',    delta: -250,  kgPerWeek: -0.25, color: '#FFA726', goal: 'cut'      },
  { id: 'maintain',    labelKey: 'cc.preset.maintain',   delta: 0,     kgPerWeek: 0,     color: '#66BB6A', goal: 'maintain' },
  { id: 'mild_bulk',   labelKey: 'cc.preset.mildBulk',   delta: 250,   kgPerWeek: 0.25,  color: '#42A5F5', goal: 'bulk'     },
  { id: 'bulk',        labelKey: 'cc.preset.bulk',       delta: 500,   kgPerWeek: 0.5,   color: '#7E57C2', goal: 'bulk'     },
  { id: 'fast_bulk',   labelKey: 'cc.preset.fastBulk',   delta: 1000,  kgPerWeek: 1,     color: '#AB47BC', goal: 'bulk'     },
]

const BMI_CATEGORIES = [
  { max: 18.5,     labelKey: 'cc.bmi.under',  color: '#42A5F5' },
  { max: 25,       labelKey: 'cc.bmi.normal', color: '#66BB6A' },
  { max: 30,       labelKey: 'cc.bmi.over',   color: '#FFA726' },
  { max: 35,       labelKey: 'cc.bmi.obese1',    color: '#FF7043' },
  { max: 40,       labelKey: 'cc.bmi.obese2',    color: '#ef5350' },
  { max: Infinity, labelKey: 'cc.bmi.obese3',    color: '#b71c1c' },
]

const PROTEIN_COEFFS = [
  { value: 2.0, label: '2.0', descKey: 'cc.protein.standard' },
  { value: 2.5, label: '2.5', descKey: 'cc.protein.athlete'  },
  { value: 3.0, label: '3.0', descKey: 'cc.protein.prep'    },
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
  const { t } = useSettings()

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
    if (step === 1 && !stepForm.name.trim()) { setStepError(t('cc.errName')); return }
    if (step === 3) {
      if (!stepForm.age || !stepForm.height_cm || !stepForm.weight_kg) {
        setStepError(t('cc.errFields')); return
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
      setStepError(error.message || t('cc.errSave'))
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
            title: tr('cc.notifTitle'),
            body: tr('cc.notifBody', { name: stepForm.name.trim() || profile?.email || tr('cc.newClient') }),
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
    if (error) setSaveError(error.message || t('cc.errSave'))
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
              <h1 className={s.heading}>{t('cc.welcome')}</h1>
              <p className={s.sub}>{t('cc.welcomeSub')}</p>

              {/* The face goes on first, so the profile is already someone's
                  the moment the numbers land. */}
              <AvatarPicker />

              <label className={s.label}>{t('cc.nameLabel')}</label>
              <input
                className={s.input}
                type="text"
                placeholder={t('cc.namePh')}
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
              <h1 className={s.heading}>{t('cc.goalHeading')}</h1>
              <p className={s.sub}>{t('cc.goalSub')}</p>
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
                        <span className={s.goalLabel}>{t(g.labelKey)}</span>
                        <span className={s.goalDesc}>{t(g.descKey)}</span>
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
              <h1 className={s.heading}>{t('cc.bodyHeading')}</h1>
              <p className={s.sub}>{t('cc.bodySub')}</p>
              <label className={s.label}>{t('cc.sex')}</label>
              <div className={s.toggle}>
                {[{ id: 'male', label: t('cc.male') }, { id: 'female', label: t('cc.female') }].map(g => (
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
                  <label className={s.label}>{t('cc.age')}</label>
                  <input className={s.input} type="number" min="10" max="100"
                    placeholder="" value={stepForm.age} onChange={e => setS('age', e.target.value)} />
                </div>
                <div className={s.statField}>
                  <label className={s.label}>{t('cc.height')}</label>
                  <input className={s.input} type="number" min="100" max="250"
                    placeholder="" value={stepForm.height_cm} onChange={e => setS('height_cm', e.target.value)} />
                </div>
              </div>
              <div className={s.statsRow}>
                <div className={s.statField}>
                  <label className={s.label}>{t('cc.weight')}</label>
                  <input className={s.input} type="number" min="30" max="300"
                    placeholder="" value={stepForm.weight_kg} onChange={e => setS('weight_kg', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Activity */}
          {step === 4 && (
            <div className={s.stepWrap}>
              <h1 className={s.heading}>{t('cc.activityHeading')}</h1>
              <p className={s.sub}>{t('cc.activitySub')}</p>
              <div className={s.activityList}>
                {ACTIVITY_OPTIONS.map(a => (
                  <button
                    key={a.id}
                    className={`${s.activityRow} ${stepForm.activity_level === a.id ? s.activityRowActive : ''}`}
                    onClick={() => setS('activity_level', a.id)}
                    type="button"
                  >
                    <div className={s.activityLabel}>{t(a.labelKey)}</div>
                    <div className={s.activityDesc}>{t(a.descKey)}</div>
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
              <h1 className={s.heading}>{t('cc.macrosHeading')}</h1>
              <p className={s.sub}>{t('cc.macrosSub')}</p>

              {/* What the plan does to the scale, in the client's own words. A
                  deficit reads "надолу", a surplus "нагоре", parity holds. */}
              <div className={s.projection}>
                <span className={s.projectionLabel}>{t('cc.projectionLabel')}</span>
                {weeklyDir === 'hold' ? (
                  <span className={s.projectionValue}>{t('cc.weightHolds')}</span>
                ) : (
                  <span className={s.projectionValue}>
                    {t('cc.weeklyKg', { n: Number(weeklyAbs.toFixed(2)) })}
                    <span className={s.projectionDir}>
                      {weeklyDir === 'down' ? t('cc.perWeekDown') : t('cc.perWeekUp')}
                    </span>
                  </span>
                )}
              </div>

              <div className={s.macroGrid}>
                {[
                  { key: 'calories', label: t('cc.kcal'),    color: '#F06292' },
                  { key: 'protein',  label: t('cc.protein'), color: 'var(--macro-protein)' },
                  { key: 'carbs',    label: t('cc.carbs'),    color: 'var(--macro-carbs)' },
                  { key: 'fat',      label: t('cc.fat'),    color: 'var(--accent)' },
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
                {t(GOAL_OPTIONS.find(g => g.id === stepForm.goal)?.descKey)}
                {' · '}
                {t(ACTIVITY_OPTIONS.find(a => a.id === stepForm.activity_level)?.labelKey)}
              </p>
              <p className={s.macroNote} style={{ opacity: 0.65, marginTop: 6 }}>
                {t('cc.computedFrom', { age: stepForm.age, height: stepForm.height_cm, weight: stepForm.weight_kg })}
                {' · '}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer',
                           color: 'var(--accent)', font: 'inherit', textDecoration: 'underline' }}
                >
                  {t('cc.fix')}
                </button>
              </p>
            </div>
          )}

          {stepError && <p className={s.error}>{stepError}</p>}
        </div>

        <div className={s.nav}>
          {step > 1 && (
            <button className={s.backBtn} onClick={() => setStep(s => s - 1)} type="button" aria-label={t('cc.back')}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
          )}
          <button className={s.nextBtn} onClick={stepNext} disabled={stepSaving} type="button">
            {t('cc.next')}
          </button>
        </div>

        <button className={s.signOutLink} onClick={signOut} type="button">{t('cc.signOut')}</button>
      </div>
    )
  }

  // ── Single-screen calculator (Explore tab) ───────────────────────────────
  const canCalc        = form.age && form.height && form.weight
  const selectedPreset = results?.goals.find(g => g.id === selectedGoal)

  return (
    <div className={calcStyles.page}>
      <header className={calcStyles.header}>
        <button className={calcStyles.backBtn} onClick={onBack} type="button" aria-label={t('cc.back')}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <h1 className={calcStyles.title}>{t('cc.title')}</h1>
        <p className={calcStyles.subtitle}>{t('cc.subtitle')}</p>
      </header>

      <div className={calcStyles.body}>
        <div className={calcStyles.section}>
          <label className={calcStyles.label}>{t('cc.sexCaps')}</label>
          <div className={calcStyles.toggle}>
            {[{ id: 'male', label: t('cc.male') }, { id: 'female', label: t('cc.female') }].map(g => (
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
            <label className={calcStyles.label}>{t('cc.ageCaps')}</label>
            <input className={calcStyles.input} type="number" min="10" max="100"
              placeholder="" value={form.age} onChange={e => set('age', e.target.value)} />
          </div>
          <div className={calcStyles.field}>
            <label className={calcStyles.label}>{t('cc.heightCaps')}</label>
            <input className={calcStyles.input} type="number" min="100" max="250"
              placeholder="" value={form.height} onChange={e => set('height', e.target.value)} />
          </div>
          <div className={calcStyles.field}>
            <label className={calcStyles.label}>{t('cc.weightCaps')}</label>
            <input className={calcStyles.input} type="number" min="30" max="300"
              placeholder="" value={form.weight} onChange={e => set('weight', e.target.value)} />
          </div>
        </div>

        <div className={calcStyles.section}>
          <label className={calcStyles.label}>{t('cc.activityCaps')}</label>
          <div className={calcStyles.activityList}>
            {ACTIVITY_OPTIONS.map(a => (
              <button
                key={a.id}
                className={`${calcStyles.activityRow} ${form.activity === a.id ? calcStyles.activityRowActive : ''}`}
                onClick={() => set('activity', a.id)}
                type="button"
              >
                <span className={calcStyles.activityLabel}>{t(a.labelKey)}</span>
                <span className={calcStyles.activityDesc}>{t(a.descKey)}</span>
                {form.activity === a.id && <span className={calcStyles.check}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={calcStyles.section}>
          <label className={calcStyles.label}>{t('cc.proteinPerKg')}</label>
          <div className={calcStyles.toggle}>
            {PROTEIN_COEFFS.map(c => (
              <button
                key={c.value}
                className={`${calcStyles.toggleBtn} ${proteinCoeff === c.value ? calcStyles.toggleBtnActive : ''}`}
                onClick={() => changeCoeff(c.value)}
                type="button"
              >
                <span>{c.label}</span>
                <span className={calcStyles.coeffDesc}>{t(c.descKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <button className={calcStyles.calcBtn} onClick={calculate} disabled={!canCalc} type="button">
          {t('cc.calculate')}
        </button>

        {results && (
          <>
            <div className={calcStyles.resultCards}>
              <div className={calcStyles.resultCard}>
                <span className={calcStyles.resultLabel}>BMR</span>
                <span className={calcStyles.resultValue}>{results.bmr}</span>
                <span className={calcStyles.resultUnit}>{t('cc.bmrUnit')}</span>
              </div>
              <div className={calcStyles.resultCard}>
                <span className={calcStyles.resultLabel}>TDEE</span>
                <span className={calcStyles.resultValue} style={{ color: 'var(--accent)' }}>{results.tdee}</span>
                <span className={calcStyles.resultUnit}>{t('cc.tdeeUnit')}</span>
              </div>
            </div>

            <div className={calcStyles.bmiCard} style={{ borderColor: results.bmiCat.color + '60' }}>
              <div className={calcStyles.bmiRow}>
                <span className={calcStyles.bmiLabel}>{t('cc.bmi')}</span>
                <span className={calcStyles.bmiValue} style={{ color: results.bmiCat.color }}>{results.bmi}</span>
              </div>
              <div className={calcStyles.bmiCat} style={{ color: results.bmiCat.color }}>{t(results.bmiCat.labelKey)}</div>
            </div>

            <div className={calcStyles.section}>
              <label className={calcStyles.label}>{t('cc.pickGoal')}</label>
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
                    <span className={calcStyles.goalLabel}>{t(g.labelKey)}</span>
                    <span className={calcStyles.goalDelta}>{t('cc.goalDelta', { sign: g.delta > 0 ? '+' : '', n: g.delta })}</span>
                    {g.kgPerWeek !== 0 && (
                      <span className={calcStyles.goalKgWeek} style={{ color: g.color }}>
                        {t('cc.kgPerWeek', { sign: g.kgPerWeek > 0 ? '+' : '', n: g.kgPerWeek })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedPreset && (
              <div className={calcStyles.macroSection}>
                <label className={calcStyles.label}>{t('cc.macrosFor', { name: t(selectedPreset.labelKey).toUpperCase() })}</label>
                <div className={calcStyles.macroGrid}>
                  {[
                    { key: 'kcal',    label: t('cc.kcal'),    val: selectedPreset.kcal,           color: '#F06292', unit: ''  },
                    { key: 'protein', label: t('cc.protein'), val: selectedPreset.macros.protein, color: 'var(--macro-protein)', unit: 'g' },
                    { key: 'carbs',   label: t('cc.carbs'),    val: selectedPreset.macros.carbs,   color: 'var(--macro-carbs)', unit: 'g' },
                    { key: 'fat',     label: t('cc.fat'),    val: selectedPreset.macros.fat,     color: 'var(--accent)', unit: 'g' },
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
                  {saved ? t('cc.savedToProfile') : saving ? t('cc.savingToProfile') : t('cc.saveToProfile')}
                </button>
              </div>
            )}
          </>
        )}

        <div className={calcStyles.disclaimer}>
          {t('cc.footnote')}
        </div>
      </div>
    </div>
  )
}
