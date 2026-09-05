/* Часът, изваден от това, което човекът е написал.
 *
 * Полето за бърза задача и линията по часове бяха два несвързани начина да се
 * запише едно и също нещо: пишеш „тренировка", избираш ДНЕС, и задачата не
 * се появява никъде по часовете, защото час няма откъде да дойде.
 *
 * Вместо второ поле за час — думите, които човек и без това пише. „Тренировка
 * 18:00 1ч" е по-бързо от три докосвания и е това, което всеки пише в
 * бележките си така или иначе.
 *
 * Нарочно тесен обхват: час и продължителност, нищо друго. Разчитане на
 * „следващия вторник" изглежда умно, докато не сгреши веднъж — а сгреши ли,
 * задачата отива на ден, който никой не е избирал, и доверието свършва.
 */

/* Часът: 18:00, 18.30, 8:05, 18ч, 18 часа.
   Границата отпред е начало или интервал, за да не хване „3" от „3кг". */
const TIME_RE = /(^|\s)(\d{1,2})(?:[:.](\d{2}))?\s*(?:ч(?:аса?)?|h)?(?=\s|$)/gi

/* Продължителност: 1ч, 1.5ч, 90м, 90 мин, 45 минути. */
const DUR_RE = /(^|\s)(\d{1,3}(?:[.,]\d)?)\s*(ч(?:аса?)?|h|м(?:ин(?:ути)?)?|min|m)(?=\s|$)/i

/**
 * @returns {{ text, startTime: string|null, minutes: number|null }}
 *   `startTime` е "HH:MM:00" или null. `text` е написаното без разчетените
 *   части — задача, която се казва „Тренировка 18:00", е задача, чието име
 *   повтаря собствения си час.
 */
export function parseQuickTime(raw) {
  let text = String(raw || '')
  let startTime = null
  let minutes = null

  /* Продължителността се търси първа. Иначе „1ч" бива изядено от разчитането
     на час и „тренировка 18:00 1ч" получава начало в 1 часа. */
  const dm = text.match(DUR_RE)
  if (dm) {
    const value = parseFloat(String(dm[2]).replace(',', '.'))
    const isHours = /^(ч|h)/i.test(dm[3])
    const mins = Math.round(isHours ? value * 60 : value)
    if (mins >= 5 && mins <= 1440) {
      minutes = mins
      text = (text.slice(0, dm.index) + ' ' + text.slice(dm.index + dm[0].length))
    }
  }

  /* Часът: взима се последният, който изглежда като час от денонощието.
     Последният, защото „среща 2 с Иван 18:00" има две числа и часът е онова,
     което стои накрая. */
  let best = null
  for (const m of text.matchAll(TIME_RE)) {
    const h = Number(m[2])
    const min = m[3] == null ? 0 : Number(m[3])
    const hadColon = m[3] != null
    const hadSuffix = /ч|h/i.test(m[0])
    // Голо число без двоеточие и без „ч" не е час — то е количество.
    if (!hadColon && !hadSuffix) continue
    if (h > 23 || min > 59) continue
    best = { h, min, index: m.index + m[1].length, length: m[0].length - m[1].length }
  }
  if (best) {
    startTime = `${String(best.h).padStart(2, '0')}:${String(best.min).padStart(2, '0')}:00`
    text = text.slice(0, best.index) + ' ' + text.slice(best.index + best.length)
  }

  return { text: text.replace(/\s{2,}/g, ' ').trim(), startTime, minutes }
}
