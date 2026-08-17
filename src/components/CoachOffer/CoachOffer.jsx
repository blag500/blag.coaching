import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Lessons from '../LandingPage/Lessons'
import land from '../LandingPage/LandingPage.module.css'
import styles from './CoachOffer.module.css'

/**
 * The last screen of registration: the coaching ask.
 *
 * It is the landing page's first screen again, on purpose — the same print, the
 * same ink, the same glass button. Somebody who arrived from a video saw this
 * poster before they had an account; seeing it again the moment their numbers
 * are calculated says the offer they came for is still the offer.
 *
 * The styles come out of LandingPage.module.css rather than being copied here.
 * Two sheets of the same poster that can drift apart are two posters.
 */

/* His own account, as on the landing page. The brand account has nobody behind
   it yet, and a message into an empty inbox is worse than no button at all. */
const IG = 'https://ig.me/m/niki.blggg'

/* What he teaches, on a screen of its own. The five lines are the answer to
   "why would I need a coach" — they are also the only thing on this flow that
   opens onto footage, so the answer is shown rather than argued. */
function WhySheet({ onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const had = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = had
    }
  }, [onClose])

  /* To the body. The onboarding page is inside the app shell, which carries
     transforms — a fixed element inside one is positioned against it rather
     than against the window. */
  return createPortal(
    <div className={styles.whySheet} role="dialog" aria-label="Защо ми е Blag Coach">
      {/* The same print and the same dark pillow the lessons section carries on
          the landing page — reused, not copied, so the two never drift. */}
      <div className={land.lessonsBg} aria-hidden="true" />
      <div className={land.lessonsWash} aria-hidden="true" />
      {/* Fades the print into black at the top, the way the landing section does,
          so THE BLAG COACH and the heading read against the dark rather than the
          halftone. */}
      <div className={styles.topFade} aria-hidden="true" />
      <div className={styles.whyBody}>
        <span className={land.markLink}>
          <span className={land.markText}>THE BLAG COACH</span>
        </span>
        <h2 className={land.h2}>ще те научи как да:</h2>
        <Lessons />
      </div>

      {/* Sticky, so it is reachable with the list scrolled anywhere. Back, not
          close: it returns to the screen with the button on it. */}
      <div className={styles.whyFoot}>
        <button className={styles.back} onClick={onClose} type="button">← НАЗАД</button>
      </div>
    </div>,
    document.body,
  )
}

export default function CoachOffer({ onWrite, onSkip, saving, error }) {
  const [why, setWhy] = useState(false)

  return (
    <div className={styles.page}>
      <div className={`${land.sheet} ${styles.sheetSeat}`}>
        <img className={land.poster} src="/poster.webp" alt="" fetchpriority="high" />
        <div className={land.ink}>
          <h1 className={land.inkName}>
            Blag Coaching
            <span className={land.inkAmp}>&amp;</span>
            Blag app
          </h1>
        </div>
      </div>
      <span className={land.posterShade} aria-hidden="true" />

      <div className={styles.stack}>
        {error && <p className={styles.error}>{error}</p>}

        {/* The profile is written and the plan is marked before the message app
            takes over the screen, so a client who writes and never comes back
            is still a client with an account and a marked interest. */}
        <a
          className={land.heroCta}
          href={IG}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWrite}
        >
          ПИШИ МИ ЗА БЕЗПЛАТНА ТРЕНИРОВКА
        </a>

        <button className={styles.why} onClick={() => setWhy(true)} type="button">
          Защо ми е Blag Coach
        </button>

        <button className={styles.skip} onClick={onSkip} disabled={saving} type="button">
          {saving ? '...' : 'Продължи сам'}
        </button>
      </div>

      {why && <WhySheet onClose={() => setWhy(false)} />}
    </div>
  )
}
