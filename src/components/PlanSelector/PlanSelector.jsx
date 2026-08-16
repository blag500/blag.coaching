import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './PlanSelector.module.css'

const PLANS = {
  free: {
    id: 'free',
    label: 'BLAG',
    cta: 'ЗАПОЧНИ БЕЗПЛАТНО',
    ctaStyle: 'free',
    features: [
      { icon: '🍽', title: 'AI храна + баркод',       sub: 'Логвай за секунди'            },
      { icon: '🏋', title: 'Тренировъчен дневник',    sub: 'Прогресия и история'          },
      { icon: '📊', title: 'Тегло, навици, прогрес',  sub: 'Всичко на едно място'        },
      { icon: '🔔', title: 'Известия',                sub: 'Напомняния по твой график'    },
      { icon: '♾', title: 'Безплатно завинаги',       sub: 'Без абонамент, без трик'      },
    ],
  },
  pro: {
    id: 'pro',
    label: 'BLAG PRO',
    badge: 'С ТРЕНЬОР',
    cta: 'КАНДИДАТСТВАЙ ЗА PRO',
    ctaStyle: 'pro',
    features: [
      { icon: '✓', title: 'Всичко от BLAG',           sub: 'Пълен достъп до приложението' },
      { icon: '🎯', title: 'Хранителен план по мярка', sub: 'Съобразен с теб и целта ти'   },
      { icon: '💪', title: 'Тренировъчна програма',   sub: 'Написана от треньора'          },
      { icon: '💬', title: 'Директна връзка',          sub: 'Чат с треньора по всяко време' },
      { icon: '💊', title: 'Суплементация',            sub: 'Протокол за теб'              },
    ],
  },
}

export default function PlanSelector({ onSelect, onSaved }) {
  const auth = useAuth()
  const [selected, setSelected] = useState('free')
  const [loading, setLoading]   = useState(false)
  const [saveError, setSaveError] = useState(null)

  const plan = PLANS[selected]

  async function handleCta() {
    if (loading) return
    setLoading(true)
    if (onSelect) { onSelect(plan.id); setLoading(false); return }

    const { error } = await supabase.rpc('select_plan', { plan_choice: plan.id })
    if (error) { setLoading(false); setSaveError('Грешка — опитай отново.'); return }

    if (plan.id === 'pro') {
      const coachId = auth.profile?.coach_id
      if (coachId) {
        supabase.functions.invoke('send-push', {
          body: {
            toUserId: coachId,
            title: 'Нова заявка за PRO',
            body: `${auth.profile?.name || auth.profile?.email || 'Нов клиент'} кандидатства за PRO`,
          },
        }).catch(() => {})
      }
    }

    await auth.refreshProfile()
    onSaved?.()
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.greeting}>Добре дошъл</p>
        <h1 className={styles.heading}>Готов ли си<br />да започнеш?</h1>
      </div>

      {/* Plan bubbles */}
      <div className={styles.bubblesRow}>
        {Object.values(PLANS).map(p => (
          <button
            key={p.id}
            className={`${styles.bubble} ${selected === p.id ? styles.bubbleActive : ''} ${p.id === 'pro' && selected === p.id ? styles.bubbleActivePro : ''}`}
            onClick={() => setSelected(p.id)}
            type="button"
          >
            <span className={styles.bubbleLabel}>{p.label}</span>
            {p.badge && selected === p.id && (
              <span className={styles.bubbleBadge}>{p.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Features list */}
      <div className={styles.list}>
        <p className={styles.listTitle}>
          {selected === 'free' ? 'Какво включва' : 'Какво получаваш'}
        </p>
        {plan.features.map(f => (
          <div key={f.title} className={styles.row}>
            <span className={styles.rowIcon}>{f.icon}</span>
            <div className={styles.rowText}>
              <span className={styles.rowTitle}>{f.title}</span>
              <span className={styles.rowSub}>{f.sub}</span>
            </div>
            <span className={styles.rowArrow}>→</span>
          </div>
        ))}
      </div>

      {/* CTA card */}
      <div className={`${styles.ctaCard} ${selected === 'pro' ? styles.ctaCardPro : ''}`}>
        <div className={styles.ctaCardTop}>
          <span className={styles.ctaPlanName}>{plan.label}</span>
          {plan.id === 'free'
            ? <span className={styles.ctaPrice}>Безплатно</span>
            : <span className={styles.ctaPrice}>По договаряне</span>
          }
        </div>
        {saveError && <p className={styles.saveError}>{saveError}</p>}
        <button
          className={`${styles.cta} ${selected === 'pro' ? styles.ctaPro : styles.ctaFree}`}
          onClick={handleCta}
          disabled={loading}
          type="button"
        >
          {loading ? '...' : plan.cta}
        </button>
      </div>

      {!onSelect && (
        <button className={styles.signOutLink} onClick={auth.signOut} type="button">
          Изход
        </button>
      )}
    </div>
  )
}
