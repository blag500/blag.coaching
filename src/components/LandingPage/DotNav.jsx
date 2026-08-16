import { useEffect, useState } from 'react'
import styles from './DotNav.module.css'

/**
 * Where you are on the page, as a run of connected dots down one edge.
 *
 * The page is a funnel with a fixed number of stops, and a visitor scrolling
 * through it has no way to tell how much of it is left — a bar that fills tells
 * them nothing about the shape, only about the distance. Dots say both: how
 * many stops there are, and which one is under the thumb.
 *
 * IntersectionObserver rather than a scroll handler: the browser already knows
 * which section is on screen, and asking it every frame is work nobody sees.
 */
export default function DotNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id)

  useEffect(() => {
    const els = sections
      .map(s => document.getElementById(s.id))
      .filter(Boolean)
    if (!els.length) return

    const io = new IntersectionObserver(
      entries => {
        // The one covering most of the middle band wins. Two sections are
        // often partly visible at once, and picking the first would make the
        // marker jump back a step whenever the next one peeked in.
        const best = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (best) setActive(best.target.id)
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  return (
    <nav className={styles.rail} aria-label="Навигация по страницата">
      {sections.map(s => (
        <button
          key={s.id}
          type="button"
          className={`${styles.dot} ${active === s.id ? styles.dotOn : ''}`}
          aria-label={s.label}
          aria-current={active === s.id ? 'true' : undefined}
          onClick={() => document.getElementById(s.id)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.tip} aria-hidden="true">{s.label}</span>
        </button>
      ))}
    </nav>
  )
}
