import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../contexts/SettingsContext'
import styles from './ResetPasswordPage.module.css'

/**
 * Достига се само през линка от „забравена парола" писмото. Supabase слага
 * едно-разов session token в URL fragment-а; supabase-js го прибира сам при
 * зареждане. От тук нататък е просто форма за нова парола.
 *
 * Стои извън AppShell auth gate-а — не искаме клиент, който тъкмо е кликнал
 * линка, да бъде препратен към onboarding-а още преди да е сменил паролата.
 */
export default function ResetPasswordPage() {
  const { t } = useSettings()
  const [ready, setReady]     = useState(false)
  const [pw, setPw]           = useState('')
  const [pw2, setPw2]         = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  useEffect(() => {
    // Дай на supabase-js миг да прибере token-а от URL fragment-а и да
    // емитне SIGNED_IN. Ако сесия не пристигне за 2 секунди — линкът е
    // изтекъл или вече е бил използван веднъж.
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) setReady(true)
      else setError(t('reset.linkExpired'))
    })
    return () => { cancelled = true }
  }, [t])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (pw.length < 6) { setError(t('reset.errMin')); return }
    if (pw !== pw2)    { setError(t('reset.errMismatch')); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => { window.location.replace('/') }, 1500)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{done ? t('reset.done') : t('reset.title')}</h1>

        {!ready && !error && (
          <p className={styles.hint}>{t('reset.loading')}</p>
        )}

        {ready && !done && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label}>
              {t('reset.newPw')}
              <input
                type="password"
                className={styles.input}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder={t('reset.newPwPh')}
                autoComplete="new-password"
                minLength={6}
                required
                autoFocus
              />
            </label>
            <label className={styles.label}>
              {t('reset.confirmPw')}
              <input
                type="password"
                className={styles.input}
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={saving || pw.length < 6}>
              {saving ? '...' : t('reset.save')}
            </button>
          </form>
        )}

        {done && (
          <p className={styles.hint}>{t('reset.redirecting')}</p>
        )}

        {error && !ready && (
          <>
            <p className={styles.err}>{error}</p>
            <button
              type="button"
              className={styles.submit}
              onClick={() => window.location.replace('/')}
            >
              {t('reset.backToApp')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
