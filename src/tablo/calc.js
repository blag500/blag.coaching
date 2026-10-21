/* Сметките на таблото. Чисти функции — без React и без мрежа, за да се
 * проверяват с една проба.
 *
 * „Обичайно" навсякъде е средното на предходните три седмици, не цялата
 * история: преди месец работата беше друга и числото от юли нищо не казва
 * за октомври. */

export const DAY = 24 * 60 * 60 * 1000

/* Денят по софийско време, като 'YYYY-MM-DD'. Числата в базата са записани
   така — денят на сървъра в UTC би сложил вечерната сесия в утрешния ден. */
export function sofiaDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(date)
}

export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* Последните n дни, най-старият първи, с днес накрая. */
export function lastDays(n, today = sofiaDay()) {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))
}

/* Тежестта на една работа с Claude: всеки вид токен по цената си спрямо
   обикновения вход. Прочетеното от кеша е десет пъти по-евтино, записаното
   в кеша (за час) — два пъти по-скъпо, изходът — пет пъти. Абсолютна цена не
   се показва: абонаментът не се плаща на токен, а пропорцията е това, което
   казва дали една сесия е била тежка. */
export const WEIGHTS = { input: 1, cache_read: 0.1, cache_write: 2, output: 5 }

export function weighted({ input = 0, cache_read = 0, cache_write = 0, output = 0 }) {
  return input * WEIGHTS.input + cache_read * WEIGHTS.cache_read +
    cache_write * WEIGHTS.cache_write + output * WEIGHTS.output
}

/* rows: [{ day, key, value }] → Map(key → Map(day → value)) */
export function indexDaily(rows) {
  const m = new Map()
  for (const r of rows ?? []) {
    if (!m.has(r.key)) m.set(r.key, new Map())
    m.get(r.key).set(r.day, Number(r.value) || 0)
  }
  return m
}

export function series(idx, key, days) {
  const s = idx.get(key)
  return days.map((d) => (s?.get(d) ?? 0))
}

export function weightedSeries(idx, days) {
  return days.map((d) => weighted({
    input: idx.get('tok.input')?.get(d) ?? 0,
    cache_read: idx.get('tok.cache_read')?.get(d) ?? 0,
    cache_write: idx.get('tok.cache_write')?.get(d) ?? 0,
    output: idx.get('tok.output')?.get(d) ?? 0,
  }))
}

/* [{day, n}] от tablo_business → стойност по ден. */
export function fromPairs(pairs, days, field = 'n') {
  const m = new Map((pairs ?? []).map((p) => [p.day, Number(p[field]) || 0]))
  return days.map((d) => m.get(d) ?? 0)
}

export const sum = (a) => a.reduce((s, v) => s + v, 0)

/* ── Светлините ─────────────────────────────────────────────────────────── */

export const LEVELS = {
  ok: { label: 'Наред' },
  watch: { label: 'Следи' },
  high: { label: 'Внимание' },
}

/* Праг „до" за наред и следи; над втория е внимание. Обратното (low) значи,
   че малкото е лошото — поръчки, работа. */
export function level(value, okUpTo, watchUpTo, { low = false } = {}) {
  if (value == null || Number.isNaN(value)) return 'watch'
  if (!low) return value <= okUpTo ? 'ok' : value <= watchUpTo ? 'watch' : 'high'
  return value >= okUpTo ? 'ok' : value >= watchUpTo ? 'watch' : 'high'
}

/* ── Формати ────────────────────────────────────────────────────────────── */

const nf = (max) => new Intl.NumberFormat('bg-BG', { maximumFractionDigits: max })

export function compact(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e9) return nf(1).format(v / 1e9) + ' млрд'
  if (a >= 1e6) return nf(1).format(v / 1e6) + ' млн'
  if (a >= 1e4) return nf(0).format(v / 1e3) + ' хил'
  return nf(0).format(v)
}

export function percent(v, digits = 0) {
  if (v == null || !Number.isFinite(v)) return '—'
  return nf(digits).format(v * 100) + ' %'
}

export function shortDate(day) {
  const d = new Date(`${day}T12:00:00Z`)
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

const DOW = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export function dowShort(day) {
  return DOW[new Date(`${day}T12:00:00Z`).getUTCDay()]
}

export function ago(iso, now = Date.now()) {
  if (!iso) return 'никога'
  const min = Math.round((now - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'току-що'
  if (min < 60) return `преди ${min} мин`
  const h = Math.round(min / 60)
  if (h < 24) return `преди ${h} ч`
  const d = Math.round(h / 24)
  return d === 1 ? 'вчера' : `преди ${d} дни`
}
