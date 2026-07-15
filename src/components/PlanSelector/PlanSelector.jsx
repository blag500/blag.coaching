import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './PlanSelector.module.css'

const PLANS = [
  {
    id: 'free',
    name: 'БЕЗПЛАТЕН',
    price: null,
    period: null,
    badge: null,
    available: true,
    features: [
      'Проследяване на калории & макроси',
      'Дневник на храненето',
      'Тегло & прогрес',
      'Тренировъчен дневник',
      'Навици & съответствие',
      'Калориен калкулатор',
    ],
    cta: 'ЗАПОЧНИ БЕЗПЛАТНО',
    accent: 'var(--accent)',
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '4.99 €',
    period: 'на месец',
    badge: null,
    available: true,
    features: [
      'Всичко от Безплатен',
      'Библиотека с ястия',
      'Умни задачи & известия',
      'Разширени анализи & графики',
      'Планиране на хранения',
      'Приоритетна поддръжка',
    ],
    cta: 'ИЗБЕРИ PRO',
    accent: '#7E57C2',
  },
  {
    id: 'coaching',
    name: 'КОУЧИНГ',
    price: '29 €',
    period: 'на месец',
    badge: 'ЛИЧЕН ТРЕНЬОР',
    available: true,
    features: [
      'Всичко от PRO',
      'Личен план от треньор',
      'Директна комуникация',
      'Седмичен преглед & корекции',
      'Индивидуални тренировъчни програми',
      'Неограничени консултации',
    ],
    cta: 'ИЗБЕРИ КОУЧИНГ',
    accent: '#FFB74D',
  },
]

// onSelect prop = public/unauthenticated mode (caller handles navigation)
// No onSelect = authenticated mode (saves plan directly to profile)
export default function PlanSelector({ onSelect }) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleSelect(planId) {
    if (loading) return
    setLoading(true)
    if (onSelect) {
      onSelect(planId)
    } else {
      await auth.selectPlan(planId)
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandName}>BLAG</span>
          <div className={styles.brandDivider} />
          <span className={styles.brandSub}>COACHING</span>
        </div>
        <h1 className={styles.title}>ИЗБЕРИ ПЛАН</h1>
        <p className={styles.subtitle}>Започни безплатно. Надстрой когато си готов.</p>
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
              <span className={styles.popularBadge}>ПРЕПОРЪЧАН СТАРТ</span>
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
              style={{ background: plan.accent }}
              onClick={() => handleSelect(plan.id)}
              disabled={loading}
              type="button"
            >
              {loading ? '...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {!onSelect && (
        <button className={styles.signOutLink} onClick={auth.signOut} type="button">
          Изход
        </button>
      )}
    </div>
  )
}
