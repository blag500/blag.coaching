import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import styles from './PlanSelector.module.css'

const PLANS = {
  free: {
    id: 'free',
    label: 'BLAG',
    ctaKey: 'plan.free.cta',
    ctaStyle: 'free',
    features: [
      { icon: '🍽', titleKey: 'plan.free.f1.title', subKey: 'plan.free.f1.sub' },
      { icon: '🏋', titleKey: 'plan.free.f2.title', subKey: 'plan.free.f2.sub' },
      { icon: '📊', titleKey: 'plan.free.f3.title', subKey: 'plan.free.f3.sub' },
      { icon: '🔔', titleKey: 'plan.free.f4.title', subKey: 'plan.free.f4.sub' },
      { icon: '♾', titleKey: 'plan.free.f5.title', subKey: 'plan.free.f5.sub' },
    ],
  },
  pro: {
    id: 'pro',
    label: 'BLAG PRO',
    badgeKey: 'plan.pro.badge',
    ctaKey: 'plan.pro.cta',
    ctaStyle: 'pro',
    features: [
      { icon: '✓', titleKey: 'plan.pro.f1.title', subKey: 'plan.pro.f1.sub' },
      { icon: '🎯', titleKey: 'plan.pro.f2.title', subKey: 'plan.pro.f2.sub' },
      { icon: '💪', titleKey: 'plan.pro.f3.title', subKey: 'plan.pro.f3.sub' },
      { icon: '💬', titleKey: 'plan.pro.f4.title', subKey: 'plan.pro.f4.sub' },
      { icon: '💊', titleKey: 'plan.pro.f5.title', subKey: 'plan.pro.f5.sub' },
    ],
  },
}

export default function PlanSelector({ onSelect, onSaved }) {
  const auth = useAuth()
  const { t } = useSettings()
  const [selected, setSelected] = useState('free')
  const [loading, setLoading]   = useState(false)
  const [saveError, setSaveError] = useState(null)

  const plan = PLANS[selected]

  async function handleCta() {
    if (loading) return
    setLoading(true)
    if (onSelect) { onSelect(plan.id); setLoading(false); return }

    const { error } = await supabase.rpc('select_plan', { plan_choice: plan.id })
    if (error) { setLoading(false); setSaveError(t('plan.saveErr')); return }

    if (plan.id === 'pro') {
      const coachId = auth.profile?.coach_id
      if (coachId) {
        supabase.functions.invoke('send-push', {
          body: {
            toUserId: coachId,
            title: t('plan.pushProTitle'),
            body: t('plan.pushProBody', { name: auth.profile?.name || auth.profile?.email || t('ob.push.newClient') }),
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
        <p className={styles.greeting}>{t('plan.greeting')}</p>
        <h1 className={styles.heading}>{t('plan.headingReady')}</h1>
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
            {p.badgeKey && selected === p.id && (
              <span className={styles.bubbleBadge}>{t(p.badgeKey)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Features list */}
      <div className={styles.list}>
        <p className={styles.listTitle}>
          {selected === 'free' ? t('plan.includesFree') : t('plan.includesPro')}
        </p>
        {plan.features.map(f => (
          <div key={f.titleKey} className={styles.row}>
            <span className={styles.rowIcon}>{f.icon}</span>
            <div className={styles.rowText}>
              <span className={styles.rowTitle}>{t(f.titleKey)}</span>
              <span className={styles.rowSub}>{t(f.subKey)}</span>
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
            ? <span className={styles.ctaPrice}>{t('plan.priceFree')}</span>
            : <span className={styles.ctaPrice}>{t('plan.priceCustom')}</span>
          }
        </div>
        {saveError && <p className={styles.saveError}>{saveError}</p>}
        <button
          className={`${styles.cta} ${selected === 'pro' ? styles.ctaPro : styles.ctaFree}`}
          onClick={handleCta}
          disabled={loading}
          type="button"
        >
          {loading ? '...' : t(plan.ctaKey)}
        </button>
      </div>

      {!onSelect && (
        <button className={styles.signOutLink} onClick={auth.signOut} type="button">
          {t('plan.signOut')}
        </button>
      )}
    </div>
  )
}
