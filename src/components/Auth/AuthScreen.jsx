import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
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

export default function AuthScreen({ onBack, initialMode = 'login', initialEmail = '' }) {
  const { signIn, signUp, signInWithGoogle, resetPassword, checkEmailStatus, resendConfirmation, signInWithMagicLink, authError } = useAuth()
  const [mode, setMode]         = useState(initialMode) // 'login' | 'register' | 'reset'
  const [email, setEmail]       = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [info, setInfo]         = useState('')
  const [stuck, setStuck]       = useState(false)   // account exists but login failed
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
      if (ok) setInfo('Изпратихме линк за нова парола. Провери имейла си.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const ok = await signIn(email, password)
      // A login that fails on an address that already has an account is not
      // "wrong password" as far as the user is concerned — it is a door they
      // can't get through. Usually an unconfirmed email. Offer the two ways out
      // rather than leaving them to guess between register and login.
      if (!ok) {
        const status = await checkEmailStatus(email)
        if (status === 'taken') setStuck(true)
      }
    } else {
      const res = await signUp(email, password)
      if (res === 'exists') {
        setMode('login')
        setInfo('Вече имаш акаунт с този имейл. Влез с паролата си.')
        setTimeout(() => passwordRef.current?.focus(), 60)
      } else if (res) {
        setInfo('Провери имейла си за потвърждение. Ако не го виждаш — провери папката Спам.')
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
      setInfo('Изпратихме нов линк за потвърждение. Провери имейла си (и папката Спам).')
    }
  }

  async function handleMagicLink() {
    if (!email) { setInfo('Първо въведи имейла си.'); return }
    setLinking(true)
    const ok = await signInWithMagicLink(email)
    setLinking(false)
    if (ok) {
      setStuck(false)
      setInfo('Изпратихме еднократен линк за вход на ' + email + '. Отвори го и влизаш директно.')
    }
  }

  function switchMode(m) { setMode(m); setInfo(''); setStuck(false) }

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        {/* Quiet wordmark. The maximal metal-gold logo on this page reads as an
            advert screaming for attention when the job of the screen is one calm
            question: are you a returning client or a new one. Same character as
            the onboarding, so the two screens feel like the same room. */}
        <div className={styles.brand}>
          <span className={styles.brandName}>BLAG</span>
        </div>

        {mode !== 'reset' && (
          <div className={styles.toggle}>
            <button
              className={`${styles.toggleBtn} ${mode === 'login' ? styles.toggleActive : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >
              ВХОД
            </button>
            <button
              className={`${styles.toggleBtn} ${mode === 'register' ? styles.toggleActive : ''}`}
              onClick={() => switchMode('register')}
              type="button"
            >
              РЕГИСТРАЦИЯ
            </button>
          </div>
        )}

        {mode === 'reset' && (
          <p className={styles.resetIntro}>
            Въведи имейла си и ще ти изпратим линк за нова парола.
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">Имейл</label>
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
              <label className={styles.label} htmlFor="auth-password">Парола</label>
              <input
                id="auth-password"
                ref={passwordRef}
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {authError && <p className={styles.error}>{authError}</p>}
          {info      && <p className={styles.info}>{info}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'ВЛЕЗ' : mode === 'register' ? 'СЪЗДАЙ АКАУНТ' : 'ИЗПРАТИ ЛИНК'}
          </button>

          {/* The way out of the locked door: this address has an account, but the
              password wouldn't open it. Almost always an unconfirmed email — but
              the confirmation-resend is silently rate-limited by Supabase, so the
              magic-link goes first: one email, one click, in you go. */}
          {stuck && (
            <div className={styles.recover}>
              <p className={styles.recoverText}>
                Този имейл има акаунт, но входът не мина. Най-бързият път е
                еднократен линк — влизаш директно, без парола и без
                потвърждение.
              </p>
              <div className={styles.recoverActions}>
                <button
                  className={styles.recoverPrimary}
                  onClick={handleMagicLink}
                  disabled={linking}
                  type="button"
                >
                  {linking ? '...' : 'Изпрати ми линк за вход'}
                </button>
                <button
                  className={styles.recoverSecondary}
                  onClick={handleResend}
                  disabled={resending}
                  type="button"
                >
                  {resending ? '...' : 'Или изпрати ново потвърждение на имейла'}
                </button>
                <button
                  className={styles.recoverSecondary}
                  onClick={() => switchMode('reset')}
                  type="button"
                >
                  Забравена парола
                </button>
              </div>
            </div>
          )}
        </form>

        {mode === 'login' && (
          <div className={styles.altActions}>
            <button
              className={styles.forgotLink}
              onClick={handleMagicLink}
              disabled={linking}
              type="button"
            >
              {linking ? 'Изпращам…' : 'Изпрати ми линк за вход'}
            </button>
            <span className={styles.altSep}>·</span>
            <button className={styles.forgotLink} onClick={() => switchMode('reset')} type="button">
              Забравена парола?
            </button>
          </div>
        )}

        {mode === 'reset' && (
          <button className={styles.forgotLink} onClick={() => switchMode('login')} type="button">
            ← Обратно към вход
          </button>
        )}

        {mode !== 'reset' && (
          <>
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>или</span>
              <span className={styles.dividerLine} />
            </div>

            <button className={styles.googleBtn} onClick={signInWithGoogle} type="button">
              <GoogleIcon />
              Продължи с Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}
