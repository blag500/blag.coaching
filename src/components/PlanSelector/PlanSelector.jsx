import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './PlanSelector.module.css'

const PLANS = [
  {
    id: 'free',
    name: 'BLAG',
    pitch: 'Безплатно завинаги.',
    sub: 'Всичко за да тръгнеш.',
    premium: false,
    cta: 'ЗАПОЧНИ БЕЗПЛАТНО',
    features: [
      { icon: '🍽', text: 'Храна с AI и баркод' },
      { icon: '🏋', text: 'Тренировъчен дневник' },
      { icon: '📈', text: 'Тегло, навици, прогрес' },
    ],
  },
  {
    id: 'pro',
    name: 'BLAG PRO',
    pitch: 'Личен треньор.',
    sub: 'Всичко от BLAG + план по мярка.',
    premium: true,
    badge: 'С ТРЕНЬОР',
    cta: 'КАНДИДАТСТВАЙ',
    features: [
      { icon: '🎯', text: 'Индивидуален хранителен план' },
      { icon: '💪', text: 'Тренировъчна програма' },
      { icon: '💬', text: 'Директна връзка с треньора' },
    ],
  },
]

export default function PlanSelector({ onSelect, onSaved }) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [saveError, setSaveError] = useState(null)

  async function handleSelect(planId) {
    if (loading) return
    setLoading(true)
    setLoadingId(planId)
    if (onSelect) {
      onSelect(planId)
      setLoading(false)
      setLoadingId(null)
      return
    }

    const { error } = await supabase.rpc('select_plan', { plan_choice: planId })
    if (error) {
      setLoading(false)
      setLoadingId(null)
      setSaveError('Грешка — опитай отново.')
      return
    }

    if (planId === 'pro') notifyCoach()
    await auth.refreshProfile()
    onSaved?.()
    setLoading(false)
    setLoadingId(null)
  }

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
      <p className={styles.eyebrow}>ИЗБЕРИ ПЛАН</p>

      <div className={styles.cards}>
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`${styles.card} ${plan.premium ? styles.cardPremium : ''}`}
          >
            {plan.badge && <span className={styles.badge}>{plan.badge}</span>}

            <div className={styles.cardTop}>
              <h2 className={`${styles.planName} ${plan.premium ? styles.planNamePremium : ''}`}>
                {plan.name}
              </h2>
              <p className={styles.pitch}>{plan.pitch}</p>
              <p className={styles.sub}>{plan.sub}</p>
            </div>

            <ul className={styles.features}>
              {plan.features.map(f => (
                <li key={f.text} className={styles.feature}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            <button
              className={`${styles.cta} ${plan.premium ? styles.ctaPremium : styles.ctaFree}`}
              onClick={() => handleSelect(plan.id)}
              disabled={loading}
              type="button"
            >
              {loadingId === plan.id ? '...' : plan.cta}
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
