import { useMemo, useState } from 'react'
import { DEFAULTS, milestone, perYear, project } from '../projection'
import { useInvestSettings } from '../useInvestSettings'
import styles from './Projection.module.css'

/* Прогнозата за buy and hold: колко ще имам, ако продължа така.
 *
 * Настройките са общи с плана (useInvestSettings).
 *
 * Числото на хоризонта е един сценарий, не обещание. Затова до него винаги
 * стои обхватът и стойността в днешни пари — без тях двайсет години напред
 * изглеждат по-богати, отколкото ще бъдат. */

const TARGETS = [10000, 25000, 50000, 100000]
const W = 340
const H = 170
const PAD = { top: 10, right: 44, bottom: 20, left: 4 }

function money(v, opts = {}) {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0, ...opts,
  }).format(v)
}

function compact(v) {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol',
    notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

const num = (v, d = 1) => new Intl.NumberFormat('bg-BG', { maximumFractionDigits: d }).format(v)

export default function Projection({ start, startLabel }) {
  const [p, setP] = useInvestSettings()
  const [real, setReal] = useState(false)
  const [startValue, setStartValue] = useState(null) // null = от сметката

  const set = (k) => (e) => {
    const v = e.target.type === 'range' || e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setP((prev) => ({ ...prev, [k]: v }))
  }

  const from = startValue ?? start ?? 0
  const rows = useMemo(() => project(from, p), [from, p])

  // В днешни пари: всяка стойност се дели на инфлацията до своята година.
  const k = (y) => (real ? Math.pow(1 + p.inflation / 100, y) : 1)
  const view = rows.map((r) => ({
    ...r,
    value: r.value / k(r.year),
    low: r.low / k(r.year),
    high: r.high / k(r.year),
    paid: r.paid / k(r.year),
  }))
  const last = view[view.length - 1]
  const gain = last.value - last.paid
  const thisYear = new Date().getFullYear()

  const geo = useMemo(() => {
    const max = Math.max(...view.map((r) => r.high), 1)
    const x = (y) => PAD.left + (y / p.years) * (W - PAD.left - PAD.right)
    const yy = (v) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom)
    const line = (key) => view.map((r, i) => `${i ? 'L' : 'M'}${x(r.year)},${yy(r[key])}`).join(' ')
    const band = `${line('high')} ${[...view].reverse().map((r) => `L${x(r.year)},${yy(r.low)}`).join(' ')} Z`
    const ticks = [0.25, 0.5, 0.75, 1].map((f) => ({ v: max * f, y: yy(max * f) }))
    return { band, base: line('value'), paid: line('paid'), ticks, x }
  }, [view, p.years])

  const marks = [1, 5, 10, 15, 20, 25, 30, 40].filter((y) => y <= p.years)
  if (!marks.includes(p.years)) marks.push(p.years)

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>Прогноза · buy and hold</span>
        <span className={styles.label}>S&P 500 · VUSA</span>
      </div>

      <div className={styles.result}>
        <span className={styles.meta}>След {p.years} г. · {thisYear + p.years}</span>
        <strong className={styles.big}>{money(last.value)}</strong>
        <span className={styles.meta}>
          между {money(last.low)} и {money(last.high)}
          {!real && <> · в днешни пари {money(rows[rows.length - 1].real)}</>}
        </span>
      </div>

      <div className={styles.stats}>
        <div><span className={styles.meta}>Вложено</span><strong>{money(last.paid)}</strong></div>
        <div><span className={styles.meta}>Ръст</span><strong className={styles.up}>{money(gain)}</strong></div>
        <div><span className={styles.meta}>Ръстът от сумата</span><strong>{last.value > 0 ? `${num((gain / last.value) * 100, 0)} %` : '—'}</strong></div>
      </div>

      <div className={styles.toggle} role="tablist" aria-label="Пари">
        <button role="tab" aria-selected={!real} onClick={() => setReal(false)}>Номинално</button>
        <button role="tab" aria-selected={real} onClick={() => setReal(true)}>В днешни пари</button>
      </div>

      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Прогноза на стойността по години">
        {geo.ticks.map((t) => (
          <g key={t.v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} className={styles.grid} />
            <text x={W - PAD.right + 6} y={t.y + 3} className={styles.axis}>{compact(t.v)}</text>
          </g>
        ))}
        <path d={geo.band} className={styles.band} />
        <path d={geo.paid} className={styles.paid} />
        <path d={geo.base} className={styles.base} />
        <text x={PAD.left} y={H - 4} className={styles.axis}>{thisYear}</text>
        <text x={W - PAD.right} y={H - 4} className={styles.axis} textAnchor="end">{thisYear + p.years}</text>
      </svg>
      <p className={styles.legend}>
        <span className={styles.keyBase} /> {num(p.annual)} % годишно
        <span className={styles.keyBand} /> {num(p.annual - p.spread)}–{num(p.annual + p.spread)} %
        <span className={styles.keyPaid} /> вложено
      </p>

      <div className={styles.controls}>
        <Slider label="Годишен ръст" value={p.annual} min={0} max={15} step={0.5} suffix=" %" onChange={set('annual')}
          hint="S&P 500 от 1957 г.: ≈10,4 % номинално, ≈6,5 % след инфлацията (в долари)" />
        <Slider label="Вноска" value={p.contribution} min={5} max={500} step={5} suffix=" €" onChange={set('contribution')}
          hint={`${money(perYear(p))} годишно`} />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Честота</span>
          <div className={styles.toggle} role="tablist" aria-label="Честота">
            <button role="tab" aria-selected={p.frequency === 'week'} onClick={() => setP((x) => ({ ...x, frequency: 'week' }))}>Всеки понеделник</button>
            <button role="tab" aria-selected={p.frequency === 'month'} onClick={() => setP((x) => ({ ...x, frequency: 'month' }))}>Веднъж месечно</button>
          </div>
        </div>
        <Slider label="Години" value={p.years} min={1} max={40} step={1} suffix=" г." onChange={set('years')} />
        <Slider label="Вноската расте с" value={p.growth} min={0} max={10} step={0.5} suffix=" % год." onChange={set('growth')}
          hint={p.growth ? `след ${p.years} г.: ${money(p.contribution * Math.pow(1 + p.growth / 100, p.years - 1), { maximumFractionDigits: 2 })} на вноска` : 'същата вноска през цялото време'} />
        <Slider label="Инфлация" value={p.inflation} min={0} max={6} step={0.5} suffix=" %" onChange={set('inflation')} />

        <details className={styles.more}>
          <summary>Още настройки</summary>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Начало</span>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              value={Math.round(from * 100) / 100}
              onChange={(e) => setStartValue(e.target.value === '' ? 0 : Number(e.target.value))}
            />
            <span className={styles.meta}>
              {startValue == null ? startLabel : <button className={styles.link} onClick={() => setStartValue(null)}>Върни {startLabel}</button>}
            </span>
          </label>
          <Slider label="Сценарии ±" value={p.spread} min={0} max={6} step={0.5} suffix=" пункта" onChange={set('spread')} />
          <Slider label="Такса на фонда" value={p.ter} min={0} max={1} step={0.01} suffix=" %" onChange={set('ter')} hint="VUSA: 0,07 % годишно" />
          <Slider label="Обмяна на валута" value={p.fx} min={0} max={1} step={0.05} suffix=" % от вноска" onChange={set('fx')} hint="Trading 212: 0,15 % (EUR → GBP)" />
          <button className={styles.link} onClick={() => { setP((x) => ({ ...x, ...DEFAULTS })); setStartValue(null) }}>Върни подразбиращите се</button>
        </details>
      </div>

      <div className={styles.milestones}>
        {TARGETS.map((t) => {
          const y = milestone(rows.map((r) => ({ ...r, value: r.value / k(r.year) })), t)
          return (
            <span key={t} className={styles.chip}>
              <b>{compact(t)}</b>
              <span>{y == null ? `не в ${p.years} г.` : y === 0 ? 'вече' : `след ${y} г. · ${thisYear + y}`}</span>
            </span>
          )
        })}
      </div>

      <table className={styles.table}>
        <thead>
          <tr><th>Година</th><th>Вложено</th><th>Стойност</th><th>Обхват</th></tr>
        </thead>
        <tbody>
          {marks.map((y) => {
            const r = view[y]
            return (
              <tr key={y}>
                <td>{thisYear + y}<span className={styles.meta}> · {y} г.</span></td>
                <td>{money(r.paid)}</td>
                <td><b>{money(r.value)}</b></td>
                <td className={styles.meta}>{compact(r.low)}–{compact(r.high)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className={styles.note}>
        Сметката е седмица по седмица, с реинвестирани дивиденти, таксата на фонда и
        обмяната от всяка вноска. Миналият ръст не е обещание: S&P 500 е имал
        десетилетия с нула и години с −40 %.
      </p>
    </section>
  )
}

function Slider({ label, value, min, max, step, suffix, onChange, hint }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{label}</span>
        <b className={styles.fieldValue}>{num(value, 2)}{suffix}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className={styles.range} aria-label={label} />
      {hint && <span className={styles.meta}>{hint}</span>}
    </label>
  )
}
