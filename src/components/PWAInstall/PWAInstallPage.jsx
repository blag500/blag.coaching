import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './PWAInstallPage.module.css'

export default function PWAInstallPage({ onBack }) {
  const { profile } = useAuth()
  const { t } = useSettings()
  const isCoach = profile?.role === 'coach'

  const [notice,   setNotice]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('update_notice')
      .eq('role', 'coach')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setNotice(data.update_notice ?? false)
        setLoading(false)
      })
  }, [])

  async function toggle() {
    setSaving(true)
    const next = !notice
    await supabase
      .from('profiles')
      .update({ update_notice: next })
      .eq('id', profile.id)
    setNotice(next)
    setSaving(false)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button" aria-label={t('pwa.back')}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <h1 className={styles.title}>{t('pwa.title')}</h1>
      </header>

      <div className={styles.body}>
        {loading ? null : isCoach ? (
          <div className={styles.doneCard}>
            <div className={styles.doneTitle}>{t('pwa.notice.title')}</div>
            <p className={styles.doneDesc}>
              {notice ? t('pwa.notice.on') : t('pwa.notice.off')}
            </p>
            <button
              className={styles.installBtn}
              style={{ background: notice ? '#ef5350' : 'var(--accent)' }}
              onClick={toggle}
              disabled={saving}
              type="button"
            >
              {saving ? '...' : notice ? t('pwa.notice.turnOff') : t('pwa.notice.turnOn')}
            </button>
          </div>
        ) : (
          <div className={styles.doneCard}>
            {notice ? (
              <>
                <div className={styles.doneIcon}>🔄</div>
                <div className={styles.doneTitle}>{t('pwa.update.available')}</div>
                <p className={styles.doneDesc}>{t('pwa.update.desc')}</p>
                <button
                  className={styles.installBtn}
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  {t('pwa.update.refresh')}
                </button>
              </>
            ) : (
              <>
                <div className={styles.doneIcon}>✅</div>
                <div className={styles.doneTitle}>{t('pwa.update.upToDate')}</div>
                <p className={styles.doneDesc}>{t('pwa.update.none')}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
