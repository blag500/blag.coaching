import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './PlanSelector.module.css'

const PLANS = [
  {
    id: 'free',
    name: 'БЕЗПЛАТЕН',
    price: '0 лв',
    period: 'завинаги',
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
    price: '9.99 лв',
    period: 'на месец',
    badge: 'СКОРО',
    available: false,
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
    price: '49 лв',
    period: 'на месец',
    badge: 'СКОРО',
    available: false,
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

export default function PlanSelector() {
  const { selectPlan, signOut } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleSelect(planId) {
    if (loading) return
    setLoading(true)
    await selectPlan(planId)
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
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>{plan.price}</span>
                <span className={styles.pricePeriod}>/{plan.period}</span>
              </div>
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
              className={`${styles.cta} ${!plan.available ? styles.ctaDisabled : ''}`}
              style={plan.available ? { background: plan.accent } : {}}
              onClick={() => plan.available && handleSelect(plan.id)}
              disabled={!plan.available || loading}
              type="button"
            >
              {plan.available ? (loading ? '...' : plan.cta) : 'СКОРО'}
            </button>
          </div>
        ))}
      </div>

      <button className={styles.signOutLink} onClick={signOut} type="button">
        Изход
      </button>
    </div>
  )
}
