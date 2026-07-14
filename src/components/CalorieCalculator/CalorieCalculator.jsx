import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CalorieCalculator.module.css'

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Заседнал',         desc: 'Офис работа, без спорт',        mult: 1.2   },
  { id: 'light',       label: 'Леко активен',      desc: '1–2 тренировки на седмица',      mult: 1.375 },
  { id: 'moderate',    label: 'Умерено активен',   desc: '3–5 тренировки на седмица',      mult: 1.55  },
  { id: 'active',      label: 'Много активен',     desc: '6–7 тренировки на седмица',      mult: 1.725 },
  { id: 'very_active', label: 'Изключително акт.', desc: 'Физически труд + ежедневен спорт', mult: 1.9 },
]

const GOAL_PRESETS = [
  { id: 'extreme_cut', label: 'Екстремно',  delta: -1000, color: '#ef5350' },
  { id: 'cut',         label: 'Изгаряне',   delta: -500,  color: '#FF7043' },
  { id: 'mild_cut',    label: 'Леко -',     delta: -250,  color: '#FFA726' },
  { id: 'maintain',    label: 'Поддържане', delta: 0,     color: '#66BB6A' },
  { id: 'mild_bulk',   label: 'Леко +',     delta: 250,   color: '#42A5F5' },
  { id: 'bulk',        label: 'Качване',    delta: 500,   color: '#7E57C2' },
]

const BMI_CATEGORIES = [
  { max: 18.5, label: 'Слабо тегло',    color: '#42A5F5' },
  { max: 25,   label: 'Нормално тегло', color: '#66BB6A' },
  { max: 30,   label: 'Наднормено',     color: '#FFA726' },
  { max: 35,   label: 'Затлъстяване I', color: '#FF7043' },
  { max: 40,   label: 'Затлъстяване II',color: '#ef5350' },
  { max: Infinity, label: 'Затлъстяване III', color: '#b71c1c' },
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

function macrosForKcal(kcal, weight) {
  const protein = Math.round(weight * 2)
  const fat     = Math.round((kcal * 0.25) / 9)
  const carbs   = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { protein, fat, carbs }
}

export default function CalorieCalculator({ onBack }) {
  const { profile, updateProfile } = useAuth()

  const [form, setForm] = useState({
    gender:    profile?.gender    || 'male',
    age:       profile?.age       || '',
    height:    profile?.height_cm || '',
    weight:    '',
    activity:  profile?.activity_level || 'moderate',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [results, setResults] = useState(null)
  const [selectedGoal, setSelectedGoal] = useState('maintain')

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  function calculate() {
    const age    = parseInt(form.age)
    const height = parseFloat(form.height)
    const weight = parseFloat(form.weight)
    if (!age || !height || !weight) return

    const bmr  = calcBMR(form.gender, age, height, weight)
    const mult = ACTIVITY_OPTIONS.find(a => a.id === form.activity)?.mult ?? 1.55
    const tdee = Math.round(bmr * mult)
    const bmi  = calcBMI(weight, height)
    const bmiCat = getBMICategory(bmi)

    const goals = GOAL_PRESETS.map(g => {
      const kcal = Math.max(1200, tdee + g.delta)
      return { ...g, kcal, macros: macrosForKcal(kcal, weight) }
    })

    setResults({ bmr: Math.round(bmr), tdee, bmi: bmi.toFixed(1), bmiCat, goals, weight })
    setSaved(false)
  }

  async function applyToProfile() {
    if (!results) return
    const goal = results.goals.find(g => g.id === selectedGoal)
    if (!goal) return
    setSaving(true)
    await updateProfile({
      calories:       goal.kcal,
      protein:        goal.macros.protein,
      carbs:          goal.macros.carbs,
      fat:            goal.macros.fat,
      gender:         form.gender,
      age:            parseInt(form.age) || null,
      height_cm:      parseFloat(form.height) || null,
      activity_level: form.activity,
    })
    setSaving(false)
    setSaved(true)
  }

  const canCalc = form.age && form.height && form.weight

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">← НАЗАД</button>
        <h1 className={styles.title}>КАЛОРИЕН КАЛКУЛАТОР</h1>
        <p className={styles.subtitle}>TDEE · BMR · Макроси · ИТМ</p>
      </header>

      <div className={styles.body}>
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

        {/* Stats row */}
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

        <button
          className={styles.calcBtn}
          onClick={calculate}
          disabled={!canCalc}
          type="button"
        >
          ИЗЧИСЛИ
        </button>

        {/* Results */}
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
                  </button>
                ))}
              </div>
            </div>

            {/* Macros for selected goal */}
            {(() => {
              const goal = results.goals.find(g => g.id === selectedGoal)
              if (!goal) return null
              return (
                <div className={styles.macroSection}>
                  <label className={styles.label}>МАКРОСИ ЗА "{goal.label.toUpperCase()}"</label>
                  <div className={styles.macroGrid}>
                    {[
                      { key: 'kcal',    label: 'ККАЛ',    val: goal.kcal,          color: '#F06292', unit: '' },
                      { key: 'protein', label: 'ПРОТЕИН', val: goal.macros.protein, color: '#66BB6A', unit: 'g' },
                      { key: 'carbs',   label: 'ВЪГЛ',    val: goal.macros.carbs,   color: '#4FC3F7', unit: 'g' },
                      { key: 'fat',     label: 'МАЗН',    val: goal.macros.fat,     color: '#FFB74D', unit: 'g' },
                    ].map(m => (
                      <div key={m.key} className={styles.macroCard} style={{ borderColor: m.color + '40' }}>
                        <span className={styles.macroLabel} style={{ color: m.color }}>{m.label}</span>
                        <span className={styles.macroVal} style={{ color: m.color }}>{m.val}<span className={styles.macroUnit}>{m.unit}</span></span>
                      </div>
                    ))}
                  </div>

                  <button
                    className={styles.applyBtn}
                    onClick={applyToProfile}
                    disabled={saving || saved}
                    type="button"
                  >
                    {saved ? '✓ ЗАПИСАНО В ПРОФИЛА' : saving ? 'ЗАПИСВА...' : 'ЗАПАЗИ В ПРОФИЛА'}
                  </button>
                </div>
              )
            })()}
          </>
        )}

        <div className={styles.disclaimer}>
          Изчислено по формулата Mifflin-St Jeor. Резултатите са приблизителни и зависят от редица индивидуални фактори.
        </div>
      </div>
    </div>
  )
}
