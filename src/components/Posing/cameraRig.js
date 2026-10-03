/**
 * Обективът и ръчните настройки на камерата.
 *
 * iPhone дава на браузъра всеки обектив като отделно устройство — 1×, 0.5×,
 * теле — плюс „виртуални“ (двойна, тройна), които сами прескачат между
 * обективите според разстоянието. По подразбиране браузърът взима виртуалната
 * и тя на метър-два от тялото често минава на широкоъгълния: кадърът се
 * изкривява и сравнението между дати лъже. Затова обективът се избира и се
 * помни.
 *
 * Ръчните настройки са колкото телефонът позволи на браузъра — не колкото
 * има приложение като Blackmagic Camera. Показва се само това, което
 * `getCapabilities()` наистина връща; на iPhone днес това е най-често само
 * увеличението, на Android — и експозиция, бяло, фокус и фенерче.
 */

/* Етикетите идват на езика на телефона — затова и английски, и български. */
const LENS_RULES = [
  [/ultra|свръх/i, '0.5×'],
  [/tele/i, 'Теле'],
  [/dual|triple|двойн|тройн/i, 'Авто'],
  [/front|предн/i, 'Предна'],
  [/back|rear|задн/i, '1×'],
]

export function lensName(label, i) {
  for (const [re, name] of LENS_RULES) if (re.test(label ?? '')) return name
  return label ? label.replace(/\s*\(.*\)$/, '') : `#${i + 1}`
}

/**
 * Плъзгачите. `mode` е превключвателят, без който стойността се пренебрегва:
 * бялото и фокусът слушат ръчната стойност само в ръчен режим.
 */
export const KNOBS = [
  { id: 'zoom', fmt: v => `${v.toFixed(1)}×` },
  { id: 'exposureCompensation', fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(1)} EV` },
  { id: 'colorTemperature', mode: 'whiteBalanceMode', fmt: v => `${Math.round(v)} K` },
  { id: 'focusDistance', mode: 'focusMode', fmt: v => v.toFixed(2) },
]

export function knobsFor(caps) {
  return KNOBS.filter(k => {
    const c = caps?.[k.id]
    if (!c || !(c.max > c.min)) return false
    return !k.mode || (caps[k.mode] ?? []).includes('manual')
  })
}

/** Стойност → ограничение. `null` връща ръчния режим обратно на автоматика. */
export function constraintFor(knob, value) {
  if (value == null) return knob.mode ? { [knob.mode]: 'continuous' } : null
  return knob.mode ? { [knob.mode]: 'manual', [knob.id]: value } : { [knob.id]: value }
}

/* Изборът се помни на този телефон — следващата сесия е в същия кадър. */
const KEY = 'blag_posecam'

export function loadRig() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') ?? {} } catch { return {} }
}

export function saveRig(rig) {
  try { localStorage.setItem(KEY, JSON.stringify(rig)) } catch { /* без памет */ }
}
