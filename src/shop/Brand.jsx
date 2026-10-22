import { useEffect, useState } from 'react'
import styles from './Brand.module.css'

/* Знакът на здраве&сила: амперсанд, чиято горна примка е сърце, а опашката
 * му се вдига нагоре. Името вече е „здраве и сила“ — знакът е самото „и“.
 * Чертежът е в shop/brand/logo/, правилата — в shop/brand/RULES.md. Тук е
 * същата геометрия, за да може да се анимира по части. */

const HEART = 'M118 130 C 64 100, 44 46, 86 37 C 103 34, 114 44, 118 56 C 122 44, 133 34, 150 37 C 192 46, 172 100, 118 130'
const LEG = 'M118 130 L 210 222'
const BOWL = 'M118 130 C 60 162, 48 218, 102 220 C 148 222, 180 192, 200 148'

export function Mark({ size = 32, mono = false, className = '', title }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} className={`${styles.mark} ${mono ? styles.mono : ''} ${className}`}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g transform="translate(-8 2)" fill="none" strokeWidth={size < 24 ? 30 : 25} strokeLinecap="round" strokeLinejoin="round">
        <path className={styles.bowl} d={BOWL} pathLength="1" />
        <path className={styles.leg} d={LEG} pathLength="1" />
        <path className={styles.heart} d={HEART} pathLength="1" />
      </g>
    </svg>
  )
}

/** „здраве&сила“ — името с малки букви, знакът на мястото на „&“. */
export function Wordmark({ size = 20, className = '' }) {
  return (
    <span className={`${styles.word} ${className}`} style={{ fontSize: size }}>
      <span>здраве</span>
      <Mark size={Math.round(size * 1.15)} className={styles.inline} />
      <span>сила</span>
    </span>
  )
}

/* Сплашът: веднъж на устройство, под секунда и половина. Сърцето се чертае,
 * после краката на „&“, сърцето удря веднъж и екранът се вдига. Докосване
 * го пропуска; при „по-малко движение“ и в тестовете го няма. */
const SEEN = 'zs.splash'

function shouldShow() {
  try {
    if (navigator.webdriver) return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (localStorage.getItem(SEEN)) return false
    localStorage.setItem(SEEN, '1')
    return true
  } catch {
    return false
  }
}

export function Splash() {
  const [phase, setPhase] = useState(() => (shouldShow() ? 'in' : 'gone'))
  useEffect(() => {
    if (phase === 'gone') return undefined
    const t1 = window.setTimeout(() => setPhase('out'), 1350)
    const t2 = window.setTimeout(() => setPhase('gone'), 1350 + 520)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [phase === 'gone']) // eslint-disable-line react-hooks/exhaustive-deps
  if (phase === 'gone') return null
  return (
    <div className={`${styles.splash} ${phase === 'out' ? styles.splashOut : ''}`} onClick={() => setPhase('out')} aria-hidden="true">
      <div className={styles.splashInner}>
        <Mark size={132} className={styles.draw} />
        <p className={styles.splashName}>здраве<span>&amp;</span>сила</p>
        <p className={styles.splashLine}>добавки, подбрани от треньор</p>
      </div>
    </div>
  )
}
