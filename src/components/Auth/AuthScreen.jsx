import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './AuthScreen.module.css'

export default function AuthScreen() {
  const { signIn, signUp, authError } = useAuth()
  const [mode, setMode]       = useState('login') // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setInfo('')

    if (mode === 'login') {
      await signIn(email, password)
    } else {
      const ok = await signUp(email, password, name)
      if (ok) setInfo('Провери имейла си за потвърждение.')
    }

    setLoading(false)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandName}>BLAG</span>
          <div className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandSub}>COACHING</span>
        </div>

        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'login' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('login'); setInfo('') }}
            type="button"
          >
            ВХОД
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'register' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('register'); setInfo('') }}
            type="button"
          >
            РЕГИСТРАЦИЯ
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-name">Твоето име</label>
              <input
                id="auth-name"
                className={styles.input}
                type="text"
                placeholder="Николай"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

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

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">Парола</label>
            <input
              id="auth-password"
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

          {authError && <p className={styles.error}>{authError}</p>}
          {info      && <p className={styles.info}>{info}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'ВЛЕЗ' : 'СЪЗДАЙ АКАУНТ'}
          </button>
        </form>
      </div>
    </div>
  )
}
