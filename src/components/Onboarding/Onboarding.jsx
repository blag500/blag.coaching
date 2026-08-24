import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import AvatarPicker from './AvatarPicker'
import WeightScroller from './WeightScroller'
import { GOAL_ICON, CheckIcon } from './StepIcons'
import styles from './Onboarding.module.css'

const GOAL_OPTIONS = [
  { id: 'cut',      label: 'ИЗГАРЯНЕ',    desc: 'Намаляване на мастна тъкан' },
  { id: 'maintain', label: 'ПОДДЪРЖАНЕ',  desc: 'Запазване на теглото'        },
  { id: 'bulk',     label: 'ПОКАЧВАНЕ',   desc: 'Изграждане на мускулна маса' },
]

/* Big flat body silhouettes for the gender step. Kept as inline SVG so they
   tint with currentColor and never need a network round-trip on first paint. */
function ManFigure() {
  return (
    <svg viewBox="0 0 120 160" fill="currentColor" aria-hidden="true">
      <circle cx="60" cy="30" r="18" />
      <path d="M30 70c0-14 12-24 30-24s30 10 30 24v10H30V70z" />
      <path d="M22 78h18v40l-8 22h-8l-2-22V78z" />
      <path d="M98 78H80v40l8 22h8l2-22V78z" />
      <path d="M42 82h36v50l-4 26H60l-4-6-4 6H46l-4-26V82z" opacity="0.85" />
    </svg>
  )
}

function WomanFigure() {
  return (
    <svg viewBox="0 0 120 160" fill="currentColor" aria-hidden="true">
      <circle cx="60" cy="28" r="16" />
      <path d="M40 62c0-10 9-18 20-18s20 8 20 18v14H40V62z" />
      <path d="M32 78h56l-6 32H38l-6-32z" opacity="0.85" />
      <path d="M42 108h36l-10 50H52l-10-50z" />
      <path d="M46 158h10l2-14h4l2 14h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Onboarding({ isCoachingIntake = false, onChangePlan }) {
  const { profile, completeOnboarding, signOut } = useAuth()
  const knownName = (profile?.name ?? '').trim()

  // Name is already captured at signup, so skip that step when we have it.
  const [step, setStep]   = useState(knownName ? 2 : 1)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    name:      knownName,
    goal:      'maintain',
    gender:    'male',
    weight_kg: 75,
  })

  const totalSteps = 4

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function next() {
    setError('')
    if (step === 1 && !form.name.trim()) { setError('Въведи името си'); return }
    if (step === totalSteps) {
      if (isCoachingIntake) handleCoachingSubmit()
      else handleFinish()
      return
    }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    // No macros here — profile starts bare. The nutrition tab invites the
    // client to set targets when they open it, so nothing that needs a decision
    // stands between signup and the first useful screen.
    const { error: err } = await completeOnboarding({
      name:      form.name.trim(),
      goal:      form.goal,
      gender:    form.gender,
      weight_kg: form.weight_kg,
    })
    if (err) { setError(err.message); setSaving(false) }
  }

  async function handleCoachingSubmit() {
    setSaving(true)
    setError('')
    const { error: err } = await completeOnboarding({
      name:      form.name.trim(),
      goal:      form.goal,
      gender:    form.gender,
      weight_kg: form.weight_kg,
    })
    setSaving(false)
    if (err) setError(err.message)
    else setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.stepWrap} style={{ textAlign: 'center', alignItems: 'center' }}>
            <span className={styles.stepIcon}><CheckIcon /></span>
            <h1 className={styles.heading}>ЗАЯВКАТА Е ИЗПРАТЕНА</h1>
            <p className={styles.sub}>
              Треньорът ще прегледа данните ти и ще настрои индивидуален план в рамките на 24 часа.
            </p>
            <p className={styles.sub} style={{ marginTop: 12, opacity: 0.6 }}>
              Ще получиш известие когато планът е готов.
            </p>
          </div>
        </div>
        <div className={styles.nav}>
          <button className={styles.nextBtn} onClick={() => window.location.reload()} type="button">
            ВЛЕЗ В ПРИЛОЖЕНИЕТО →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {onChangePlan && (
        <button className={styles.backPlan} onClick={onChangePlan} type="button">
          ← Смени план
        </button>
      )}
      <div className={styles.progressBar}>
        {Array.from({ length: totalSteps + 1 }, (_, i) => (
          <div
            key={i}
            className={`${styles.progressDot} ${i < step ? styles.progressDotDone : ''} ${i === step ? styles.progressDotActive : ''}`}
          />
        ))}
      </div>

      <div className={styles.content}>
        {/* Step 1 — Name (only when we don't already have it) */}
        {step === 1 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>ДОБРЕ ДОШЪЛ</h1>
            <p className={styles.sub}>Нека настроим профила ти за минута.</p>
            <AvatarPicker />
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
            <p className={styles.sub}>Насочва препоръките, не заковава нищо.</p>
            <div className={styles.goalGrid}>
              {GOAL_OPTIONS.map(g => {
                const Icon = GOAL_ICON[g.id]
                return (
                  <button
                    key={g.id}
                    className={`${styles.goalCard} ${form.goal === g.id ? styles.goalCardActive : ''}`}
                    onClick={() => set('goal', g.id)}
                    type="button"
                  >
                    <span className={styles.goalIcon}><Icon /></span>
                    <span className={styles.goalText}>
                      <span className={styles.goalLabel}>{g.label}</span>
                      <span className={styles.goalDesc}>{g.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3 — Gender, one question one screen. Two big glass cards, the
            figure tinted with the accent — tap picks and lifts. */}
        {step === 3 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>ТИ СИ</h1>
            <p className={styles.sub}>Настройва манекена и препоръките за възстановяване.</p>
            <div className={styles.genderGrid}>
              <button
                type="button"
                className={`${styles.genderCard} ${form.gender === 'male' ? styles.genderCardActive : ''}`}
                onClick={() => set('gender', 'male')}
              >
                <span className={styles.genderFigure}><ManFigure /></span>
                <span className={styles.genderLabel}>МЪЖ</span>
              </button>
              <button
                type="button"
                className={`${styles.genderCard} ${form.gender === 'female' ? styles.genderCardActive : ''}`}
                onClick={() => set('gender', 'female')}
              >
                <span className={styles.genderFigure}><WomanFigure /></span>
                <span className={styles.genderLabel}>ЖЕНА</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Weight scroller. One number, easy to move, no keyboard. */}
        {step === 4 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>ТЕГЛО СЕГА</h1>
            <p className={styles.sub}>Стартова точка за графиката. Можеш да го променяш всеки ден.</p>
            <WeightScroller
              value={form.weight_kg}
              onChange={v => set('weight_kg', v)}
            />
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.nav}>
        {step > 1 && (
          <button className={styles.backBtn} onClick={() => setStep(s => s - 1)} type="button">
            ← НАЗАД
          </button>
        )}
        {step < totalSteps ? (
          <button className={styles.nextBtn} onClick={next} type="button">
            НАПРЕД →
          </button>
        ) : isCoachingIntake ? (
          <button className={styles.nextBtn} onClick={next} disabled={saving} type="button">
            {saving ? 'ИЗПРАЩА...' : 'ИЗПРАТИ ЗАЯВКАТА →'}
          </button>
        ) : (
          <button className={styles.nextBtn} onClick={next} disabled={saving} type="button">
            {saving ? 'ЗАПИСВА...' : 'ЗАПОЧНИ →'}
          </button>
        )}
      </div>

      <button className={styles.signOutLink} onClick={signOut} type="button">Изход</button>
    </div>
  )
}
