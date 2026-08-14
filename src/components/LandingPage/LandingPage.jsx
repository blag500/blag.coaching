import { useState, useEffect, useRef } from 'react'
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
        {/* Three words, in the same idiom as the row of nouns that used to sit
            here: separated by middots rather than full stops. Three short
            sentences in a row is the cadence of every advert ever written, and
            the eye skips it — the same three words on one line read as a label
            instead. */}
        <p className={styles.sub}>Виж · Ползвай · Постигай</p>
      </div>

      <div className={styles.bottom}>
        <button className={styles.cta} onClick={onContinue} type="button">
          ВЛЕЗ В ПРИЛОЖЕНИЕТО
        </button>
        <button className={styles.loginLink} onClick={onLogin} type="button">
          Вече ползваш приложението? <span className={styles.loginLinkUnder}>Логни се тук.</span>
        </button>

        {/* Marks, not sentences. "Или ми пиши в Instagram" was a third line of
            text on a page that already had too many, and it named one network
            while there are two. A logo needs no verb: everyone who has ever used
            either of them recognises it faster than they can read.
            Quiet and last on purpose — two equal invitations on one screen get
            fewer of both, and the button above is the one that matters. */}
        <div className={styles.social}>
          <a
            className={styles.socialBtn}
            href="https://instagram.com/blag.coaching"
            target="_blank" rel="noopener noreferrer" aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
                 stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5.2" />
              <circle cx="12" cy="12" r="4.1" />
              <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            className={styles.socialBtn}
            /* The address he sent carried ?_r and ?_t — those belong to his own
               session on his own phone and mean nothing to a visitor. */
            href="https://www.tiktok.com/@blag.coaching"
            target="_blank" rel="noopener noreferrer" aria-label="TikTok"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
              <path d="M16.9 2.6c.36 2.06 1.6 3.36 3.6 3.5v2.7c-1.18.06-2.28-.28-3.36-.95v5.86c0 3.6-2.9 6.06-5.98 6.06-3.32 0-5.76-2.66-5.76-5.86 0-3.4 2.86-5.98 6.5-5.62v2.86c-.44-.12-.86-.18-1.28-.18-1.6 0-2.94 1.3-2.94 2.94 0 1.78 1.36 3.02 3.06 3.02s3.06-1.28 3.06-3.06V2.6h3.1z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
