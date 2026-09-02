import { useState, useEffect } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
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
export default function MacroScale({ macros, label, log = [], t }) {
  const [burst, setBurst] = useState(0)
  const [back, setBack] = useState(false)
  // First-paint pour: bars render at 0 for one frame, then transition to their
  // target width. Only on mount — subsequent macro updates use the same
  // width-transition without the flourish.
  const [poured, setPoured] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPoured(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const rows    = macros.map(m => ({ ...m, state: state(m.key, m.val, m.target) }))
  const allHit  = rows.length > 0 && rows.every(r => r.state === 'hit')

  // Newest first: the thing just eaten is the thing being checked.
  const entries = [...log].reverse()

  /* A div with a role rather than a button, because it now contains two of
     them — the turn and, when the set is complete, the reward. A button inside
     a button is invalid, and the browsers that tolerate it disagree about which
     one a tap belongs to. */
  const replay = allHit ? () => setBurst(b => b + 1) : undefined

  return (
    <div className={styles.flip}>
      <div className={`${styles.inner} ${back ? styles.turned : ''}`}>
    <div
      className={`${styles.card} ${styles.face} ${allHit ? styles.cardDone : ''}`}
      onClick={replay}
      role={allHit ? 'button' : undefined}
      tabIndex={allHit ? 0 : undefined}
      onKeyDown={allHit ? e => { if (e.key === 'Enter' || e.key === ' ') replay() } : undefined}
      aria-label={allHit ? t('today.allMacrosHit') : undefined}
      aria-hidden={back}
    >
      {burst > 0 && <Confetti burst={burst} />}

      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {allHit && <span className={styles.done}>✓</span>}
      </div>

      <div className={styles.rows}>
        {rows.map((m, i) => <MacroRow key={m.key} m={m} i={i} poured={poured} />)}
      </div>

      {/* The whole day's log lives on the other side of this card rather than in
          a card of its own below it. It is the same subject — what was eaten —
          and it was costing a full panel to show three of them. */}
      <button
        type="button"
        className={styles.turn}
        onClick={e => { e.stopPropagation(); setBack(true) }}
      >
        {t('today.recentAdded')} →
      </button>
    </div>

    <div className={`${styles.card} ${styles.face} ${styles.backFace}`} aria-hidden={!back}>
      <div className={styles.head}>
        <span className={styles.label}>{t('today.recentAdded')}</span>
        <span className={styles.count}>{entries.length}</span>
      </div>

      {/* Scrolls inside the card, which keeps the card the height of its front
          — a panel that grows with the number of meals would push everything
          below it down the page by a different amount every day. */}
      <div className={styles.logList}>
        {entries.length === 0 && <p className={styles.logEmpty}>{t('today.recentEmpty')}</p>}
        {entries.map((f, i) => (
          <div key={f.id ?? i} className={styles.logRow}>
            <span className={styles.logName}>
              {/* The same drawn ≈ the food log uses, for the same reason: a
                  number a model guessed should say so wherever it is read. */}
              {f.estimated && (
                <svg viewBox="0 0 20 20" width="11" height="11" className={styles.estMark}
                     aria-label={t('foodlog.estimated')} role="img">
                  <path d="M5 8.2c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0M5 12.4c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0"
                        fill="none" stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" transform="translate(1,0)" />
                </svg>
              )}
              {f.name}
            </span>
            <span className={styles.logKcal}>{f.kcal} {t('today.kcal')}</span>
          </div>
        ))}
      </div>

      <button type="button" className={styles.turn} onClick={() => setBack(false)}>
        ← {label}
      </button>
    </div>
      </div>
    </div>
  )
}

/* Един ред: иконата, лентата и числото.
 *
 * Отделен компонент само защото числото има свой брояч, а кука не се вика в
 * цикъл — броят на макросите е четири и днес не се мени, но правило, което
 * държи само докато никой не пипа масива, не е правило. */
function MacroRow({ m, i, poured }) {
  const pct    = m.target > 0 ? Math.min(m.val / m.target, 1) : 0
  const colour = m.state === 'over' ? 'var(--red)' : m.color

  /* Числото пътува със същата вълна като лентата под него. Без това лентата се
     наливаше половин секунда към стойност, която числото отдясно вече беше
     обявило — движение и резултат, които си противоречат.
     Тръгва чак когато лентата тръгне: докато картата е още на нула, броенето
     би текло зад невидима лента. */
  const shown = useCountUp(poured ? m.val : 0, { duration: 620, delay: i * 80 })

  return (
    <div className={styles.row}>
      <span
        className={styles.icon}
        style={{ color: m.state === 'under' ? 'var(--muted)' : colour }}
      >
        <Pictogram name={m.key} size={18} />
      </span>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${m.state === 'hit' ? styles.fillHit : ''}`}
          style={{
            width: poured ? `${pct * 100}%` : '0%',
            /* Градиентът е на макроса, не на лентата: същият тон,
               но с дълбочина, за да чете лентата като налято, а не
               като запълнено. */
            background: m.grad ?? colour,
            '--glow': m.glow ?? colour,
            // Staggered so the four bars pour in a wave, not in unison.
            transitionDelay: poured ? `${i * 80}ms` : '0ms',
          }}
        />
        {/* Where the band opens, so the bar shows what it is aiming at
            rather than only how far along it is. */}
        {m.target > 0 && <span className={styles.mark} style={{ left: `${HIT_FROM * 100}%` }} />}
      </div>
      <span className={styles.val} style={{ color: m.state === 'under' ? 'var(--muted)' : colour }}>
        {shown}
        <span className={styles.target}>/{m.target}</span>
      </span>
    </div>
  )
}
