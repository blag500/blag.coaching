import { useEffect, useState } from 'react'
import styles from './Brand.module.css'
import { MARK, MARK_BOLD, VIEWBOX } from './markPaths.js'

/* Знакът на здраве и сила: сърце, чиято дясна половина е стегната ръка —
 * юмрук, бицепс, предмишница. Чертежът е проследен 1:1 от образеца
 * (shop/brand/logo/v5/), пътищата идват от scripts/build-shop-mark.mjs.
 * Под 40 px се рисува версията с по-дебели линии — тънките детайли
 * на ръката там се сливат. Правилата — shop/brand/RULES.md. */

export function Mark({ size = 32, mono = false, className = '', title }) {
  return (
    <svg viewBox={VIEWBOX} width={size || undefined} height={size || undefined} className={`${styles.mark} ${mono ? styles.mono : ''} ${className}`}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path fillRule="evenodd" d={size && size < 40 ? MARK_BOLD : MARK} />
    </svg>
  )
}

/** „здраве [знак] сила“ — като на табелата: знакът стои между думите. */
export function Wordmark({ size = 20, className = '' }) {
  return (
    <span className={`${styles.word} ${className}`} style={{ fontSize: size }}>
      <span>здраве</span>
      <Mark size={Math.round(size * 1.4)} className={styles.inline} />
      <span>сила</span>
    </span>
  )
}

/* Сплашът: веднъж на устройство, под секунда и половина. Знакът изплува,
 * удря веднъж като сърце и екранът се вдига. Докосване го пропуска;
 * при „по-малко движение“ и в тестовете го няма. */
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
        <Mark size={150} className={styles.draw} />
        <p className={styles.splashName}>здраве и сила</p>
        <p className={styles.splashLine}>добавки и храна</p>
      </div>
    </div>
  )
}
