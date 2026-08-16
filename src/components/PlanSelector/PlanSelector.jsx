import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './PlanSelector.module.css'

// Two tiers, not three. The whole product is free; the paid layer is the coach
// himself — protocols, assessment, plan. Everything that used to sit behind
// "PRO 4.99" is in the free app now.
const PLANS = [
  {
    id: 'free',
    name: 'BLAG',
    price: null,
    period: null,
    badge: null,
    available: true,
    features: [
      'AI търсене на храни + баркод скенер',
      'Дневник на храненето с макроси',
      'Рецепти с калкулатор на порции',
      'Тренировъчен дневник и прогресия',
      'Навици, тегло и прогрес',
      'Известия и напомняния',
    ],
    cta: 'ЗАПОЧНИ БЕЗПЛАТНО',
    accent: 'var(--accent)',
    fill: 'var(--accent-metal)',
  },
  {
    id: 'pro',
    name: 'BLAG PRO',
    price: null,
    period: null,
    badge: 'С ТРЕНЬОР',
    available: true,
    features: [
      'Всичко от BLAG',
      'Оценка на формата за начало',
      'Какво ядеш преди и след тренировка',
      'Протокол за суплементация',
      'Личен тренировъчен план и цели',
      'Директен чат с треньора',
    ],
    cta: 'КАНДИДАТСТВАЙ ЗА PRO',
    accent: 'var(--accent)',
    fill: 'var(--accent-metal)',
  },
]

// onSelect prop = public/unauthenticated mode (caller handles navigation)
// No onSelect = authenticated mode (saves plan directly to profile)
export default function PlanSelector({ onSelect, onSaved }) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function handleSelect(planId) {
    if (loading) return
    setLoading(true)
    if (onSelect) {
      onSelect(planId)
      setLoading(false)
      return
    }

    // The RPC, not a plain update — it also raises plan_pending, which is what
    // puts a PRO applicant in the coach's pending list.
    const { error } = await supabase.rpc('select_plan', { plan_choice: planId })
    if (error) {
      setLoading(false)
      setSaveError('Грешка при запазване — опитай отново.')
      return
    }

    if (planId === 'pro') notifyCoach()
    await auth.refreshProfile()
    onSaved?.()
    setLoading(false)
  }

  /** Tell the coach someone applied. Best effort — never block the signup on it. */
  function notifyCoach() {
    const coachId = auth.profile?.coach_id
    if (!coachId) return
    supabase.functions.invoke('send-push', {
      body: {
        toUserId: coachId,
        title: 'Нова заявка за PRO',
        body: `${auth.profile?.name || auth.profile?.email || 'Нов клиент'} кандидатства за PRO`,
      },
    }).catch(() => {})
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandName}>BLAG</span>
        </div>
        <h1 className={styles.title}>ИЗБЕРИ ПЛАН</h1>
        <p className={styles.subtitle}>Приложението е безплатно завинаги. Плаща се само за работа с треньор.</p>
      </div>

      <div className={styles.plans}>
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.id === 'free' ? styles.planCardFeatured : ''}`}
            style={{ '--plan-accent': plan.accent }}
          >
            {plan.badge && (
              <span className={styles.badge}>{plan.badge}</span>
            )}
            {plan.id === 'free' && (
              <span className={styles.popularBadge}>ЗАПОЧНИ ОТ ТУК</span>
            )}

            <div className={styles.planHeader}>
              <span className={styles.planName} style={{ color: plan.accent }}>{plan.name}</span>
              {plan.price && (
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>{plan.price}</span>
                <span className={styles.pricePeriod}>/{plan.period}</span>
              </div>
            )}
            </div>

            <ul className={styles.features}>
              {plan.features.map(f => (
                <li key={f} className={styles.feature}>
                  <span className={styles.featureCheck} style={{ color: plan.accent }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={styles.cta}
              style={{ background: plan.fill }}
              onClick={() => handleSelect(plan.id)}
              disabled={loading}
              type="button"
            >
              {loading ? '...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {saveError && <p className={styles.saveError}>{saveError}</p>}

      {!onSelect && (
        <button className={styles.signOutLink} onClick={auth.signOut} type="button">
          Изход
        </button>
      )}
    </div>
  )
}
