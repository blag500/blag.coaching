import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { registerPushSubscription } from '../../hooks/usePushNotifications'
import { supabase } from '../../lib/supabase'
import AvatarPicker from './AvatarPicker'
import WeightScroller from './WeightScroller'
import CoachOffer from '../CoachOffer/CoachOffer'
import { GOAL_ICON, CheckIcon } from './StepIcons'
import styles from './Onboarding.module.css'

const GOAL_OPTIONS = [
  { id: 'cut',      label: 'ИЗГАРЯНЕ',    desc: 'Намаляване на мастна тъкан', kcalDelta: -400 },
  { id: 'maintain', label: 'ПОДДЪРЖАНЕ',  desc: 'Запазване на теглото',        kcalDelta: 0    },
  { id: 'bulk',     label: 'ПОКАЧВАНЕ',   desc: 'Изграждане на мускулна маса', kcalDelta: 300  },
]

/* Activity levels stay a real 5-way question — the multipliers used to size the
   maintenance target are Mifflin's, so squashing them into three would move
   the daily calorie ceiling by hundreds. Icons over labels so the row scans as
   a set of decisions, not a wall of text. */
const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Заседнал',        desc: 'Офис работа, без спорт',              mult: 1.2,   icon: 'chair' },
  { id: 'light',       label: 'Леко активен',    desc: '1–2 тренировки на седмица',            mult: 1.375, icon: 'walk'  },
  { id: 'moderate',    label: 'Умерено активен', desc: '3–5 тренировки на седмица',            mult: 1.55,  icon: 'run'   },
  { id: 'active',      label: 'Много активен',   desc: '6–7 тренировки на седмица',            mult: 1.725, icon: 'lift'  },
  { id: 'very_active', label: 'Изключително',    desc: 'Физически труд + ежедневен спорт',     mult: 1.9,   icon: 'bolt'  },
]

/* Macros derived from weight, gender, activity, goal — the two numbers we don't
   ask for (age, height) are held at population averages, close enough to feed
   Mifflin without another two screens of scrollers. A grown-up who cares about
   the exactness can edit both later on the profile screen. */
const ASSUMED_AGE       = 30
const ASSUMED_HEIGHT_M  = 175
const ASSUMED_HEIGHT_F  = 165

function calcBMR(gender, age, height, weight) {
  return gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161
}

function macrosFromForm({ gender, weight_kg, activity, goal }) {
  const height = gender === 'female' ? ASSUMED_HEIGHT_F : ASSUMED_HEIGHT_M
  const bmr    = calcBMR(gender, ASSUMED_AGE, height, weight_kg)
  const mult   = ACTIVITY_OPTIONS.find(a => a.id === activity)?.mult ?? 1.55
  const delta  = GOAL_OPTIONS.find(g => g.id === goal)?.kcalDelta ?? 0
  const calories = Math.max(1200, Math.round(bmr * mult + delta))
  const protein  = Math.round(weight_kg * 2)
  const fat      = Math.round((calories * 0.25) / 9)
  const carbs    = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return { calories, protein, carbs, fat }
}

const ACTIVITY_ICON = {
  chair: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v8H6z" />
      <path d="M5 12h14" />
      <path d="M7 12v9M17 12v9" />
      <path d="M4 21h16" />
    </svg>
  ),
  walk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4.5" r="1.6" />
      <path d="M11 21l2-6-3-3 2-5 3 3h3" />
      <path d="M13 15l-3 6" />
    </svg>
  ),
  run: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="15" cy="4.5" r="1.6" />
      <path d="M6 20l4-5 2 3 4-5-2-4h4" />
      <path d="M5 10l4-1" />
    </svg>
  ),
  lift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6" />
      <path d="M20 9v6" />
      <path d="M2 11v2" />
      <path d="M22 11v2" />
      <path d="M4 12h16" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" />
    </svg>
  ),
}

/* Minimal, single-stroke body silhouettes for the gender step. The difference
   between the two is drawn — wider shoulders / narrower hips for the male
   figure, narrower shoulders / hip curve for the female — instead of relying
   on props like hair or clothing, which read as caricature at a small size.
   Colour comes from currentColor so the card's accent state tints them. */
