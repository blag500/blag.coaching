import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Onboarding.module.css'

const TOTAL_STEPS = 5

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Заседнал',         desc: 'Офис работа, малко или никакво движение', mult: 1.2   },
  { id: 'light',       label: 'Леко активен',      desc: '1–2 пъти спорт на седмица',              mult: 1.375 },
  { id: 'moderate',    label: 'Умерено активен',   desc: '3–5 пъти спорт на седмица',              mult: 1.55  },
  { id: 'active',      label: 'Много активен',     desc: '6–7 пъти спорт на седмица',              mult: 1.725 },
  { id: 'very_active', label: 'Изключително акт.', desc: 'Физическа работа + ежедневен спорт',     mult: 1.9   },
]

const GOAL_OPTIONS = [
  { id: 'cut',      label: 'ИЗГАРЯНЕ',    icon: '🔥', desc: 'Намаляване на мастна тъкан', kcalDelta: -400 },
  { id: 'maintain', label: 'ПОДДЪРЖАНЕ',  icon: '⚖️', desc: 'Запазване на теглото',        kcalDelta: 0    },
  { id: 'bulk',     label: 'ПОКАЧВАНЕ',   icon: '💪', desc: 'Изграждане на мускулна маса', kcalDelta: 300  },
]

function calcMacros({ gender, age, height_cm, weight_kg, activity_level, goal }) {
  const bmr = gender === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  const mult     = ACTIVITY_OPTIONS.find(a => a.id === activity_level)?.mult ?? 1.55
  const delta    = GOAL_OPTIONS.find(g => g.id === goal)?.kcalDelta ?? 0
  const calories = Math.round(bmr * mult + delta)
  const protein  = Math.round(weight_kg * 2)
  const fat      = Math.round((calories * 0.25) / 9)
  const carbs    = Math.round((calories - protein * 4 - fat * 9) / 4)
  return { calories, protein, carbs: Math.max(carbs, 0), fat }
}

