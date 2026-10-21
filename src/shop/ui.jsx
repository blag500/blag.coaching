import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { euro } from './cart'
import styles from './Shop.module.css'

/* Малките общи части на магазина. */

export const GOALS = [
  { id: 'strength', label: 'Сила и маса', hint: 'протеин, креатин' },
  { id: 'recovery', label: 'Възстановяване', hint: 'протеин, аминокиселини, минерали' },
  { id: 'energy', label: 'Енергия за тренировка', hint: 'преди и по време' },
  { id: 'health', label: 'Здраве всеки ден', hint: 'витамини, омега 3' },
]

export const CATEGORIES = [
  { id: 'protein', label: 'Протеин' },
  { id: 'creatine', label: 'Креатин' },
  { id: 'amino', label: 'Аминокиселини' },
  { id: 'preworkout', label: 'Преди тренировка' },
  { id: 'vitamins', label: 'Витамини' },
  { id: 'electrolytes', label: 'Електролити' },
  { id: 'snacks', label: 'Снаксове' },
]

export const TAGS = [
  { id: 'vegan', label: 'Веган' },
  { id: 'no_sugar', label: 'Без добавена захар' },
]

export const PRICES = [
  { id: 'u10', label: 'до 10 €', test: (c) => c < 1000 },
  { id: '10-30', label: '10–30 €', test: (c) => c >= 1000 && c < 3000 },
  { id: '30-50', label: '30–50 €', test: (c) => c >= 3000 && c < 5000 },
  { id: 'o50', label: 'над 50 €', test: (c) => c >= 5000 },
]

/** „0,99 € / доза“ — цената, по която се сравнява; при снаксовете няма смисъл. */
export function unitPrice(p) {
  if (!p.servings || p.servings <= 1) return null
  return `${euro(Math.round(p.price_cents / p.servings))} / ${p.serving_unit}`
}

export function Stepper({ value, onChange, label, min = 0 }) {
  return (
    <span className={styles.stepper}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`По-малко ${label}`}>−</button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(50, value + 1))} aria-label={`Повече ${label}`}>+</button>
    </span>
  )
}

/** Лист отдолу на телефона, панел вдясно на компютъра. Escape и фонът го затварят. */
export function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return createPortal(
    <div className={styles.sheetWrap}>
      <button type="button" className={styles.scrim} aria-label="Затвори" onClick={onClose} />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.sheetHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Затвори">✕</button>
        </header>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <footer className={styles.sheetFoot}>{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}

/** Лентата до безплатната доставка: най-близкият праг, който още не е минат. */
export function FreeBar({ subtotal, delivery }) {
  const thresholds = delivery.filter((d) => d.free_from_cents != null)
  if (!thresholds.length) return null
  const courier = Math.max(...thresholds.map((d) => d.free_from_cents))
  const sofia = Math.min(...thresholds.map((d) => d.free_from_cents))
  const target = subtotal < sofia ? sofia : courier
  const left = target - subtotal
  const done = left <= 0
  const what = target === sofia && sofia !== courier ? 'до вратата в София' : 'с куриер'
  return (
    <div className={styles.freeBar} role="status">
      <span>{done
        ? 'Доставката е безплатна навсякъде.'
        : <>Още <b>{euro(left)}</b> до безплатна доставка {what}.</>}</span>
      <span className={styles.freeTrack} aria-hidden="true">
        <span style={{ width: `${Math.min(100, (subtotal / target) * 100)}%` }} />
      </span>
    </div>
  )
}
