import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './AppShowcase.module.css'

/**
 * Four phones on a carousel, one of them front and centre.
 * Photographs of the running app on his own phone.
 */
const SHOT_KEYS = [
  { src: '/shots/table.webp',    altKey: 'showcase.alt.dashboard' },
  { src: '/shots/food.webp',     altKey: 'showcase.alt.food'      },
  { src: '/shots/training.webp', altKey: 'showcase.alt.training'  },
  { src: '/shots/checkin.webp',  altKey: 'showcase.alt.checkin'   },
]

const HOLD = 4200

const PLACE = [
  { x: 0,   deg: 0,   scale: 1,    opacity: 1,    z: 3 },
  { x: 86,  deg: -26, scale: 0.78, opacity: 0.62, z: 2 },
  { x: 0,   deg: 0,   scale: 0.55, opacity: 0,    z: 0 },
  { x: -86, deg: 26,  scale: 0.78, opacity: 0.62, z: 2 },
]

export default function AppShowcase() {
  const { t } = useSettings()
  const [k, setK] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setK(v => v + 1), HOLD)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className={styles.stage}>
      <div className={styles.carousel}>
        {SHOT_KEYS.map((shot, i) => {
          const p = PLACE[(i - k % SHOT_KEYS.length + SHOT_KEYS.length) % SHOT_KEYS.length]
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
                  alt={t(shot.altKey)}
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
