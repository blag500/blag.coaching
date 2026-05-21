import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './PlanSelector.module.css'

const PLANS = [
  {
    id: 'plus',
    name: 'PLUS',
    tagline: 'Самостоятелно проследяване',
    features: [
      'AI търсене на храни + баркод скенер',
      'Дневник на хранене с макроси',
      'Рецепти с калкулатор на порции',
      'Тренировъчен план от треньора',
      'Логване на упражнения и прогресия',
      'Проследяване на навици',
      'Лог на тегло',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    tagline: 'Пълна треньорска подкрепа',
    highlight: true,
    features: [
      'Всичко от Plus',
      'Директен чат с личния ти треньор',
      'Насрочване на тренировъчни сесии',
      'Персонализирани корекции на плана',
      'Седмичен преглед на напредъка',
    ],
  },
]

export default function PlanSelector() {
  const { profile, updateProfile } = useAuth()
  const [selecting, setSelecting] = useState(null)

  async function handleSelect(planId) {
    if (selecting) return
    setSelecting(planId)
    await updateProfile({ plan: planId, approved: true })

    const coachId = profile?.coach_id
    if (coachId) {
      const planLabel = planId === 'pro' ? 'Pro' : 'Plus'
      const clientName = profile?.name || profile?.email || 'Нов клиент'
      supabase.functions.invoke('send-push', {
        body: {
          toUserId: coachId,
          title: 'Нов клиент избра план',
          body: `${clientName} избра ${planLabel} — чака одобрение`,
        },
      }).catch(() => {})
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.brand}>BLAG COACHING</div>
        <h1 className={styles.title}>ИЗБЕРИ СВОЯ ПЛАН</h1>
        <p className={styles.sub}>Треньорът ще се свърже с теб лично след избора.</p>

        <div className={styles.grid}>
          {PLANS.map(plan => (
            <button
              key={plan.id}
              className={`${styles.card} ${plan.highlight ? styles.cardPro : ''} ${selecting === plan.id ? styles.cardSelecting : ''}`}
              onClick={() => handleSelect(plan.id)}
              disabled={!!selecting}
              type="button"
            >
              {plan.highlight && <div className={styles.popular}>ПРЕПОРЪЧАН</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planTagline}>{plan.tagline}</div>
              <div className={styles.divider} />
              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i} className={styles.feature}>
                    <span className={styles.check}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className={`${styles.cta} ${plan.highlight ? styles.ctaPro : ''}`}>
                {selecting === plan.id ? '...' : `Избери ${plan.name}`}
              </div>
            </button>
          ))}
        </div>

        <p className={styles.note}>Планът може да се промени по-късно от треньора.</p>
      </div>
    </div>
  )
}
