/* Кога пристига поръчката — като дата, не като „1–2 работни дни“
   (проучването: хората не превеждат срок в ден).
   Правилото: поръчка до 15:00 в делничен ден тръгва същия ден, иначе на
   следващия делничен. Куриерът носи на следващия делничен ден след тръгването;
   личната доставка в София и взимането на място са в деня на тръгването,
   след 18:00. Празниците не се броят — това е обещание „най-рано“. */

const CUTOFF_HOUR = 15

function sofiaNow(now = new Date()) {
  // Часът и денят по София, независимо от часовата зона на телефона.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(now).map((p) => [p.type, p.value]))
  return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)), hour: +parts.hour % 24 }
}

const isWeekday = (d) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5
const plusDays = (d, n) => new Date(d.getTime() + n * 864e5)
function nextWeekday(d) {
  let x = plusDays(d, 1)
  while (!isWeekday(x)) x = plusDays(x, 1)
  return x
}

export function shipDay(now = new Date()) {
  const { date, hour } = sofiaNow(now)
  return isWeekday(date) && hour < CUTOFF_HOUR ? date : nextWeekday(date)
}

/** Денят, в който пристига, за даден начин на доставка (`needs` от shop_delivery). */
export function arrivalDay(needs, now = new Date()) {
  const ship = shipDay(now)
  return needs === 'office' || needs === 'address' ? nextWeekday(ship) : ship
}

export function dayLabel(d, now = new Date()) {
  const today = sofiaNow(now).date
  const diff = Math.round((d - today) / 864e5)
  if (diff === 0) return 'днес'
  if (diff === 1) return 'утре'
  return d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** Едно изречение за доставката: „пристига утре“, „пристига четвъртък, 23 октомври“. */
export function arrivalText(needs, now = new Date()) {
  const label = dayLabel(arrivalDay(needs, now), now)
  if (needs === 'none') return `готово за взимане ${label} след 18:00`
  if (needs === 'sofia') return `до вратата ${label} вечерта`
  return `пристига ${label}`
}

/** До кога трябва да се поръча, за да тръгне днес — или null, ако днес не тръгва. */
export function cutoffNote(now = new Date()) {
  const { date, hour } = sofiaNow(now)
  if (!isWeekday(date) || hour >= CUTOFF_HOUR) return null
  return `Поръчай до ${CUTOFF_HOUR}:00 — тръгва днес`
}
