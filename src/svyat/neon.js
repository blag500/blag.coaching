/* Времевата линия на неона — една за сцената и за звука.
 * Часовникът е performance.now() в секунди. Паленето следва видеото
 * (D:\blag-ai\metro-city\neon\anim_render.py): знакът с три опита, после
 * часовете, после името; докосване → кратко примигване. */

export const neon = { start: null, flick: -10 }
const listeners = new Set()

export const now = () => performance.now() / 1000
const w = (t, a, b) => (t >= a && t < b ? 1 : 0)

/** Колко свети табелата `sign` (0…1) t секунди след паленето. */
export function level(sign, t) {
  if (t < 0) return 0
  if (sign === 'mark') return Math.min(1, w(t, 0, 0.06) + w(t, 0.15, 0.19) + 0.5 * w(t, 0.3, 0.36) + (t >= 0.5 ? 1 : 0))
  if (sign === 'hours') return Math.min(1, w(t, 1.4, 1.46) + w(t, 1.53, 1.56) + (t >= 1.7 ? 1 : 0))
  return Math.min(1, w(t, 2.2, 2.25) + w(t, 2.32, 2.35) + (t >= 2.45 ? 1 : 0))
}

const FLICK = [1, 0, 1, 0.3, 1, 0, 1]
/** Множител при докосване или изпратено писмо: кратко угасване и светване. */
export function flickFactor(at) {
  const d = at - neon.flick
  if (d < 0 || d >= FLICK.length * 0.12) return 1
  return FLICK[Math.floor(d / 0.12)]
}

export function ignite() {
  if (neon.start != null) return
  neon.start = now()
  listeners.forEach((f) => f('ignite'))
}

export function flick() {
  neon.flick = now()
  listeners.forEach((f) => f('flick'))
}

export function onNeon(f) {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** Средно колко свети всичко — за силата на бръмченето. */
export function glow(at = now()) {
  const t = neon.start == null ? -1 : at - neon.start
  const f = flickFactor(at)
  return ((level('mark', t) + level('hours', t) + level('name', t)) / 3) * f
}
