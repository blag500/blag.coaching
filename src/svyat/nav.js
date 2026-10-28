/* Скокът до спирка. В 3D изгледа скролва елементът на ScrollControls; в лекия —
 * самата страница. Адресът (#magazin, #vhod, #kontakt) се обновява без скок.
 *
 * В 3D мястото се смята по номера на спирката, не по offsetTop: drei държи
 * секциите в отделен слой, който само следва скрола. Адресът при отваряне се
 * прибира в main.jsx, преди браузърът сам да скочи до котвата в този слой. */
export const STOPS = ['nachalo', 'zala', 'magazin', 'vhod', 'kontakt']
let el = null
let start = ''
export const setScrollEl = (e) => { el = e }
export const setStart = (id) => { start = id }
/** Спирката от адреса при отваряне — веднъж. */
export const takeStart = () => { const s = start; start = ''; return s }

/** Смяна на #адреса без презареждане: браузърът вече е скочил до котвата в
 *  слоя с текста — връщаме слоя и движим скрола (камерата) до спирката. */
export function onHashChange() {
  const id = window.location.hash.slice(1)
  if (!id || !el) return
  const target = document.getElementById(id)
  for (let p = target?.parentElement; p; p = p.parentElement) if (p !== el && p.scrollTop) p.scrollTop = 0
  jumpTo(id)
}

export function jumpTo(id, behavior = 'smooth') {
  const i = STOPS.indexOf(id)
  if (el && i >= 0) {
    // В 3D секцията може още да не е нарисувана — стига номерът ѝ.
    el.scrollTo({ top: (i / (STOPS.length - 1)) * (el.scrollHeight - el.clientHeight), behavior })
    // drei чете скрола от събитието; ако скокът е станал, преди да слуша —
    // казваме му пак, иначе камерата и текстът остават в началото.
    const ping = () => el?.dispatchEvent(new Event('scroll'))
    requestAnimationFrame(ping)
    setTimeout(ping, 300)
  } else {
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior })
  }
  history.replaceState(null, '', `#${id}`)
}
