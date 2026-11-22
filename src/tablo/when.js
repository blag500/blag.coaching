/* Час за напомняне от изречение на български.
 *
 * „утре в 9 обади се на Флайс“ → { at: утре 09:00, text: „обади се на Флайс“ }.
 * Разбира: днес, довечера, утре, вдругиден, дните от седмицата, „на 25.11“,
 * „на 25 ноември“, „в 9“, „в 9:30“, „в 18ч“, „в 7 вечерта“, „сутринта“,
 * „по обяд“, „след 2 часа“, „след 30 мин“, „след час“, „след 3 дни“,
 * „след седмица“. Само дата → 9:00; само час → днес, а ако е минал — утре.
 * Нищо разпознато → at е null и текстът не се пипа. */

const DAYS = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота']
const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']
const B = '(?<![\\p{L}\\d])'          // начало на дума
const E = '(?![\\p{L}\\d])'           // край на дума

function cut(state, re, fn) {
  const m = state.text.match(new RegExp(re, 'iu'))
  if (!m) return false
  fn(m)
  state.text = (state.text.slice(0, m.index) + ' ' + state.text.slice(m.index + m[0].length))
  return true
}

export function parseWhen(input, now = new Date()) {
  const s = { text: ` ${input} ` }
  let day = null            // Date в 00:00
  let hm = null             // [h, m]
  let rel = null            // милисекунди от сега
  let pm = false
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const plus = (n) => { const d = new Date(start); d.setDate(d.getDate() + n); return d }

  // след …
  cut(s, `${B}след\\s+(\\d+|час|седмица|ден|половин час)\\s*(минути|минута|мин|часа|час|ч|дни|дена|ден|седмици|седмица)?${E}`, (m) => {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1
    const unit = (m[2] || m[1]).toLowerCase()
    if (m[1] === 'половин час') rel = 30 * 60e3
    else if (unit.startsWith('мин')) rel = n * 60e3
    else if (unit.startsWith('ч')) rel = n * 3600e3
    else if (unit.startsWith('седм')) day = plus(7 * n)
    else if (unit.startsWith('д')) day = plus(n)
  })

  cut(s, `${B}вдругиден${E}`, () => { day = plus(2) })
  cut(s, `${B}утре${E}`, () => { day = plus(1) })
  cut(s, `${B}довечера${E}`, () => { day = day || plus(0); hm = hm || [20, 0] })
  cut(s, `${B}днес${E}`, () => { day = plus(0) })

  cut(s, `${B}(?:в|във|на)?\\s*(${DAYS.join('|')})${E}`, (m) => {
    const want = DAYS.indexOf(m[1].toLowerCase())
    let k = (want - now.getDay() + 7) % 7
    if (k === 0) k = 7
    day = plus(k)
  })

  cut(s, `${B}на\\s+(\\d{1,2})[.\\/](\\d{1,2})(?:[.\\/](\\d{2,4}))?${E}`, (m) => {
    day = new Date(m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : now.getFullYear(), Number(m[2]) - 1, Number(m[1]))
    if (!m[3] && day < start) day.setFullYear(day.getFullYear() + 1)
  })
  cut(s, `${B}на\\s+(\\d{1,2})\\s+(${MONTHS.join('|')})${E}`, (m) => {
    day = new Date(now.getFullYear(), MONTHS.indexOf(m[2].toLowerCase()), Number(m[1]))
    if (day < start) day.setFullYear(day.getFullYear() + 1)
  })

  cut(s, `${B}(?:в|към|около)\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:ч\\.?|часа)?(?:\\s+(сутринта|вечерта|следобед|през нощта))?${E}`, (m) => {
    let h = Number(m[1]); const mi = Number(m[2] || 0)
    if (h > 23 || mi > 59) return
    if (m[3] && /вечерта|следобед/i.test(m[3]) && h < 12) h += 12
    hm = [h, mi]; pm = !m[3]
  })
  cut(s, `${B}по\\s+обяд${E}`, () => { hm = [12, 0] })
  cut(s, `${B}сутринта${E}`, () => { hm = hm || [9, 0] })
  cut(s, `${B}вечерта${E}`, () => { hm = hm || [20, 0] })

  let at = null
  if (rel != null) at = new Date(now.getTime() + rel)
  else if (day || hm) {
    at = new Date(day || start)
    const [h, mi] = hm || [9, 0]
    at.setHours(h, mi, 0, 0)
    // само час, вече минал → утре; „в 7“ без сутрин/вечер, ако 7:00 е минало, а 19:00 не — 19:00
    if (!day && at <= now) {
      if (pm && h < 12 && new Date(at.getTime() + 12 * 3600e3) > now) at.setHours(h + 12)
      else at.setDate(at.getDate() + 1)
    }
  }
  const text = s.text.replace(/\s+/g, ' ').replace(/^[\s,–-]+|[\s,–-]+$/g, '').trim()
  return { at, text: at ? (text || input.trim()) : input.trim() }
}

/* „днес 18:30“, „утре 09:00“, „пт 28.11 09:00“ */
export function whenLabel(at, now = new Date()) {
  const d = new Date(at)
  const t = d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
  const a = new Date(now); a.setHours(0, 0, 0, 0)
  const b = new Date(d); b.setHours(0, 0, 0, 0)
  const k = Math.round((b - a) / 864e5)
  if (k === 0) return `днес ${t}`
  if (k === 1) return `утре ${t}`
  if (k === -1) return `вчера ${t}`
  const wd = d.toLocaleDateString('bg-BG', { weekday: 'short' })
  return `${wd} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${t}`
}

/* Бързите избори: довечера 20:00, утре 9:00, след седмица 9:00, след 1 час. */
export function quick(id, now = new Date()) {
  const d = new Date(now)
  if (id === 'hour') return new Date(now.getTime() + 3600e3)
  if (id === 'tonight') { d.setHours(20, 0, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return d }
  d.setHours(9, 0, 0, 0)
  d.setDate(d.getDate() + (id === 'week' ? 7 : 1))
  return d
}
