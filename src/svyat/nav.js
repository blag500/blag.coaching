/* Скокът до спирка. В 3D изгледа скролва елементът на ScrollControls; в лекия —
 * самата страница. Адресът (#magazin, #vhod, #kontakt) се обновява без скок.
 *
 * В 3D мястото се смята по номера на спирката, не по offsetTop: drei държи
 * секциите в отделен слой, който само следва скрола. Адресът при отваряне се
 * прибира в main.jsx, преди браузърът сам да скочи до котвата в този слой. */
export const STOPS = ['nachalo', 'magazin', 'vhod', 'kontakt']
let el = null
let start = ''
export const setScrollEl = (e) => { el = e }
export const setStart = (id) => { start = id }
/** Спирката от адреса при отваряне — веднъж. */
export const takeStart = () => { const s = start; start = ''; return s }

export function jumpTo(id, behavior = 'smooth') {
  const i = STOPS.indexOf(id)
  if (el && i >= 0) {
    // В 3D секцията може още да не е нарисувана — стига номерът ѝ.
    el.scrollTo({ top: (i / (STOPS.length - 1)) * (el.scrollHeight - el.clientHeight), behavior })
  } else {
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior })
  }
  history.replaceState(null, '', `#${id}`)
}
