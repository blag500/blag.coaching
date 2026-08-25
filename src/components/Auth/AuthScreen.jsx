import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './AuthScreen.module.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <line x1="4" y1="20" x2="20" y2="4" />}
    </svg>
  )
}

export default function AuthScreen({ onBack, initialMode = 'login', initialEmail = '' }) {
  const { signIn, signUp, signInWithGoogle, resetPassword, checkEmailStatus, resendConfirmation, signInWithMagicLink, authError } = useAuth()
  const { t } = useSettings()
  const [mode, setMode]         = useState(initialMode) // 'login' | 'register' | 'reset'
  const [email, setEmail]       = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [info, setInfo]         = useState('')
  const [stuck, setStuck]       = useState(false)
  const [resending, setResending] = useState(false)
  const [linking, setLinking]   = useState(false)
  const passwordRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setInfo('')
    setStuck(false)

    if (mode === 'reset') {
      const ok = await resetPassword(email)
      if (ok) setInfo(t('auth.info.resetSent'))
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const ok = await signIn(email, password)
      if (!ok) {
        const status = await checkEmailStatus(email)
        if (status === 'taken') setStuck(true)
      }
    } else {
      const res = await signUp(email, password)
      if (res === 'exists') {
        setMode('login')
        setInfo(t('auth.info.alreadyRegistered'))
        setTimeout(() => passwordRef.current?.focus(), 60)
      } else if (res) {
        setInfo(t('auth.info.confirmSent'))
      }
    }

    setLoading(false)
  }

  async function handleResend() {
    setResending(true)
    const ok = await resendConfirmation(email)
    setResending(false)
    if (ok) {
      setStuck(false)
      setInfo(t('auth.info.resent'))
    }
  }

  async function handleMagicLink() {
    if (!email) { setInfo(t('auth.info.needEmail')); return }
    setLinking(true)
    const ok = await signInWithMagicLink(email)
    setLinking(false)
    if (ok) {
      setStuck(false)
      setInfo(t('auth.info.magicSent', { email }))
    }
  }

  function switchMode(m) { setMode(m); setInfo(''); setStuck(false) }

  const submitLabel = loading
    ? '...'
    : mode === 'login'    ? t('auth.submit.login')
    : mode === 'register' ? t('auth.submit.register')
    :                       t('auth.submit.reset')

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        {/* BLAG wordmark stays centered so the header reads as a title, not a
            control strip. The close X sits absolutely in the corner — its own
            layer — so it can't push the mark or the tabs off-axis. */}
        {onBack && (
          <button
            type="button"
            className={styles.close}
            onClick={onBack}
            aria-label={t('auth.close')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6"  y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className={styles.brand} aria-hidden="true">BLAG</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}
          >
            {t('auth.tab.login')}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}
          >
            {t('auth.tab.register')}
          </button>
        </div>

        {mode === 'reset' && (
          <p className={styles.resetIntro}>
            {t('auth.resetIntro')}
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">{t('auth.emailLabel')}</label>
            <input
              id="auth-email"
              className={styles.input}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setStuck(false) }}
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-password">{t('auth.passwordLabel')}</label>
              <div className={styles.inputWrap}>
                <input
                  id="auth-password"
                  ref={passwordRef}
                  className={styles.input}
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'register' ? t('auth.passwordHintNew') : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className={styles.reveal}
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>
          )}

          {authError && <p className={styles.error}>{authError}</p>}
          {info      && <p className={styles.info}>{info}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {submitLabel}
          </button>

          {stuck && (
            <div className={styles.recover}>
              <p className={styles.recoverText}>
                {t('auth.stuckHint')}
              </p>
              <div className={styles.recoverActions}>
                <button
                  className={styles.recoverPrimary}
                  onClick={handleMagicLink}
                  disabled={linking}
                  type="button"
                >
                  {linking ? '...' : t('auth.magicLinkSend')}
                </button>
                <button
                  className={styles.recoverSecondary}
                  onClick={handleResend}
                  disabled={resending}
                  type="button"
                >
                  {resending ? '...' : t('auth.resendConfirm')}
                </button>
              </div>
            </div>
          )}
        </form>

        {mode === 'login' && (
          <button
            className={styles.magicLink}
            onClick={handleMagicLink}
            disabled={linking}
            type="button"
          >
            {linking ? t('auth.magicSending') : t('auth.magicLinkSend')}
          </button>
        )}

        {mode !== 'reset' && (
          <button
            type="button"
            className={styles.googleBtn}
            onClick={signInWithGoogle}
          >
            <GoogleIcon />
            <span>{t('auth.googleLabel')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
