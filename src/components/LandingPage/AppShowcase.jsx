import { useState, useEffect } from 'react'
import styles from './AppShowcase.module.css'

/**
 * Three phones, fanned, turning over to the next screen.
 *
 * A landing page for software that never shows the software is asking to be
 * taken on trust. These are photographs of the running app on his own phone —
 * his numbers, his training, his check-in — not a drawing of what it might
 * look like.
 *
 * The screens turn rather than fade. A crossfade says one picture is being
 * replaced by another; a half turn says the phone has a second side, which is
 * the impression a device gives when somebody is using it. Two faces, and the
 * one about to come round is loaded while it is still behind.
 *
 * All three run the same four screens, each starting at a different one, so no
 * phone ever shows what its neighbour shows and they never turn together.
 */
const SHOTS = [
  { src: '/shots/table.webp',    alt: 'Таблото: готовност, тегло, навици, вода и макроси' },
  { src: '/shots/food.webp',     alt: 'Храненето: приемът за деня и дневникът' },
  { src: '/shots/training.webp', alt: 'Тренировката: календарът и упражненията' },
  { src: '/shots/checkin.webp',  alt: 'Чек-инът на формата' },
]

const BEAT = 4200   // how long a screen is held
const TURN = 720    // how long the half turn takes

function Phone({ className, offset, priority = false }) {
  // How many half turns have happened. The visible face is k % 2, and it shows
  // SHOTS[k % 4] — everything else is derived from that one number.
  const [k, setK] = useState(0)
  const [faces, setFaces] = useState([
    SHOTS[offset % SHOTS.length],
    SHOTS[(offset + 1) % SHOTS.length],
  ])

  useEffect(() => {
    // Staggered so the three phones never turn on the same beat.
    const start = setTimeout(() => {
      setK(v => v + 1)
      const iv = setInterval(() => setK(v => v + 1), BEAT)
      cancel = () => clearInterval(iv)
    }, BEAT + offset * (BEAT / SHOTS.length))
    let cancel = () => {}
    return () => { clearTimeout(start); cancel() }
  }, [offset])

  /* The face that has just gone behind gets the next screen — after the turn
     has finished, never during it. Loaded any earlier and the picture would
     change while that face was still in view. */
  useEffect(() => {
    if (k === 0) return
    const t = setTimeout(() => {
      setFaces(f => {
        const next = [...f]
        next[k % 2 === 0 ? 1 : 0] = SHOTS[(offset + k + 1) % SHOTS.length]
        return next
      })
    }, TURN)
    return () => clearTimeout(t)
  }, [k, offset])

  return (
    <div className={`${styles.phone} ${className}`}>
      <div className={styles.screen}>
        <div
          className={styles.turner}
          style={{ transform: `rotateY(${k * 180}deg)`, transitionDuration: `${TURN}ms` }}
        >
          {faces.map((shot, i) => (
            <img
              key={i}
              className={`${styles.face} ${i === 1 ? styles.back : ''}`}
              src={shot.src}
              alt={i === 0 ? shot.alt : ''}
              loading={priority && i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AppShowcase() {
  return (
    <div className={styles.fan}>
      <Phone className={styles.left}  offset={2} />
      <Phone className={styles.mid}   offset={0} priority />
      <Phone className={styles.right} offset={3} />
    </div>
  )
}
