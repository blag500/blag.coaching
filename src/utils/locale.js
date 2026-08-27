/**
 * Кой Intl локал ползва приложението в момента.
 *
 * Датите, часовете и груповите разделители на числата не минават през t() —
 * форматира ги Intl, а Intl иска локал, не превод. Досега на трийсет места
 * стоеше закован 'bg-BG', тоест английската версия показваше „15 август
 * 2026" и „2 500" вместо „15 Aug 2026" и „2,500".
 *
 * Огледало на модулно ниво, а не проп през трийсет компонента: езикът се
 * сменя от един бутон в Профил, а към форматирането се обръщат и функции
 * извън React (utils/training.js), които нямат откъде да го получат.
 *
 * Записва се при рендер на SettingsProvider, преди децата да се нарисуват —
 * в useEffect би останало едно рисуване със стария локал след смяната.
 */
let current = 'bg-BG'

/** Извиква се само от SettingsProvider. */
export function syncLocale(lang) {
  current = lang === 'en' ? 'en-GB' : 'bg-BG'
}

/** Локалът за Intl: дати, часове, числа. */
export function loc() {
  return current
}

/**
 * Имената на месеците и дните, вместо заковани масиви.
 *
 * Календарите държаха собствени списъци с „яну, фев, мар" — Intl ги знае и
 * на двата езика, а списък, който трябва да се допише при всеки нов език, е
 * списък, който някой ще забрави.
 */
export function monthNames(style = 'short') {
  const fmt = new Intl.DateTimeFormat(current, { month: style })
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2021, m, 1)))
}

/** Дните от седмицата, започвайки от понеделник. */
export function dayNames(style = 'short') {
  const fmt = new Intl.DateTimeFormat(current, { weekday: style })
  // 2021-02-01 е понеделник.
  return Array.from({ length: 7 }, (_, d) => fmt.format(new Date(2021, 1, 1 + d)))
}
