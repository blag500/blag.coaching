import { useState, useEffect } from 'react'
import styles from './AppShowcase.module.css'

/**
 * Four phones on a carousel, one of them front and centre.
 *
 * A landing page for software that never shows the software is asking to be
 * taken on trust. These are photographs of the running app on his own phone —
 * his numbers, his training, his check-in — not a drawing of what it might
 * look like.
 *
 * Each phone holds one screen and keeps it. What moves is the carousel: every
 * few seconds the one waiting on the right turns square to the viewer and takes
 * the middle, the one that was in the middle swings out to the left, and the
 * fourth waits out of sight behind. Nothing fades into anything else — a screen
 * arrives by being brought round, which is what a stack of phones on a table
 * would actually do.
 */
const SHOTS = [
  { src: '/shots/table.webp',    alt: 'Таблото: готовност, тегло, навици, вода и макроси' },
  { src: '/shots/food.webp',     alt: 'Храненето: приемът за деня и дневникът' },
  { src: '/shots/training.webp', alt: 'Тренировката: календарът и упражненията' },
  { src: '/shots/checkin.webp',  alt: 'Чек-инът на формата' },
]

const HOLD = 4200   // how long a screen stays in the middle

/* The four places a phone can be, as one table rather than as four branches in
   the markup. Position 2 is the one nobody sees: it is parked small and behind
   the middle, which is where a card has to be so that arriving on the right and
   leaving on the left are the same journey. */
const PLACE = [
  { x: 0,   deg: 0,   scale: 1,    opacity: 1,    z: 3 },  // centre
  { x: 86,  deg: -26, scale: 0.78, opacity: 0.62, z: 2 },  // waiting, right
  { x: 0,   deg: 0,   scale: 0.55, opacity: 0,    z: 0 },  // out of sight
  { x: -86, deg: 26,  scale: 0.78, opacity: 0.62, z: 2 },  // leaving, left
]

export default function AppShowcase() {
  const [k, setK] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setK(v => v + 1), HOLD)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className={styles.stage}>
      <div className={styles.carousel}>
        {SHOTS.map((shot, i) => {
          // Which of the four places this phone is standing in right now.
          const p = PLACE[(i - k % SHOTS.length + SHOTS.length) % SHOTS.length]
          return (
            <div
              key={shot.src}
              className={`${styles.phone} ${p.z === 3 ? styles.front : ''}`}
              style={{
                transform: `translateX(${p.x}px) rotateY(${p.deg}deg) scale(${p.scale})`,
                opacity: p.opacity,
                zIndex: p.z,
              }}
            >
              <div className={styles.screen}>
                <img
                  className={styles.shot}
                  src={shot.src}
                  alt={shot.alt}
                  /* Only the one that opens in the middle is worth blocking on;
                     the rest arrive while the headline is still being read. */
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
