import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CalorieCalculator.module.css'

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Заседнал',         desc: 'Офис работа, без спорт',           mult: 1.2   },
  { id: 'light',       label: 'Леко активен',      desc: '1–2 тренировки на седмица',         mult: 1.375 },
  { id: 'moderate',    label: 'Умерено активен',   desc: '3–5 тренировки на седмица',         mult: 1.55  },
  { id: 'active',      label: 'Много активен',     desc: '6–7 тренировки на седмица',         mult: 1.725 },
  { id: 'very_active', label: 'Изключително акт.', desc: 'Физически труд + ежедневен спорт',  mult: 1.9   },
]

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
  { max: 18.5,     label: 'Слабо тегло',       color: '#42A5F5' },
  { max: 25,       label: 'Нормално тегло',     color: '#66BB6A' },
  { max: 30,       label: 'Наднормено',         color: '#FFA726' },
  { max: 35,       label: 'Затлъстяване I',     color: '#FF7043' },
  { max: 40,       label: 'Затлъстяване II',    color: '#ef5350' },
  { max: Infinity, label: 'Затлъстяване III',   color: '#b71c1c' },
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

const PROTEIN_COEFFS = [
  { value: 2.0, label: '2.0', desc: 'Стандарт' },
  { value: 2.5, label: '2.5', desc: 'Атлет'    },
  { value: 3.0, label: '3.0', desc: 'Prep'      },
]

function macrosForKcal(kcal, weight, proteinCoeff = 2.0) {
  const protein = Math.round(weight * proteinCoeff)
  const fat     = Math.round((kcal * 0.25) / 9)
  const carbs   = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { protein, fat, carbs }
}

