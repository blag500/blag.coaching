import { useState, useEffect } from 'react'
import styles from './LandingPage.module.css'

export default function LandingPage({ onContinue, onLogin }) {
  // Respect the setting, and follow it if it changes while the page is open.
  const [stillOnly, setStillOnly] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = e => setStillOnly(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  return (
    <div className={styles.page}>
      {/* Held far back, dimmed and masked: a real gym behind the words does
          more for this than any amount of gradient, but the headline has to
          stay the brightest thing on the screen.

          Decided in JS rather than hidden in CSS, so that someone who has asked
          for less movement does not download five seconds of video in order to
          not watch it. */}
      {stillOnly ? (
        <div className={styles.backdropStill} aria-hidden="true" />
      ) : (
        <video
          className={styles.backdrop}
          autoPlay muted loop playsInline
          preload="auto"
          poster="/hero-poster.jpg"
          aria-hidden="true"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      )}
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={styles.logo}>
        <span className={styles.logoName}>BLAG</span>
      </div>

      <div className={styles.hero}>
        <h1 className={styles.headline}>ПОСТИГНИ<br />ЦЕЛТА СИ</h1>
        <p className={styles.sub}>Хранене · Тренировки · Прогрес</p>
      </div>

      <div className={styles.bottom}>
        <button className={styles.cta} onClick={onContinue} type="button">
          ВЛЕЗ В ПРИЛОЖЕНИЕТО
        </button>
        <p className={styles.note}>Безплатно завинаги. Без карта.</p>
        <button className={styles.loginLink} onClick={onLogin} type="button">
          Вече ползваш приложението? <span className={styles.loginLinkUnder}>Логни се тук.</span>
        </button>
      </div>
    </div>
  )
}