function ManFigure() {
  return (
    <svg viewBox="0 0 120 200" aria-hidden="true">
      <g fill="currentColor">
        {/* Head */}
        <circle cx="60" cy="26" r="16" />
        {/* Neck + shoulders — a strong triangle tapering to the waist */}
        <path d="M52 44h16v6h6c14 0 24 8 26 22l4 22c1 6-3 10-9 10h-6l-3-24h-2v34h-8v46c0 3-2 5-5 5s-5-2-5-5v-32h-6v32c0 3-2 5-5 5s-5-2-5-5v-46h-8V80h-2l-3 24h-6c-6 0-10-4-9-10l4-22c2-14 12-22 26-22h6v-6z" />
      </g>
    </svg>
  )
}

function WomanFigure() {
  return (
    <svg viewBox="0 0 120 200" aria-hidden="true">
      <g fill="currentColor">
        {/* Head */}
        <circle cx="60" cy="26" r="15" />
        {/* Torso with hourglass silhouette — narrower shoulders, cinched
            waist, flared hips reading as skirt/hip curve. */}
        <path d="M52 43h16v5h4c12 0 20 8 22 20l3 18c1 5-3 9-8 9h-5l-3-16v10l14 32c1 3-1 6-4 6h-52c-3 0-5-3-4-6l14-32V79l-3 16h-5c-5 0-9-4-8-9l3-18c2-12 10-20 22-20h4v-5z" />
        {/* Legs — two slim shapes from the hip curve down */}
        <path d="M46 132h12l-2 52c0 3-2 5-5 5s-5-2-5-5l-4-46zM62 132h12l4 52c0 3-2 5-5 5s-5-2-5-5l-2-46z" opacity="0.9" />
      </g>
    </svg>
  )
}

