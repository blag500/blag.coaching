import { useState } from 'react'
import Confetti from './Confetti'
import Pictogram from '../Pictogram/Pictogram'
import styles from './MacroScale.module.css'

const HIT_FROM = 0.8

// The ceiling is not the same for all four, and treating it as if it were is
// what marked a good day as a bad one: protein above target is not overshooting
// anything, it is just a strong day. Calories are the figure that actually has
// to be kept, so they close tightest; carbs and fat get room for the few grams
// that a portion estimate is out by anyway.
const CEILING = { kcal: 1.05, carbs: 1.10, fat: 1.10, protein: Infinity }

function state(key, val, target) {
  if (!target) return 'none'
  const r = val / target
  if (r > (CEILING[key] ?? 1.10)) return 'over'
  if (r >= HIT_FROM)              return 'hit'
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
export default function MacroScale({ macros, label }) {
  const [burst, setBurst] = useState(0)

  const rows    = macros.map(m => ({ ...m, state: state(m.key, m.val, m.target) }))
  const allHit  = rows.length > 0 && rows.every(r => r.state === 'hit')

  // The card does not navigate. The plus in the bar below is the way into
  // logging and it is one thumb-reach away, so spending this card's whole
  // surface on a second route to the same place bought nothing — and it cost
  // the obvious place to put the reward.
  const Tag = allHit ? 'button' : 'div'

  return (
    <Tag
      className={`${styles.card} ${allHit ? styles.cardDone : ''}`}
      type={allHit ? 'button' : undefined}
      onClick={allHit ? () => setBurst(b => b + 1) : undefined}
      aria-label={allHit ? 'Всички макроси в целта' : undefined}
    >
      {burst > 0 && <Confetti burst={burst} />}

      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {allHit && <span className={styles.done}>✓</span>}
      </div>

      <div className={styles.rows}>
        {rows.map(m => {
          const pct = m.target > 0 ? Math.min(m.val / m.target, 1) : 0
          const colour = m.state === 'over' ? '#ef5350' : m.color
          return (
            <div key={m.key} className={styles.row}>
              <span
                className={styles.icon}
                style={{ color: m.state === 'under' ? 'var(--muted)' : colour }}
              >
                <Pictogram name={m.key} size={18} />
              </span>
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
    </Tag>
  )
}