export default function Onboarding() {
  const { completeOnboarding, signOut } = useAuth()
  const [step, setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    name: '', goal: 'maintain',
    gender: 'male', age: '', height_cm: '', weight_kg: '', target_weight: '',
    activity_level: 'moderate',
    calories: '', protein: '', carbs: '', fat: '',
  })

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function computeAndAdvance() {
    const macros = calcMacros({
      gender:         form.gender,
      age:            parseInt(form.age),
      height_cm:      parseFloat(form.height_cm),
      weight_kg:      parseFloat(form.weight_kg),
      activity_level: form.activity_level,
      goal:           form.goal,
    })
    setForm(prev => ({ ...prev, ...macros }))
    setStep(5)
  }

  function next() {
    setError('')
    if (step === 1 && !form.name.trim()) { setError('Въведи името си'); return }
    if (step === 3) {
      if (!form.age || !form.height_cm || !form.weight_kg) {
        setError('Попълни всички полета'); return
      }
    }
    if (step === 4) { computeAndAdvance(); return }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    const { error: err } = await completeOnboarding({
      name:           form.name.trim(),
      goal:           form.goal,
      gender:         form.gender,
      age:            parseInt(form.age)         || null,
      height_cm:      parseFloat(form.height_cm) || null,
      weight_kg:      parseFloat(form.weight_kg) || null,
      target_weight:  parseFloat(form.target_weight) || null,
      activity_level: form.activity_level,
      calories:       parseInt(form.calories),
      protein:        parseInt(form.protein),
      carbs:          parseInt(form.carbs),
      fat:            parseInt(form.fat),
    })
    if (err) { setError(err.message); setSaving(false) }
  }

  return (
    <div className={styles.page}>
      {/* Progress */}
      <div className={styles.progressBar}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`${styles.progressDot} ${i < step ? styles.progressDotDone : ''} ${i + 1 === step ? styles.progressDotActive : ''}`}
          />
        ))}
      </div>

      <div className={styles.content}>
        {/* Step 1 — Name */}
        {step === 1 && (
          <div className={styles.stepWrap}>
            <div className={styles.emoji}>👋</div>
            <h1 className={styles.heading}>ДОБРЕ ДОШЪЛ</h1>
            <p className={styles.sub}>Нека настроим профила ти за 2 минути.</p>
            <label className={styles.label}>Как се казваш?</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Твоето име"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && next()}
              autoFocus
            />
          </div>
        )}

        {/* Step 2 — Goal */}
        {step === 2 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>КАКВА Е ЦЕЛТА ТИ?</h1>
            <p className={styles.sub}>Това определя твоя калориен баланс.</p>
            <div className={styles.goalGrid}>
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.id}
                  className={`${styles.goalCard} ${form.goal === g.id ? styles.goalCardActive : ''}`}
                  onClick={() => set('goal', g.id)}
                  type="button"
                >
                  <span className={styles.goalIcon}>{g.icon}</span>
                  <span className={styles.goalLabel}>{g.label}</span>
                  <span className={styles.goalDesc}>{g.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Body stats */}
        {step === 3 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>ТЯЛОТО ТИ</h1>
            <p className={styles.sub}>Нужно за точно изчисляване на калориите.</p>

            <label className={styles.label}>Пол</label>
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

            <div className={styles.statsRow}>
              <div className={styles.statField}>
                <label className={styles.label}>Възраст</label>
                <input className={styles.input} type="number" min="10" max="100"
                  placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div className={styles.statField}>
                <label className={styles.label}>Ръст (cm)</label>
                <input className={styles.input} type="number" min="100" max="250"
                  placeholder="178" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} />
              </div>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statField}>
                <label className={styles.label}>Тегло сега (kg)</label>
                <input className={styles.input} type="number" min="30" max="300"
                  placeholder="80" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
              </div>
              <div className={styles.statField}>
                <label className={styles.label}>Цел. тегло (kg)</label>
                <input className={styles.input} type="number" min="30" max="300"
                  placeholder="75" value={form.target_weight} onChange={e => set('target_weight', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Activity */}
        {step === 4 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>АКТИВНОСТ</h1>
            <p className={styles.sub}>Колко активен си извън тренировките?</p>
            <div className={styles.activityList}>
              {ACTIVITY_OPTIONS.map(a => (
                <button
                  key={a.id}
                  className={`${styles.activityRow} ${form.activity_level === a.id ? styles.activityRowActive : ''}`}
                  onClick={() => set('activity_level', a.id)}
                  type="button"
                >
                  <div className={styles.activityLabel}>{a.label}</div>
                  <div className={styles.activityDesc}>{a.desc}</div>
                  {form.activity_level === a.id && <div className={styles.activityCheck}>✓</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 — Macros preview */}
        {step === 5 && (
          <div className={styles.stepWrap}>
            <div className={styles.emoji}>🎯</div>
            <h1 className={styles.heading}>ТВОИТЕ МАКРОСИ</h1>
            <p className={styles.sub}>Изчислени по твоите данни. Можеш да ги промениш по-късно.</p>
            <div className={styles.macroGrid}>
              {[
                { key: 'calories', label: 'ККАЛ',    color: '#F06292' },
                { key: 'protein',  label: 'ПРОТЕИН', color: '#66BB6A' },
                { key: 'carbs',    label: 'ВЪГЛ',    color: '#4FC3F7' },
                { key: 'fat',      label: 'МАЗН',    color: '#FFB74D' },
              ].map(m => (
                <div key={m.key} className={styles.macroCard} style={{ borderColor: `${m.color}40` }}>
                  <label className={styles.macroLabel} style={{ color: m.color }}>{m.label}</label>
                  <input
                    className={styles.macroInput}
                    type="number" min="0"
                    value={form[m.key]}
                    onChange={e => set(m.key, e.target.value)}
                    style={{ color: m.color }}
                  />
                  {m.key !== 'calories' && <span className={styles.macroUnit}>g</span>}
                </div>
              ))}
            </div>
            <p className={styles.macroNote}>
              {GOAL_OPTIONS.find(g => g.id === form.goal)?.icon}{' '}
              {GOAL_OPTIONS.find(g => g.id === form.goal)?.desc}
              {' · '}
              {ACTIVITY_OPTIONS.find(a => a.id === form.activity_level)?.label}
            </p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        {step > 1 && (
          <button className={styles.backBtn} onClick={() => setStep(s => s - 1)} type="button">
            ← НАЗАД
          </button>
        )}
        {step < 5 ? (
          <button className={styles.nextBtn} onClick={next} type="button">
            НАПРЕД →
          </button>
        ) : (
          <button className={styles.nextBtn} onClick={handleFinish} disabled={saving} type="button">
            {saving ? 'ЗАПИСВА...' : 'ЗАПОЧНИ →'}
          </button>
        )}
      </div>

      <button className={styles.signOutLink} onClick={signOut} type="button">Изход</button>
    </div>
  )
}