export default function Onboarding({ isCoachingIntake = false, onChangePlan, onComplete, onError }) {
  const { profile, session, completeOnboarding, updateProfile, selectPlan, signOut } = useAuth()
  const knownName = (profile?.name ?? '').trim()

  // Name is already captured at signup, so skip that step when we have it.
  const [step, setStep]   = useState(knownName ? 2 : 1)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  // For self-serve, the final screen is the coach upsell — shown once macros
  // are saved and the client is technically inside the app.
  const [showCoachOffer, setShowCoachOffer] = useState(false)

  const [form, setForm] = useState({
    name:      knownName,
    goal:      'maintain',
    gender:    'male',
    weight_kg: 75,
    activity:  'moderate',
  })

  const [notifyState, setNotifyState] = useState('idle')

  const totalSteps = 6 // name, goal, gender, weight, activity, notifications

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function next() {
    setError('')
    if (step === 1 && !form.name.trim()) { setError('Въведи името си'); return }
    if (step === totalSteps) {
      finish()
      return
    }
    setStep(s => s + 1)
  }

  async function allowThenFinish() {
    await requestNotifications()
    finish()
  }

  async function requestNotifications() {
    if (!('Notification' in window)) { setNotifyState('unsupported'); return }
    try {
      const perm = await Notification.requestPermission()
      setNotifyState(perm === 'granted' ? 'granted' : 'denied')
      if (perm === 'granted' && session?.user?.id) {
        registerPushSubscription(session.user.id).catch(() => {})
      }
    } catch { setNotifyState('denied') }
  }

  async function finish() {
    if (isCoachingIntake) return handleCoachingSubmit()
    return handleSelfServeFinish()
  }

  async function handleSelfServeFinish() {
    setSaving(true)
    setError('')
    const macros = macrosFromForm(form)
    // Free tier is what self-serve accounts always begin as. The coach upsell
    // that follows is a *request* — the tier only flips to pro if the client
    // taps it and the coach later accepts. Flipping it here would move them into
    // the coaching-intake flow mid-save.
    await selectPlan('free')
    const { error: err } = await completeOnboarding({
      name:      form.name.trim(),
      goal:      form.goal,
      gender:    form.gender,
      weight_kg: form.weight_kg,
      activity_level: form.activity,
      calories:  macros.calories,
      protein:   macros.protein,
      carbs:     macros.carbs,
      fat:       macros.fat,
    })
    setSaving(false)
    if (err) { setError(err.message || 'Грешка при запис. Опитай пак.'); onError?.(); return }
    setShowCoachOffer(true)
  }

  async function handleCoachingSubmit() {
    setSaving(true)
    setError('')
    const macros = macrosFromForm(form)
    const { error: err } = await completeOnboarding({
      name:      form.name.trim(),
      goal:      form.goal,
      gender:    form.gender,
      weight_kg: form.weight_kg,
      activity_level: form.activity,
      calories:  macros.calories,
      protein:   macros.protein,
      carbs:     macros.carbs,
      fat:       macros.fat,
    })
    setSaving(false)
    if (err) setError(err.message)
    else setSubmitted(true)
  }

  /** Coach upsell handlers — the client already technically finished the
   *  onboarding at this point (macros saved, onboarding_done=true), so the
   *  callback into App.jsx lets it arm the success screen while the coach
   *  request pushes in the background. */
  async function handleCoachAccept() {
    setSaving(true)
    setError('')
    onComplete?.(form.name.trim())
    await updateProfile({ plan_pending: true })
    const coachId = profile?.coach_id
    if (coachId) {
      supabase.functions.invoke('send-push', {
        body: {
          toUserId: coachId,
          title: 'Нова заявка за треньор',
          body: `${form.name.trim() || profile?.email || 'Нов клиент'} иска безплатна тренировка`,
        },
      }).catch(() => {})
    }
  }
  function handleCoachSkip() {
    onComplete?.(form.name.trim())
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

  if (showCoachOffer) {
    return (
      <CoachOffer
        saving={saving}
        error={error}
        onWrite={handleCoachAccept}
        onSkip={handleCoachSkip}
      />
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
        {/* Step 1 — Name */}
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

        {/* Step 3 — Gender */}
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

        {/* Step 4 — Weight */}
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

        {/* Step 5 — Activity */}
        {step === 5 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>АКТИВНОСТ</h1>
            <p className={styles.sub}>Извън тренировките — колко се движиш през деня.</p>
            <div className={styles.activityGrid}>
              {ACTIVITY_OPTIONS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`${styles.activityCard} ${form.activity === a.id ? styles.activityCardActive : ''}`}
                  onClick={() => set('activity', a.id)}
                >
                  <span className={styles.activityIcon}>{ACTIVITY_ICON[a.icon]}</span>
                  <span className={styles.activityBody}>
                    <span className={styles.activityLabel}>{a.label}</span>
                    <span className={styles.activityDesc}>{a.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6 — Notifications */}
        {step === 6 && (
          <div className={styles.stepWrap}>
            <h1 className={styles.heading}>НАПОМНЯНИЯ</h1>
            <p className={styles.sub}>
              За тренировките, храненията и когато треньорът пише — да не се
              разчита само на паметта ти.
            </p>
            <div className={styles.notifyHero} aria-hidden="true">
              <span className={styles.notifyBell}>
                <svg viewBox="0 0 64 64" fill="currentColor">
                  <path d="M32 8c-2.2 0-4 1.8-4 4v2.5C20.6 16.6 15 23.4 15 31.5V40l-4 6v3h42v-3l-4-6v-8.5c0-8.1-5.6-14.9-13-17V12c0-2.2-1.8-4-4-4zM26 53a6 6 0 0 0 12 0H26z"/>
                </svg>
              </span>
              <span className={styles.notifyBadge} aria-hidden="true" />
            </div>
            {notifyState === 'granted' && (
              <p className={styles.notifyDone}>Готово — вече ще получаваш известия.</p>
            )}
            {notifyState === 'denied' && (
              <p className={styles.notifyMuted}>Отказано. Можеш да включиш по-късно от настройките на браузъра.</p>
            )}
            {notifyState === 'unsupported' && (
              <p className={styles.notifyMuted}>Този браузър не поддържа push известия.</p>
            )}
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.nav}>
        {step > 1 && step < totalSteps && (
          <button className={styles.backBtn} onClick={() => setStep(s => s - 1)} type="button" aria-label="Назад">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
              <polyline points="15 6 9 12 15 18" />
            </svg>
          </button>
        )}
        {step < totalSteps && (
          <button className={styles.nextBtn} onClick={next} type="button">
            Продължи <span className={styles.nextArrow} aria-hidden="true">→</span>
          </button>
        )}
        {step === totalSteps && (
          <div className={styles.notifyActions}>
            <button
              className={styles.nextBtn}
              onClick={notifyState === 'idle' ? allowThenFinish : next}
              disabled={saving}
              type="button"
            >
              {saving
                ? 'ЗАПИСВА...'
                : notifyState === 'idle'
                  ? 'РАЗРЕШИ И ЗАПОЧНИ'
                  : isCoachingIntake
                    ? 'ИЗПРАТИ ЗАЯВКАТА →'
                    : 'ЗАПОЧНИ →'}
            </button>
            {notifyState === 'idle' && (
              <button
                className={styles.notifySkip}
                onClick={next}
                disabled={saving}
                type="button"
              >
                не сега
              </button>
            )}
          </div>
        )}
      </div>

      <button className={styles.signOutLink} onClick={signOut} type="button">Изход</button>
    </div>
  )
}
