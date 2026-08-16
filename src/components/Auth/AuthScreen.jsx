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
  const { signIn, signUp, signInWithGoogle, resetPassword, authError } = useAuth()
  const [mode, setMode]         = useState(initialMode) // 'login' | 'register' | 'reset'
  const [email, setEmail]       = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [info, setInfo]         = useState('')
  const passwordRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setInfo('')

    if (mode === 'reset') {
      const ok = await resetPassword(email)
      if (ok) setInfo('Изпратихме линк за нова парола. Провери имейла си.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      await signIn(email, password)
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

  function switchMode(m) { setMode(m); setInfo('') }

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.armsRow}>
            <div className={styles.armLeft} aria-hidden="true" />
            <div className={styles.brandCenter}>
              <span className={styles.brandName}>BLAG</span>
              <p className={styles.brandTagline}>BE BLAG, BE BETTER</p>
            </div>
            <div className={styles.armRight} aria-hidden="true" />
          </div>
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
              onChange={e => setEmail(e.target.value)}
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
        </form>

        {mode === 'login' && (
          <button className={styles.forgotLink} onClick={() => switchMode('reset')} type="button">
            Забравена парола?
          </button>
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
