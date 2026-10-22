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
  { id: 'mealprep', label: 'Готвене за седмицата', hint: 'грис, овес, какао, подсладител' },
]

export const CATEGORIES = [
  { id: 'protein', label: 'Протеин' },
  { id: 'creatine', label: 'Креатин' },
  { id: 'amino', label: 'Аминокиселини' },
  { id: 'preworkout', label: 'Преди тренировка' },
  { id: 'vitamins', label: 'Витамини' },
  { id: 'electrolytes', label: 'Електролити' },
  { id: 'snacks', label: 'Снаксове' },
  { id: 'pantry', label: 'За готвене' },
]

export const TAGS = [
  { id: 'vegan', label: 'Веган' },
  { id: 'no_sugar', label: 'Без добавена захар' },
  { id: 'high_protein', label: 'Много протеин' },
]

export const PRICES = [
  { id: 'u10', label: 'до 10 €', test: (c) => c < 1000 },
  { id: '10-30', label: '10–30 €', test: (c) => c >= 1000 && c < 3000 },
  { id: '30-50', label: '30–50 €', test: (c) => c >= 3000 && c < 5000 },
  { id: 'o50', label: 'над 50 €', test: (c) => c >= 5000 },
]

/** Грамовете в опаковката, ако ги има в етикета на размера („2270 г · 66 дози“). */
export function grams(p) {
  if (p.net_g) return p.net_g
  const m = /^(\d+(?:[.,]\d+)?)\s*(кг|г|мл|л)(?![а-яa-z])/i.exec(p.size_label || '')
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return m[2] === 'кг' || m[2] === 'л' ? n * 1000 : n
}

/** Цената, по която се сравнява: на доза за добавките, на килограм за храната. */
export function unitPrice(p) {
  if (p.category === 'pantry') {
    const g = grams(p)
    return g ? `${euro(Math.round((p.price_cents * 1000) / g))} / ${/мл|л/.test(p.size_label) ? 'л' : 'кг'}` : null
  }
  if (!p.servings || p.servings <= 1) return null
  return `${euro(Math.round(p.price_cents / p.servings))} / ${p.serving_unit}`
}

/** Сравнимото число зад unitPrice — за подредбата и за „най-изгодно“. */
export function unitValue(p) {
  if (p.category === 'pantry') { const g = grams(p); return g ? p.price_cents / g : p.price_cents }
  return p.servings > 1 ? p.price_cents / p.servings : p.price_cents
}

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('bg-BG')

/** Четирите факта под името — само от данните, нищо измислено. */
export function factsFor(p) {
  const out = []
  const g = grams(p)
  // Храната показва макросите отделно, а грамажът и цената на кг са до цената.
  if (p.category === 'pantry') return out
  if (p.servings > 1) out.push({ v: String(p.servings), l: p.serving_unit === 'доза' ? 'дози в опаковката' : `${p.serving_unit} в опаковката` })
  if (g && p.servings > 1 && p.category !== 'vitamins' && !/капсул|таблет/.test(p.size_label)) out.push({ v: fmt(g / p.servings), l: 'г на доза' })
  if (unitPrice(p)) {
    const [v, l] = unitPrice(p).split(' / ')
    out.push({ v, l: `на ${l === 'доза' ? 'доза' : l}` })
  }
  if (p.flavors.length > 1) out.push({ v: String(p.flavors.length), l: 'вкуса' })
  if (g && !p.servings && !p.per100) out.push({ v: fmt(g), l: 'г' })
  return out.slice(0, 4)
}

/* Цветът на точките до „7 вкуса“ — по думата във вкуса, иначе неутрално. */
const FLAVOR_COLORS = [
  [/шоколад|какао|брауни|капучино|кафе/i, '#5B3A29'],
  [/ванил|бял|крем|бисквит/i, '#F1E3BE'],
  [/ягод|малин|череш|диня|червен/i, '#E5482F'],
  [/карамел|тофи|фъстък|лешник/i, '#C68B3E'],
  [/манго|портокал|кайси|праскова/i, '#F2A93B'],
  [/лимон|банан|ананас/i, '#F2D64B'],
  [/ябълк|лайм|киви|мента|зелен/i, '#8CC152'],
  [/боровин|грозде|касис|лилав/i, '#6A4C93'],
  [/кокос|натурал|без вкус/i, '#EDE9E0'],
]

export function flavorColor(name) {
  return (FLAVOR_COLORS.find(([re]) => re.test(name)) || [null, '#B9B6AA'])[1]
}

/* Пиктограмите на целите — начертани, не емоджи (feedback: без емоджи). */
const ICONS = {
  strength: <><path d="M6 9v6M18 9v6M3 10.5v3M21 10.5v3M6 12h12" /></>,
  recovery: <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></>,
  energy: <><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></>,
  health: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></>,
  mealprep: <><path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" /><path d="M9 7c0-1.5 1-1.5 1-3M14 7c0-1.5 1-1.5 1-3" /></>,
  truck: <><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  gift: <><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" /><path d="M12 7c-2-3-5-3-5-1s5 1 5 1 5 1 5-1-3-2-5 1z" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M3 10h18M7 14.5h4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
}

export function Icon({ name, size = 22, stroke = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
  )
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
