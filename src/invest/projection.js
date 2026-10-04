/* Прогноза за buy and hold — чисти функции, без React.
 *
 * Сметката е седмица по седмица, не с формулата за анюитет: вноската влиза
 * в определен ден, таксата за обмяна се взима от всяка вноска поотделно, а
 * вноската може да расте веднъж годишно. Формулата не може да каже нищо от
 * това, а разликата за двайсет години не е малка.
 *
 * Ръстът е общ — с реинвестирани дивиденти. VUSA изплаща дивидентите, а не
 * ги реинвестира; прогнозата приема, че изплатеното се купува обратно. Без
 * това S&P 500 е с около два пункта по-бавен. */

export const DEFAULTS = {
  annual: 10,        // % годишно, номинално. S&P 500 от 1957 г.: ≈10,4 % (USD)
  spread: 3,         // ± пункта за песимистичния и оптимистичния сценарий
  inflation: 2,      // % годишно — целта на ЕЦБ
  contribution: 25,  // € на вноска
  frequency: 'week', // week | month
  growth: 0,         // % годишно ръст на самата вноска
  years: 20,
  ter: 0.07,         // % годишно — таксата на VUSA
  fx: 0.15,          // % от всяка вноска — обмяната в Trading 212 (EUR → GBP)
}

const PERIODS = { week: 52, month: 12 }

/** Една пътека: стойността в края на всяка година.
 *  start — сегашната стойност; p — настройките; annual — ръстът за пътеката. */
export function path(start, p, annual = p.annual) {
  const n = PERIODS[p.frequency] ?? 52
  // Таксата на фонда се взима от ръста, не от вноската.
  const net = (1 + annual / 100) * (1 - p.ter / 100) - 1
  const r = Math.pow(1 + net, 1 / n) - 1
  let value = start
  let paid = start
  let contribution = p.contribution
  const years = [{ year: 0, value, paid }]
  for (let y = 1; y <= p.years; y++) {
    for (let k = 0; k < n; k++) {
      value = value * (1 + r) + contribution * (1 - p.fx / 100)
      paid += contribution
    }
    years.push({ year: y, value, paid })
    contribution *= 1 + p.growth / 100
  }
  return years
}

/** Трите сценария и стойността в днешни пари. */
export function project(start, p) {
  const base = path(start, p, p.annual)
  const low = path(start, p, p.annual - p.spread)
  const high = path(start, p, p.annual + p.spread)
  const deflate = (v, y) => v / Math.pow(1 + p.inflation / 100, y)
  return base.map((b, i) => ({
    year: b.year,
    paid: b.paid,
    value: b.value,
    low: low[i].value,
    high: high[i].value,
    real: deflate(b.value, b.year),
  }))
}

/** Първата година, в която базовият сценарий минава прага. */
export function milestone(rows, target) {
  const hit = rows.find((r) => r.value >= target)
  return hit ? hit.year : null
}

/** Колко се влага годишно — за подписа под полето. */
export function perYear(p) {
  return p.contribution * (PERIODS[p.frequency] ?? 52)
}

/* ── Обратната задача: колко да внасям, за да стигна целта ──
 *
 * Стойността в края е линейна спрямо вноската: V(c) = V(0) + c · A, където
 * V(0) е само началото, оставено да расте, а A — колко прави една единица
 * вноска. Значи вноската не се търси с опити, а се смята точно:
 * c = (цел − V(0)) / A. */

/** Нужната вноска за цел `target` след `years` години при ръст `annual`.
 *  real: целта е в днешни пари и се вдига с инфлацията до годината си. */
export function requiredContribution(start, p, { target, years, real = false, annual = p.annual, frequency = p.frequency }) {
  if (years <= 0) return { contribution: null, reached: start >= target, nominalTarget: target }
  const q = { ...p, years, frequency }
  const nominalTarget = real ? target * Math.pow(1 + p.inflation / 100, years) : target
  const zero = path(start, { ...q, contribution: 0 }, annual).at(-1).value
  const unit = path(0, { ...q, contribution: 1 }, annual).at(-1).value
  if (zero >= nominalTarget) return { contribution: 0, reached: true, nominalTarget, fromStart: zero }
  return { contribution: (nominalTarget - zero) / unit, reached: false, nominalTarget, fromStart: zero }
}

/** Годината, в която сегашният план минава целта, или null. */
export function yearReached(start, p, target, real = false, horizon = 60) {
  const rows = path(start, { ...p, years: horizon })
  const hit = rows.find((r) => r.value >= (real ? target * Math.pow(1 + p.inflation / 100, r.year) : target))
  return hit ? hit.year : null
}

/** Закръгляне към вноска, която Trading 212 приема и човек помни:
 *  под 50 € — до цяло евро, над това — до 5 €. Винаги нагоре, за да не
 *  остане планът на сантиметър под целта. */
export function roundUp(c) {
  if (c == null) return null
  if (c <= 0) return 0
  return c < 50 ? Math.ceil(c) : Math.ceil(c / 5) * 5
}
