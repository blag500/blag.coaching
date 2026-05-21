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
  const { profile, refreshProfile } = useAuth()
  const [selecting, setSelecting] = useState(null)
  const [saveError, setSaveError] = useState(null)

  async function handleSelect(planId) {
    if (selecting) return
    setSelecting(planId)
    setSaveError(null)
    const { error } = await supabase.rpc('select_plan', { plan_choice: planId })
    if (error) {
      setSelecting(null)
      setSaveError('Грешка при запазване — моля, опитай отново.')
      return
    }

    // Verify plan_pending was actually set — if not, the DB function is stale
    const { data: check } = await supabase
      .from('profiles')
      .select('plan_pending, coach_id')
      .single()
    if (!check?.plan_pending) {
      // Force it via a direct update as fallback
      await supabase
        .from('profiles')
        .update({ plan_pending: true })
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
    }

    await refreshProfile()

    const coachId = check?.coach_id || profile?.coach_id
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

        {saveError && <p className={styles.saveError}>{saveError}</p>}
        <p className={styles.note}>Планът може да се промени по-късно от треньора.</p>
      </div>
    </div>
  )
}
