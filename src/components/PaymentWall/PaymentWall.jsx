import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './PaymentWall.module.css'

const PLAN_INFO = {
  pro: {
    name: 'PRO',
    price: '4.99 €',
    period: 'на месец',
    accent: '#7E57C2',
    features: [
      'Библиотека с ястия',
      'Умни задачи & известия',
      'Разширени анализи & графики',
      'Планиране на хранения',
      'Приоритетна поддръжка',
    ],
  },
  coaching: {
    name: 'КОУЧИНГ',
    price: '29 €',
    period: 'на месец',
    accent: '#FFB74D',
    features: [
      'Личен план от треньор',
      'Директна комуникация',
      'Седмичен преглед & корекции',
      'Индивидуални тренировъчни програми',
      'Неограничени консултации',
    ],
  },
}

export default function PaymentWall({ onDowngrade }) {
  const { profile, selectPlan } = useAuth()
  const plan = profile?.plan ?? 'pro'
  const info = PLAN_INFO[plan] ?? PLAN_INFO.pro

  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [confirmDowngrade, setConfirmDowngrade] = useState(false)

  async function handlePay() {
    setLoading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Не си влязъл в акаунта. Опитай пак.')
      setLoading(false)
      return
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          plan,
          success_url: `${window.location.origin}/?payment=success`,
          cancel_url:  `${window.location.origin}/`,
        }),
      })

      const json = await res.json()

      if (json.url) {
        window.location.href = json.url
      } else {
        setError(json.error ?? 'Грешка при отваряне на плащане. Опитай пак.')
        setLoading(false)
      }
    } catch {
      setError('Мрежова грешка — провери връзката и опитай пак.')
      setLoading(false)
    }
  }

  async function handleDowngradeConfirm() {
    setLoading(true)
    await selectPlan('free')
    setLoading(false)
    onDowngrade?.()
  }

  if (confirmDowngrade) {
    return (
      <div className={styles.page}>
        <div className={styles.confirmBox}>
          <h2 className={styles.confirmTitle}>Сигурен ли си?</h2>
          <p className={styles.confirmText}>
            Ще преминеш към безплатния план. Достъпът до {info.name} функциите ще бъде спрян.
          </p>
          <button
            className={styles.downgradeConfirmBtn}
            onClick={handleDowngradeConfirm}
            disabled={loading}
            type="button"
          >
            {loading ? '...' : 'Да, мини на безплатен'}
          </button>
          <button
            className={styles.backLink}
            onClick={() => setConfirmDowngrade(false)}
            type="button"
          >
            Назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <span className={styles.brandName}>BLAG</span>
        <div className={styles.brandDivider} />
        <span className={styles.brandSub}>COACHING</span>
      </div>

      <div className={styles.card} style={{ '--plan-accent': info.accent }}>
        <div className={styles.planHeader}>
          <span className={styles.planName} style={{ color: info.accent }}>{info.name}</span>
          <div className={styles.priceRow}>
            <span className={styles.price}>{info.price}</span>
            <span className={styles.period}>/ {info.period}</span>
          </div>
        </div>

        <ul className={styles.features}>
          {info.features.map(f => (
            <li key={f} className={styles.feature}>
              <span className={styles.check} style={{ color: info.accent }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.payBtn}
          style={{ background: info.accent }}
          onClick={handlePay}
          disabled={loading}
          type="button"
        >
          {loading ? 'Отваряне на плащане...' : `ПЛАТИ С КАРТА — ${info.price}/м`}
        </button>

        <p className={styles.secureNote}>
          🔒 Сигурно плащане чрез Stripe · Отказ по всяко време
        </p>
      </div>

      <button
        className={styles.downgradeLink}
        onClick={() => setConfirmDowngrade(true)}
        type="button"
      >
        Продължи с безплатния план
      </button>
    </div>
  )
}
