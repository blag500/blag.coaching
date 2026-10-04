import { useMemo } from 'react'
import { path, requiredContribution, roundUp, yearReached } from '../projection'
import { useInvestSettings } from '../useInvestSettings'
import styles from './Plan.module.css'

/* Планът: обратната задача на прогнозата.
 *
 * Прогнозата казва „ако внасям толкова, ще имам толкова". Тук се въвежда
 * целта — сума и година — и се връща действието: колко да е автоматичната
 * покупка и колко често. После контролните точки: къде трябва да е сметката
 * всяка година, за да се знае навреме, че планът изостава.
 *
 * Допусканията (ръст, инфлация, такси) са общите от прогнозата — един ръст
 * за двата въпроса. */

const PER = { week: 52, month: 12 }

function money(v, digits = 0) {
  if (v == null || !Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(v)
}

const num = (v, d = 1) => new Intl.NumberFormat('bg-BG', { maximumFractionDigits: d }).format(v)
const every = (f) => (f === 'week' ? 'всеки понеделник' : 'веднъж месечно')
const per = (f) => (f === 'week' ? 'седмично' : 'месечно')

export default function Plan({ start }) {
  const [p, setP] = useInvestSettings()
  const now = new Date().getFullYear()
  const years = Math.max(1, p.targetYear - now)
  /* Честотата на плана е своя: сегашната вноска (25 € всеки понеделник)
     е факт от прогнозата и не се сменя, докато се пробва „а месечно?". */
  const freq = p.planFrequency ?? 'week'

  const plan = useMemo(() => {
    const goal = { target: p.target, years, real: p.targetReal }
    const week = requiredContribution(start, p, { ...goal, frequency: 'week' })
    const month = requiredContribution(start, p, { ...goal, frequency: 'month' })
    const low = requiredContribution(start, p, { ...goal, frequency: freq, annual: p.annual - p.spread })
    const high = requiredContribution(start, p, { ...goal, frequency: freq, annual: p.annual + p.spread })
    const current = yearReached(start, p, p.target, p.targetReal)
    return { week, month, low, high, current }
  }, [start, p, years, freq])

  const chosen = freq === 'week' ? plan.week : plan.month
  const need = roundUp(chosen.contribution)
  // Сегашната вноска в единиците на плана: 25 € седмично са 108,33 € месечно.
  const currentPer = (p.contribution * PER[p.frequency]) / PER[freq]
  const diff = need != null ? need - currentPer : null
  const reachedAlready = chosen.reached

  // Контролните точки — по пътя на закръглената вноска, не на точната:
  // това е вноската, която ще стои в Trading 212.
  const checkpoints = useMemo(() => {
    if (need == null) return []
    const q = { ...p, years, contribution: need, frequency: freq }
    const rows = path(start, q)
    const low = path(start, q, p.annual - p.spread)
    const marks = [...new Set([1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40].filter((y) => y < years).concat(years))]
    return marks.map((y) => ({ year: now + y, paid: rows[y].paid, value: rows[y].value, floor: low[y].value }))
  }, [need, start, p, years, now, freq])

  const setNum = (k) => (e) => setP((x) => ({ ...x, [k]: Number(e.target.value) }))

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.head}>
          <span className={styles.label}>Целта</span>
          <span className={styles.label}>от {money(start)} във VUSA</span>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Искам да имам</span>
          <div className={styles.amount}>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              className={styles.input}
              value={p.target}
              onChange={setNum('target')}
              aria-label="Целева сума в евро"
            />
            <span className={styles.unit}>€</span>
          </div>
          <div className={styles.presets}>
            {[25000, 50000, 100000, 250000].map((v) => (
              <button
                key={v}
                className={styles.preset}
                aria-pressed={p.target === v}
                onClick={() => setP((x) => ({ ...x, target: v }))}
              >{num(v / 1000, 0)} хил.</button>
            ))}
          </div>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldRow}>
            <span className={styles.fieldLabel}>През</span>
            <b className={styles.fieldValue}>{p.targetYear} · след {years} г.</b>
          </span>
          <input
            type="range"
            min={now + 1}
            max={now + 40}
            step="1"
            value={p.targetYear}
            onChange={setNum('targetYear')}
            className={styles.range}
            aria-label="Година"
          />
        </label>

        <div className={styles.toggle} role="tablist" aria-label="Сумата е">
          <button role="tab" aria-selected={!p.targetReal} onClick={() => setP((x) => ({ ...x, targetReal: false }))}>В евро тогава</button>
          <button role="tab" aria-selected={p.targetReal} onClick={() => setP((x) => ({ ...x, targetReal: true }))}>В днешни пари</button>
        </div>
        {p.targetReal && (
          <p className={styles.meta}>
            {money(p.target)} днес са {money(chosen.nominalTarget)} през {p.targetYear} при {num(p.inflation)} % инфлация.
          </p>
        )}

        <div className={styles.toggle} role="tablist" aria-label="Колко често">
          <button role="tab" aria-selected={freq === 'week'} onClick={() => setP((x) => ({ ...x, planFrequency: 'week' }))}>Всеки понеделник</button>
          <button role="tab" aria-selected={freq === 'month'} onClick={() => setP((x) => ({ ...x, planFrequency: 'month' }))}>Веднъж месечно</button>
        </div>
      </section>

      <section className={`${styles.card} ${styles.answer}`}>
        <span className={styles.label}>Какво да правиш</span>
        {reachedAlready ? (
          <>
            <strong className={styles.big}>Нищо ново</strong>
            <p className={styles.lead}>
              Сегашните {money(start)} стигат сами до {money(chosen.fromStart)} през {p.targetYear} при {num(p.annual)} % годишно.
            </p>
          </>
        ) : (
          <>
            <strong className={styles.big}>{money(need)} <span>{every(freq)}</span></strong>
            <p className={styles.meta}>
              точно {money(chosen.contribution, 2)} · {money(need * PER[freq])} годишно
              {freq === 'week'
                ? <> · или {money(roundUp(plan.month.contribution))} веднъж месечно</>
                : <> · или {money(roundUp(plan.week.contribution))} всеки понеделник</>}
            </p>

            <div className={styles.compare}>
              <div>
                <span className={styles.meta}>Сега, {per(freq)}</span>
                <b>{money(currentPer, currentPer % 1 ? 2 : 0)}</b>
              </div>
              <div>
                <span className={styles.meta}>Разлика</span>
                <b className={diff > 0 ? styles.more : diff < 0 ? styles.less : ''}>
                  {Math.abs(diff) < 0.5 ? 'същото' : `${diff > 0 ? '+' : '−'}${money(Math.abs(diff), Math.abs(diff) % 1 ? 2 : 0)}`}
                </b>
              </div>
              <div>
                <span className={styles.meta}>Сегашното стига</span>
                <b>{plan.current == null ? 'след 60+ г.' : `${now + plan.current}`}</b>
              </div>
            </div>
          </>
        )}

        <div className={styles.range3}>
          <span className={styles.meta}>Ако пазарът дава</span>
          <div>
            <span><b>{num(p.annual - p.spread)} %</b> → {money(roundUp(plan.low.contribution))}</span>
            <span><b>{num(p.annual)} %</b> → {money(need)}</span>
            <span><b>{num(p.annual + p.spread)} %</b> → {money(roundUp(plan.high.contribution))}</span>
          </div>
          <span className={styles.meta}>{per(freq)} — при по-бавен пазар трябва повече</span>
        </div>
      </section>

      {!reachedAlready && (
        <section className={styles.card}>
          <span className={styles.label}>Стъпки</span>
          <ol className={styles.steps}>
            <li>
              <b>{Math.abs(diff) < 0.5 ? 'Остави' : 'Смени'} автоматичната покупка на VUSA на {money(need)} {every(freq)}.</b>
              <span className={styles.meta}>Trading 212 → VUSA → Recurring investment. {diff > 0 ? `Сега е ${money(p.contribution)} ${every(p.frequency)}.` : diff < 0 ? `Сега е ${money(p.contribution)} ${every(p.frequency)} — стига и по-малко.` : 'Сегашната стига.'}</span>
            </li>
            {p.growth > 0 && (
              <li>
                <b>Всеки януари вдигай вноската с {num(p.growth)} %.</b>
                <span className={styles.meta}>
                  {[1, 2, 3].map((y) => `${now + y}: ${money(need * Math.pow(1 + p.growth / 100, y), 0)}`).join(' · ')}
                </span>
              </li>
            )}
            <li>
              <b>Дивидентите купувай обратно.</b>
              <span className={styles.meta}>VUSA ги изплаща като кеш; планът брои, че се реинвестират. Иначе VUAA (същият фонд) го прави сам.</span>
            </li>
            <li>
              <b>Веднъж годишно сравни сметката с контролната точка.</b>
              <span className={styles.meta}>Под долната граница две години подред значи, че вноската трябва да се вдигне — таблото тук ще покаже с колко.</span>
            </li>
          </ol>
        </section>
      )}

      {checkpoints.length > 0 && (
        <section className={styles.card}>
          <div className={styles.head}>
            <span className={styles.label}>Контролни точки</span>
            <span className={styles.label}>при {money(need)} {per(freq)}</span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr><th>Година</th><th>Вложено</th><th>По план</th><th>Долна граница</th></tr>
            </thead>
            <tbody>
              {checkpoints.map((c) => (
                <tr key={c.year}>
                  <td>{c.year}</td>
                  <td>{money(c.paid)}</td>
                  <td><b>{money(c.value)}</b></td>
                  <td className={styles.meta}>{money(c.floor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.meta}>
            Долната граница е при {num(p.annual - p.spread)} % годишно. Допусканията — ръст, инфлация, такси — се
            сменят в „Прогноза".
          </p>
        </section>
      )}
    </div>
  )
}
