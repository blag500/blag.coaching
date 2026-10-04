/* Сметките на таблото — чисти функции, без React и без база.
 *
 * Trading 212 дава стойността на сметката, но не и колко пари са влезли в нея.
 * „Печалбата" тук е стойността минус внесеното нето — единственото число,
 * което отговаря на въпроса „колко съм спечелил", включително дивидентите,
 * лихвата върху кеша и вече продаденото. */

/** Внесеното нето: депозитите минус тегленията. Таксите не са внасяне, а
 *  лихвата върху кеша (INTEREST_ON_FREE_CASH) е доход — и двете дават 0.
 *  Тегленията включват и плащанията с картата на Trading 212. */
export function netFlow(t) {
  const a = Math.abs(Number(t.amount) || 0)
  if (t.type === 'DEPOSIT') return a
  if (t.type === 'WITHDRAW') return -a
  if (t.type === 'TRANSFER') return Number(t.amount) || 0
  return 0
}

export function netDeposits(transactions, until = Infinity) {
  let sum = 0
  for (const t of transactions) {
    if (new Date(t.at).getTime() <= until) sum += netFlow(t)
  }
  return sum
}

/** Внесеното нето като стъпала във времето — за втората линия на графиката. */
export function depositSteps(transactions) {
  const sorted = [...transactions]
    .filter((t) => netFlow(t) !== 0)
    .sort((a, b) => new Date(a.at) - new Date(b.at))
  let sum = 0
  return sorted.map((t) => {
    sum += netFlow(t)
    return { t: new Date(t.at).getTime(), v: sum }
  })
}

/** Стойността на стъпалата в даден миг. */
export function stepAt(steps, time) {
  let v = 0
  for (const s of steps) {
    if (s.t > time) break
    v = s.v
  }
  return v
}

/** Полунощ в София, като миг — „днес" е софийският ден, не този на сървъра. */
export function sofiaMidnight(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(now)
  // Отместването на София в този ден: +2 зимата, +3 лятото.
  const probe = new Date(`${day}T12:00:00Z`)
  const local = new Date(probe.toLocaleString('en-US', { timeZone: 'Europe/Sofia' }))
  const offsetMs = local.getTime() - probe.getTime()
  return new Date(`${day}T00:00:00Z`).getTime() - offsetMs
}

/** Промяната за период, без парите, внесени междувременно.
 *  base е снимката преди началото на периода. */
export function changeSince(latest, base, transactions) {
  if (!latest || !base) return null
  const from = new Date(base.taken_at).getTime()
  const to = new Date(latest.taken_at).getTime()
  let flows = 0
  for (const t of transactions) {
    const at = new Date(t.at).getTime()
    if (at > from && at <= to) flows += netFlow(t)
  }
  const abs = latest.total_value - base.total_value - flows
  const pct = base.total_value > 0 ? abs / base.total_value : null
  return { abs, pct }
}

/** Делът на всяка позиция; след първите `top` — „Други". */
export function allocation(positions, top = 6) {
  const total = positions.reduce((s, p) => s + (p.value || 0), 0)
  if (total <= 0) return []
  const sorted = [...positions].sort((a, b) => b.value - a.value)
  const head = sorted.slice(0, top).map((p) => ({
    key: p.ticker, label: shortName(p), value: p.value, share: p.value / total,
  }))
  const rest = sorted.slice(top).reduce((s, p) => s + p.value, 0)
  if (rest > 0) head.push({ key: '_rest', label: 'Други', value: rest, share: rest / total })
  return head
}

/** По валутата на ценната книга — колко от портфейла зависи от курса. */
export function byCurrency(positions) {
  const total = positions.reduce((s, p) => s + (p.value || 0), 0)
  if (total <= 0) return []
  const m = new Map()
  for (const p of positions) {
    const c = p.currency || '—'
    m.set(c, (m.get(c) || 0) + p.value)
  }
  return [...m.entries()]
    .map(([key, value]) => ({ key, label: key, value, share: value / total }))
    .sort((a, b) => b.value - a.value)
}

/** Дивидентите по месеци, последните `months`, включително текущия. */
export function dividendsByMonth(dividends, months = 12, now = new Date()) {
  const keyOf = (d) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit',
  }).format(d)
  const out = []
  const y = now.getFullYear()
  const m = now.getMonth()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 15))
    out.push({ key: keyOf(d), date: d, value: 0 })
  }
  const idx = new Map(out.map((o, i) => [o.key, i]))
  for (const d of dividends) {
    const i = idx.get(keyOf(new Date(d.paid_on)))
    if (i != null) out[i].value += Number(d.amount) || 0
  }
  return out
}

/** Името без „Inc.", „Corp." и подобните — редът е тесен на телефон. */
export function shortName(p) {
  const name = p.name || p.ticker || ''
  return name
    .replace(/\s*\b(Inc|Corp|Corporation|Ltd|PLC|plc|N\.V|S\.A|AG|SE|Co|Holdings?|Group|Class [A-C])\b\.?,?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || p.ticker
}

/** Тикерът без опашката на Trading 212: AAPL_US_EQ → AAPL, VUSAl_EQ → VUSA
 *  (малката буква е борсата: l Лондон, d Франкфурт). */
export function shortTicker(t) {
  return (t || '').replace(/_[A-Z]{2}_EQ$/, '').replace(/[a-z]?_EQ$/, '')
}
