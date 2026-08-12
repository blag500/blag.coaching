import { useState } from 'react'
import Confetti from './Confetti'
import styles from './MacroScale.module.css'

/* Drawn rather than lettered, and drawn in the row's own colour so each line
   stays one thing. Emoji would have brought their own palette into a card whose
   whole job is four colours. */
const ICONS = {
  kcal: (
    <path d="M12 2.5c.6 2.6 2.2 3.6 3.3 5.2A6 6 0 1 1 6 11.4c0-1.4.6-2.6 1.5-3.5 0 1.3.5 2.2 1.5 2.2 1.2 0 1.7-1 1.4-2.6-.3-1.7-.1-3.4 1.6-5z" />
  ),
  protein: (
    <path d="M12 3c3.1 0 5.6 4.7 5.6 8.6A5.6 5.6 0 0 1 6.4 11.6C6.4 7.7 8.9 3 12 3z" />
  ),
  carbs: (
    <g>
      <path d="M12 21V8.5" />
      <path d="M12 12.4c-2.1-.3-3.3-1.7-3.4-3.6 2 .1 3.3 1.4 3.4 3.6z" />
      <path d="M12 12.4c2.1-.3 3.3-1.7 3.4-3.6-2 .1-3.3 1.4-3.4 3.6z" />
      <path d="M12 8.4C10.2 8 9.2 6.7 9.1 5c1.8.2 2.8 1.4 2.9 3.4z" />
      <path d="M12 8.4c1.8-.4 2.8-1.7 2.9-3.4-1.8.2-2.8 1.4-2.9 3.4z" />
    </g>
  ),
  /* A droplet of oil. Round-topped egg against pointed-topped droplet reads
     clearly enough at this size, and the colours never swap. */
  fat: (
    <path d="M12 3.4c3.4 4 5.2 6.5 5.2 8.9a5.2 5.2 0 0 1-10.4 0c0-2.4 1.8-4.9 5.2-8.9z" />
  ),
}

function MacroIcon({ id, colour }) {
  const stroked = id === 'carbs'
  return (
    <svg
      viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"
      fill={stroked ? 'none' : colour}
      stroke={stroked ? colour : 'none'}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    >
      {ICONS[id] ?? null}
    </svg>
  )
}

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
              <span className={styles.icon}>
                <MacroIcon id={m.key} colour={m.state === 'under' ? 'var(--muted)' : colour} />
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
