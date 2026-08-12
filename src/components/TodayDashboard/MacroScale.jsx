import { useState } from 'react'
import Confetti from './Confetti'
import styles from './MacroScale.module.css'

// Hit, not maxed. Landing in a band is the honest target: 80% of protein is a
// good day, but 130% of fat is not a better one — for three of the four,
// overshooting is the failure mode, so the band closes at the top as well.
const HIT_FROM = 0.8
const HIT_TO   = 1.05

function state(val, target) {
  if (!target) return 'none'
  const r = val / target
  if (r > HIT_TO)   return 'over'
  if (r >= HIT_FROM) return 'hit'
  return 'under'
}

/**
 * The day's four macros as one card instead of four.
 *
 * Four separate tiles spent a third of the screen restating the same shape, and
 * the number that matters is not any one of them — it is whether all four
 * landed. So: four thin tracks, each lit once it is inside its band, and a mark
 * in the corner when the set is complete.
 */
export default function MacroScale({ macros, onOpen, label }) {
  const [burst, setBurst] = useState(0)

  const rows    = macros.map(m => ({ ...m, state: state(m.val, m.target) }))
  const allHit  = rows.length > 0 && rows.every(r => r.state === 'hit')

  return (
    <div
      className={`${styles.card} ${allHit ? styles.cardDone : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen() }}
    >
      {burst > 0 && <Confetti burst={burst} />}

      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {allHit && (
          <button
            type="button"
            className={styles.done}
            /* Its own target, and it swallows the click. Tapping the card still
               opens the food log — you may well want to eat again after hitting
               your numbers, and losing that to a party trick would be a poor
               trade. */
            onClick={e => { e.stopPropagation(); setBurst(b => b + 1) }}
            aria-label="Всички макроси в целта"
          >
            ✓
          </button>
        )}
      </div>

      <div className={styles.rows}>
        {rows.map(m => {
          const pct = m.target > 0 ? Math.min(m.val / m.target, 1) : 0
          const colour = m.state === 'over' ? '#ef5350' : m.color
          return (
            <div key={m.key} className={styles.row}>
              <span className={styles.name}>{m.short}</span>
              <div className={styles.track}>
                <div
                  className={`${styles.fill} ${m.state === 'hit' ? styles.fillHit : ''}`}
                  style={{ width: `${pct * 100}%`, background: colour, '--glow': colour }}
                />
                {/* Where the band opens, so the bar shows what it is aiming at
                    rather than only how far along it is. */}
                {m.target > 0 && <span className={styles.mark} style={{ left: `${HIT_FROM * 100}%` }} />}
              </div>
              <span className={styles.val} style={{ color: m.state === 'under' ? 'var(--muted)' : colour }}>
                {m.val}
                <span className={styles.target}>/{m.target}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
