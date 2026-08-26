import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './PaymentWall.module.css'

const PLAN_INFO = {
  pro: {
    id: 'pro',
    name: 'PRO',
    price: '4.99 €',
    accent: '#7E57C2',
    featureKeys: ['pay.pro.f1', 'pay.pro.f2', 'pay.pro.f3', 'pay.pro.f4', 'pay.pro.f5'],
  },
  coaching: {
    id: 'coaching',
    nameKey: 'pay.coach.name',
    price: '29 €',
    accent: 'var(--accent)',
    featureKeys: ['pay.coach.f1', 'pay.coach.f2', 'pay.coach.f3', 'pay.coach.f4', 'pay.coach.f5'],
  },
}

export default function PaymentWall({ onDowngrade }) {
  const { profile, selectPlan } = useAuth()
  const { t } = useSettings()
  const plan = profile?.plan ?? 'pro'
  const info = PLAN_INFO[plan] ?? PLAN_INFO.pro
  const planName = info.nameKey ? t(info.nameKey) : info.name

  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [confirmDowngrade, setConfirmDowngrade] = useState(false)

  async function handlePay() {
    setLoading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError(t('pay.err.noSession'))
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
        setError(json.error ?? t('pay.err.stripe'))
        setLoading(false)
      }
    } catch {
      setError(t('pay.err.network'))
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
          <h2 className={styles.confirmTitle}>{t('pay.confirm.title')}</h2>
          <p className={styles.confirmText}>{t('pay.confirm.body', { name: planName })}</p>
          <button
            className={styles.downgradeConfirmBtn}
            onClick={handleDowngradeConfirm}
            disabled={loading}
            type="button"
          >
            {loading ? '...' : t('pay.confirm.yes')}
          </button>
          <button
            className={styles.backLink}
            onClick={() => setConfirmDowngrade(false)}
            type="button"
          >
            {t('pay.confirm.back')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <span className={styles.brandName}>BLAG</span>
      </div>

      <div className={styles.card} style={{ '--plan-accent': info.accent }}>
        <div className={styles.planHeader}>
          <span className={styles.planName} style={{ color: info.accent }}>{planName}</span>
          <div className={styles.priceRow}>
            <span className={styles.price}>{info.price}</span>
            <span className={styles.period}>/ {t('pay.period')}</span>
          </div>
        </div>

        <ul className={styles.features}>
          {info.featureKeys.map(k => (
            <li key={k} className={styles.feature}>
              <span className={styles.check} style={{ color: info.accent }}>✓</span>
              {t(k)}
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
          {loading ? t('pay.openStripe') : t('pay.cta', { price: info.price })}
        </button>

        <p className={styles.secureNote}>{t('pay.stripeSafe')}</p>
      </div>

      <button
        className={styles.downgradeLink}
        onClick={() => setConfirmDowngrade(true)}
        type="button"
      >
        {t('pay.free')}
      </button>
    </div>
  )
}
