import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import AppShowcase from '../LandingPage/AppShowcase'
import styles from './PlanSelector.module.css'

const PLANS = {
  free: {
    id: 'free',
    name: 'BLAG',
    cta: 'ЗАПОЧНИ БЕЗПЛАТНО',
    features: [
      'AI търсене на храни + баркод скенер',
      'Дневник на храненето с макроси',
      'Рецепти с калкулатор на порции',
      'Тренировъчен дневник и прогресия',
      'Навици, тегло и прогрес',
      'Известия и напомняния',
    ],
  },
  pro: {
    id: 'pro',
    name: 'BLAG PRO',
    badge: 'С ТРЕНЬОР',
    cta: 'КАНДИДАТСТВАЙ ЗА PRO',
    features: [
      'Всичко от BLAG',
      'Оценка на формата за начало',
      'Какво ядеш преди и след тренировка',
      'Протокол за суплементация',
      'Личен тренировъчен план и цели',
      'Директен чат с треньора',
    ],
  },
}

export default function PlanSelector({ onSelect, onSaved }) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [sheet, setSheet] = useState(null) // 'free' | 'pro' | null

  async function handleSelect(planId) {
    if (loading) return
    setLoading(true)
    if (onSelect) {
      onSelect(planId)
      setLoading(false)
      return
    }

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

  const plan = sheet ? PLANS[sheet] : null

  return (
    <div className={styles.page}>
      <span className={styles.eyebrow}>БЛАГОТО ПРИЛОЖЕНИЕ — ЗА БЛАГИТЕ ХОРА</span>
      <p className={styles.lead}>
        Ти входираш, то следи<br />и напомня да не кривнеш ;)
      </p>

      <AppShowcase />

      <p className={styles.leadBelow}>
        Приложението е безплатно.<br />Blag Coach — ако искаш.
      </p>

      <h1 className={styles.title}>ИЗБЕРИ ПЛАН</h1>

      {/* Pills */}
      <div className={styles.pills}>
        {Object.values(PLANS).map(p => (
          <button
            key={p.id}
            className={`${styles.pill} ${sheet === p.id ? styles.pillActive : ''}`}
            onClick={() => setSheet(prev => prev === p.id ? null : p.id)}
            type="button"
          >
            {p.name}
          </button>
        ))}
      </div>

      {saveError && <p className={styles.saveError}>{saveError}</p>}

      {!onSelect && (
        <button className={styles.signOutLink} onClick={auth.signOut} type="button">
          Изход
        </button>
      )}

      {/* Backdrop */}
      {sheet && (
        <div className={styles.backdrop} onClick={() => setSheet(null)} />
      )}

      {/* Bottom sheet */}
      <div className={`${styles.sheet} ${sheet ? styles.sheetOpen : ''}`}>
        {plan && (
          <>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetName}>{plan.name}</span>
              {plan.badge && <span className={styles.sheetBadge}>{plan.badge}</span>}
            </div>
            <ul className={styles.features}>
              {plan.features.map(f => (
                <li key={f} className={styles.feature}>
                  <span className={styles.featureCheck}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={styles.cta}
              onClick={() => handleSelect(plan.id)}
              disabled={loading}
              type="button"
            >
              {loading ? '...' : plan.cta}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