// isOnboarding=true  → first-time setup; saves via completeOnboarding(), shows name field
// isOnboarding=false → tool in Explore; saves via updateProfile()
export default function CalorieCalculator({ onBack, isOnboarding = false }) {
  const { profile, updateProfile, completeOnboarding, signOut } = useAuth()

  const [name, setName] = useState(profile?.name ?? '')
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
  const [selectedGoal, setSelectedGoal]   = useState('maintain')
  const [proteinCoeff, setProteinCoeff]   = useState(2.0)

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

    if (isOnboarding && !name.trim()) { setSaveError('Въведи името си'); return }

    setSaving(true)
    setSaveError('')

    const payload = {
      calories:       goalPreset.kcal,
      protein:        goalPreset.macros.protein,
      carbs:          goalPreset.macros.carbs,
      fat:            goalPreset.macros.fat,
      gender:         form.gender,
      age:            parseInt(form.age)    || null,
      height_cm:      parseFloat(form.height) || null,
      activity_level: form.activity,
      goal:           goalPreset.goal,
    }

    let error
    try {
      if (isOnboarding) {
        ;({ error } = await completeOnboarding({
          ...payload,
          name:          name.trim(),
          weight_kg:     parseFloat(form.weight) || null,
          target_weight: null,
        }))
      } else {
        ;({ error } = await updateProfile(payload))
      }
    } catch (e) {
      error = e
    }

    setSaving(false)
    if (error) {
      console.error('CalorieCalculator save error:', error)
      setSaveError(error.message || 'Грешка при запис. Опитай пак.')
    } else {
      setSaved(true)
    }
  }

  const canCalc    = form.age && form.height && form.weight
  const canSave    = results && (!isOnboarding || name.trim())
  const selectedPreset = results?.goals.find(g => g.id === selectedGoal)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {isOnboarding ? (
          <>
            <div className={styles.onboardingBrand}>
              <span className={styles.brandName}>BLAG</span>
              <div className={styles.brandDivider} />
              <span className={styles.brandSub}>COACHING</span>
            </div>
            <h1 className={styles.title}>НАСТРОЙКА НА ПРОФИЛА</h1>
            <p className={styles.subtitle}>Изчисли нуждите си и започни</p>
          </>
        ) : (
          <>
            <button className={styles.backBtn} onClick={onBack} type="button">← НАЗАД</button>
            <h1 className={styles.title}>КАЛОРИЕН КАЛКУЛАТОР</h1>
            <p className={styles.subtitle}>TDEE · BMR · Макроси · ИТМ</p>
          </>
        )}
      </header>

      <div className={styles.body}>
        {/* Name field — onboarding only */}
        {isOnboarding && (
          <div className={styles.field}>
            <label className={styles.label}>ТВОЕТО ИМЕ</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Николай"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Gender */}
        <div className={styles.section}>
          <label className={styles.label}>ПОЛ</label>
          <div className={styles.toggle}>
            {[{ id: 'male', label: '♂ МЪЖ' }, { id: 'female', label: '♀ ЖЕНА' }].map(g => (
              <button
                key={g.id}
                className={`${styles.toggleBtn} ${form.gender === g.id ? styles.toggleBtnActive : ''}`}
                onClick={() => set('gender', g.id)}
                type="button"
              >{g.label}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.field}>
            <label className={styles.label}>ВЪЗРАСТ</label>
            <input className={styles.input} type="number" min="10" max="100"
              placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>РЪСТ (CM)</label>
            <input className={styles.input} type="number" min="100" max="250"
              placeholder="178" value={form.height} onChange={e => set('height', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>ТЕГЛО (KG)</label>
            <input className={styles.input} type="number" min="30" max="300"
              placeholder="80" value={form.weight} onChange={e => set('weight', e.target.value)} />
          </div>
        </div>

        {/* Activity */}
        <div className={styles.section}>
          <label className={styles.label}>АКТИВНОСТ</label>
          <div className={styles.activityList}>
            {ACTIVITY_OPTIONS.map(a => (
              <button
                key={a.id}
                className={`${styles.activityRow} ${form.activity === a.id ? styles.activityRowActive : ''}`}
                onClick={() => set('activity', a.id)}
                type="button"
              >
                <span className={styles.activityLabel}>{a.label}</span>
                <span className={styles.activityDesc}>{a.desc}</span>
                {form.activity === a.id && <span className={styles.check}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Protein coefficient */}
        <div className={styles.section}>
          <label className={styles.label}>ПРОТЕИН (g/кг)</label>
          <div className={styles.toggle}>
            {PROTEIN_COEFFS.map(c => (
              <button
                key={c.value}
                className={`${styles.toggleBtn} ${proteinCoeff === c.value ? styles.toggleBtnActive : ''}`}
                onClick={() => changeCoeff(c.value)}
                type="button"
              >
                <span>{c.label}</span>
                <span className={styles.coeffDesc}>{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button className={styles.calcBtn} onClick={calculate} disabled={!canCalc} type="button">
          ИЗЧИСЛИ
        </button>

        {results && (
          <>
            {/* BMR / TDEE */}
            <div className={styles.resultCards}>
              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>BMR</span>
                <span className={styles.resultValue}>{results.bmr}</span>
                <span className={styles.resultUnit}>ккал/ден в покой</span>
              </div>
              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>TDEE</span>
                <span className={styles.resultValue} style={{ color: 'var(--accent)' }}>{results.tdee}</span>
                <span className={styles.resultUnit}>ккал/ден с активност</span>
              </div>
            </div>

            {/* BMI */}
            <div className={styles.bmiCard} style={{ borderColor: results.bmiCat.color + '60' }}>
              <div className={styles.bmiRow}>
                <span className={styles.bmiLabel}>ИТМ</span>
                <span className={styles.bmiValue} style={{ color: results.bmiCat.color }}>{results.bmi}</span>
              </div>
              <div className={styles.bmiCat} style={{ color: results.bmiCat.color }}>{results.bmiCat.label}</div>
            </div>

            {/* Goal presets */}
            <div className={styles.section}>
              <label className={styles.label}>ИЗБЕРИ ЦЕЛ</label>
              <div className={styles.goalGrid}>
                {results.goals.map(g => (
                  <button
                    key={g.id}
                    className={`${styles.goalCard} ${selectedGoal === g.id ? styles.goalCardActive : ''}`}
                    style={selectedGoal === g.id ? { borderColor: g.color, background: g.color + '15' } : {}}
                    onClick={() => setSelectedGoal(g.id)}
                    type="button"
                  >
                    <span className={styles.goalKcal} style={{ color: g.color }}>{g.kcal}</span>
                    <span className={styles.goalLabel}>{g.label}</span>
                    <span className={styles.goalDelta}>{g.delta > 0 ? '+' : ''}{g.delta} ккал</span>
                    {g.kgPerWeek !== 0 && (
                      <span className={styles.goalKgWeek} style={{ color: g.color }}>
                        {g.kgPerWeek > 0 ? '+' : ''}{g.kgPerWeek} kg/сед
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Macros */}
            {selectedPreset && (
              <div className={styles.macroSection}>
                <label className={styles.label}>МАКРОСИ ЗА "{selectedPreset.label.toUpperCase()}"</label>
                <div className={styles.macroGrid}>
                  {[
                    { key: 'kcal',    label: 'ККАЛ',    val: selectedPreset.kcal,                color: '#F06292', unit: ''  },
                    { key: 'protein', label: 'ПРОТЕИН', val: selectedPreset.macros.protein,      color: '#66BB6A', unit: 'g' },
                    { key: 'carbs',   label: 'ВЪГЛ',    val: selectedPreset.macros.carbs,        color: '#4FC3F7', unit: 'g' },
                    { key: 'fat',     label: 'МАЗН',    val: selectedPreset.macros.fat,          color: '#FFB74D', unit: 'g' },
                  ].map(m => (
                    <div key={m.key} className={styles.macroCard} style={{ borderColor: m.color + '40' }}>
                      <span className={styles.macroLabel} style={{ color: m.color }}>{m.label}</span>
                      <span className={styles.macroVal} style={{ color: m.color }}>
                        {m.val}<span className={styles.macroUnit}>{m.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {saveError && <p className={styles.saveError}>{saveError}</p>}
                <button
                  className={isOnboarding ? styles.calcBtn : styles.applyBtn}
                  onClick={handleSave}
                  disabled={saving || saved || !canSave}
                  type="button"
                >
                  {saved
                    ? (isOnboarding ? '✓ ГОТОВО' : '✓ ЗАПИСАНО В ПРОФИЛА')
                    : saving
                      ? 'ЗАПИСВА...'
                      : (isOnboarding ? 'ЗАПОЧНИ →' : 'ЗАПАЗИ В ПРОФИЛА')}
                </button>
              </div>
            )}
          </>
        )}

        <div className={styles.disclaimer}>
          Изчислено по формулата Mifflin-St Jeor. Резултатите са приблизителни.
        </div>

        {isOnboarding && (
          <button className={styles.signOutLink} onClick={signOut} type="button">Изход</button>
        )}
      </div>
    </div>
  )
}
