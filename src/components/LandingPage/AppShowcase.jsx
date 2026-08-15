import styles from './AppShowcase.module.css'

/**
 * Three phones, fanned, cycling through the real screens.
 *
 * A landing page for software that never shows the software is asking to be
 * taken on trust. These are photographs of the running app on his own phone —
 * his numbers, his training, his check-in — not a drawing of what it might
 * look like. Whatever the drawing got wrong, nobody would have known until a
 * visitor installed it and found out.
 *
 * All three run the same four shots on one sixteen-second clock, each starting
 * at a different one. Two things fall out of that: no phone ever shows what
 * its neighbour is showing, and they never turn over together — three
 * simultaneous changes read as a slideshow, one at a time reads as a device
 * being used.
 */
const SHOTS = [
  { src: '/shots/table.webp',    alt: 'Таблото: готовност, тегло, навици, вода и макроси' },
  { src: '/shots/food.webp',     alt: 'Храненето: приемът за деня и дневникът' },
  { src: '/shots/training.webp', alt: 'Тренировката: календарът и упражненията' },
  { src: '/shots/checkin.webp',  alt: 'Чек-инът на формата' },
]

const BEAT = 4      // seconds a screen is held; the CSS cycle is four of these

/** The same four, started from a different one. */
function from(offset) {
  return SHOTS.map((_, i) => SHOTS[(i + offset) % SHOTS.length])
}

function Phone({ className, offset, priority = false }) {
  return (
    <div className={`${styles.phone} ${className}`}>
      <div className={styles.screen}>
        {from(offset).map((shot, i) => (
          <img
            key={shot.src}
            className={styles.shot}
            src={shot.src}
            alt={i === 0 ? shot.alt : ''}
            /* Only the middle phone's first screen is worth blocking on. The
               rest arrive while the visitor is still reading the headline. */
            loading={priority && i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ animationDelay: `${i * BEAT}s` }}
          />
        ))}
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
