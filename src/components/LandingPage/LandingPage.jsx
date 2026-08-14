import { useState, useEffect, useRef } from 'react'
import styles from './LandingPage.module.css'
import { savePendingWeight, parseWeight } from '../../utils/pendingWeight'

export default function LandingPage({ onContinue, onLogin }) {
  /* One number, asked for before anything else.
     "Влез в приложението" asks a stranger to commit to something they cannot
     see yet. A weight field asks for three seconds and one fact they already
     know, and the person who answers it has started using the thing rather than
     considered using it. The number is not thrown away: it is what onboarding
     opens with, in place of the 80 kg placeholder. */
  const [kg, setKg] = useState('')
  const valid = parseWeight(kg) !== null

  function start(e) {
    e?.preventDefault()
    // An empty field must never block the door. Someone who does not want to
    // type their weight into a page they just landed on is still welcome.
    if (valid) savePendingWeight(kg)
    onContinue()
  }

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

  /* Autoplay is refused more often than it looks: iOS in Low Power Mode blocks
     it outright, and a page that then sits on its poster forever looks broken
     rather than restrained. So the play is asked for, and if it is refused, it
     is asked for again at the first touch — by which point the browser counts
     it as something the visitor started. */
  const videoRef = useRef(null)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const start = () => v.play().catch(() => {})
    start()
    const once = () => { start(); window.removeEventListener('touchstart', once); window.removeEventListener('click', once) }
    window.addEventListener('touchstart', once, { passive: true })
    window.addEventListener('click', once)
    return () => { window.removeEventListener('touchstart', once); window.removeEventListener('click', once) }
  }, [stillOnly])

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
          ref={videoRef}
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
        {/* Someone arriving from a video has never heard of this and cannot
            tell it from any other tracker. One sentence, saying the thing that
            is actually different: a person reads the numbers, not only an app
            that collects them. */}
        <p className={styles.pitch}>
          Приложение, което следи храненето и тренировките ти — и треньор,
          който ги гледа.
        </p>
      </div>

      <form className={styles.bottom} onSubmit={start}>
        <label className={styles.weighLabel} htmlFor="landing-kg">
          Започни с днешното си тегло
        </label>
        <div className={styles.weighRow}>
          <input
            id="landing-kg"
            className={styles.weighInput}
            value={kg}
            onChange={e => setKg(e.target.value)}
            /* decimal, not numeric: the phone keyboard has to carry a comma,
               and 82,5 is how the number is written here. */
            inputMode="decimal"
            enterKeyHint="go"
            placeholder="82,5"
            autoComplete="off"
            maxLength={5}
          />
          <span className={styles.weighUnit}>кг</span>
        </div>

        <button className={styles.cta} type="submit">
          {valid ? 'ЗАПИШИ ТЕГЛОТО СИ' : 'ВЛЕЗ В ПРИЛОЖЕНИЕТО'}
        </button>
        <p className={styles.note}>Безплатно завинаги. Без карта.</p>
        <button className={styles.loginLink} onClick={onLogin} type="button">
          Вече ползваш приложението? <span className={styles.loginLinkUnder}>Логни се тук.</span>
        </button>

        {/* Deliberately quiet and last. Two equal invitations on one screen get
            fewer of both — the visitor stops to choose instead of acting. This
            is here for the one who wants to talk before signing up, not to
            compete with the button above it. */}
        <a
          className={styles.contact}
          href="https://instagram.com/blag.coaching"
          target="_blank"
          rel="noopener noreferrer"
        >
          Или ми пиши в Instagram
        </a>
      </form>
    </div>
  )
}
