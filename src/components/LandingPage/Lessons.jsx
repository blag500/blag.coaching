import { useRef, useState } from 'react'
import styles from './Lessons.module.css'

/**
 * What he teaches, shown rather than claimed.
 *
 * The page can say "треньор" as often as it likes; a visitor from a video has
 * no way to weigh that. Eleven seconds of him under a machine is the only
 * sentence on this page that cannot be written by somebody who cannot do it.
 *
 * Nothing plays until it is asked for. Three portrait videos starting by
 * themselves would be three downloads and three moving things fighting for the
 * same pair of eyes — so each card is a still until it is touched, and touching
 * one stops whichever was already running.
 */

/* Names are his to correct — these are read off the footage, and the coach is
   the only person here entitled to say what a movement is called. */
const LESSONS = [
  { id: '5765', title: 'Разтваряния на машина', muscle: 'ГЪРДИ' },
  { id: '5766', title: 'Издърпване на скрипец', muscle: 'ГРЪБ' },
  { id: '5769', title: 'Наклонена преса с дъмбели', muscle: 'ГЪРДИ' },
]

export default function Lessons() {
  const [playing, setPlaying] = useState(null)
  const refs = useRef({})

  function toggle(id) {
    // One at a time. Two clips running side by side is a shop window, not a
    // lesson, and neither of them gets watched.
    Object.entries(refs.current).forEach(([key, el]) => {
      if (el && key !== id) { el.pause(); el.currentTime = 0 }
    })
    const el = refs.current[id]
    if (!el) return
    if (playing === id) { el.pause(); setPlaying(null) }
    else { el.play().catch(() => {}); setPlaying(id) }
  }

  return (
    <div className={styles.row}>
      {LESSONS.map(l => (
        <button
          key={l.id}
          type="button"
          className={`${styles.card} ${playing === l.id ? styles.on : ''}`}
          onClick={() => toggle(l.id)}
          aria-label={`${l.title} — пусни видеото`}
        >
          <video
            ref={el => { refs.current[l.id] = el }}
            className={styles.video}
            poster={`/lessons/${l.id}.jpg`}
            /* Silent by design: these are demonstrations, not talks. Muted also
               means a phone will let them start without a second tap. */
            muted loop playsInline
            preload="none"
            onEnded={() => setPlaying(null)}
          >
            <source src={`/lessons/${l.id}.webm`} type="video/webm" />
            <source src={`/lessons/${l.id}.mp4`} type="video/mp4" />
          </video>

          <span className={styles.shade} aria-hidden="true" />

          {playing !== l.id && (
            <span className={styles.play} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M8 5.4v13.2l10.4-6.6z" />
              </svg>
            </span>
          )}

          <span className={styles.meta}>
            <span className={styles.muscle}>{l.muscle}</span>
            <span className={styles.title}>{l.title}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
